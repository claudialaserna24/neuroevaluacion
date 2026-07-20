## Diagnóstico

Al entrar `holguinmonika@gmail.com` a `/app/admin`, el menú titila y no responde. Causa raíz identificada por lectura del código (aún **por confirmar en runtime** con una prueba real):

1. **Violación de reglas de hooks en `src/routes/_authenticated/app.tsx`** — el layout hace un `return <Outlet />` condicionado al pathname *antes* de llamar `useServerFn(getFamilyDashboard)` y `useQuery(...)`. En rutas admin se saltan esos hooks; al navegar entre ítems del `AdminSidebar` React detecta cambios en el número de hooks y remonta el árbol → se ve como parpadeo del sidebar y clicks perdidos.
2. **Anidamiento de layouts** — por la convención flat, `app.admin.tsx` es hijo de `app.tsx`, así que el layout familiar envuelve al layout admin. Hoy se "esquiva" con el `if` anterior; conviene separarlo limpiamente.
3. **`getAdminOverview` lento/frágil** — recorre hasta 20 páginas de `supabaseAdmin.auth.admin.listUsers` en el request del dashboard. Bloquea el primer render y, si falla, deja `isLoading` alto. `listAdminFamilies` también hace un `getUserById` por cada perfil (N+1).
4. **`AdminHome` usa `q.isLoading`** (semántica de TanStack Query v4). Con v5 conviene `isPending` para evitar estados intermedios raros.

## Cambios

1. Refactor de `src/routes/_authenticated/app.tsx`:
   - Extraer el shell familiar a un componente `FamilyShell` que contenga los hooks (`useServerFn`, `useQuery`, `MoholkaFloatingButton`).
   - `AppLayout` decide por pathname y renderiza `<FamilyShell />` o `<Outlet />`. Los hooks quedan dentro de `FamilyShell`, no condicionados.

2. `src/routes/_authenticated/app.admin.tsx`:
   - Mantener `SidebarProvider` + `AdminSidebar` + `SidebarInset`.
   - Confirmar que el `beforeLoad` no encadena redirects: si `has_role` falla o devuelve `null`, mostrar un fallback "Sin permisos" en vez de `redirect({ to: "/app" })` (que puede ping-pongear si el usuario también carece de patient).
   - Agregar `errorComponent` y `pendingComponent` en la ruta admin para evitar pantallas en blanco durante fallos del overview.

3. `src/lib/admin/overview.functions.ts`:
   - `getAdminOverview`: paralelizar la sección de `activeUsers30d` con timeout corto (2s) y catch silencioso. Si falla, retornar `activeUsers30d: null` y mostrar "—" en la card.
   - `listAdminFamilies`: reemplazar el bucle `getUserById` por una sola llamada `admin.listUsers` paginada mapeada por id (o mover email/last_sign_in a una vista/función SQL). Reduce N+1.
   - Añadir `try/catch` global para que un fallo puntual no tumbe todo el payload.

4. `src/routes/_authenticated/app.admin.index.tsx`:
   - Usar `q.isPending` en vez de `q.isLoading`.
   - Renderizar el grid con skeletons en vez de un placeholder centrado (evita salto de layout).
   - Manejar `q.isError` con un mensaje claro y botón "Reintentar" (`q.refetch()`).

5. Verificación en runtime (después de aplicar):
   - Login con `holguinmonika@gmail.com` vía Playwright.
   - Navegar `/app/admin` → `/app/admin/familias` → `/app/admin/pacientes` sin recargar; confirmar que el sidebar no parpadea y los clicks navegan.
   - Revisar consola: 0 warnings de "Rendered fewer hooks than expected".

## Detalles técnicos

- Convención flat de TanStack Router hace que `app.admin.tsx` sea child de `app.tsx`; por eso no se puede evitar que `AppLayout` monte. La solución correcta es meter los hooks del shell familiar dentro de un subcomponente montado solo cuando corresponde.
- `listUsers` de Auth Admin acepta hasta 1000/page; una sola página cubre la base actual y elimina el N+1 en `listAdminFamilies`.
- El `AdminSidebar` es `collapsible="offcanvas"`; en desktop debe verse siempre. El trigger del header (`app.admin.tsx`) queda accesible en ambos estados.

## Fuera de alcance

- Cambiar el diseño visual del panel admin.
- Mover el árbol admin fuera de `_authenticated/app/*` (implicaría reescribir todas las rutas hijas y los links del sidebar).
- Optimizaciones de RLS/consultas más allá del N+1 de familias.
