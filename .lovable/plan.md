# Dashboard del Administrador (CRM NEUROPLAN)

Alcance muy amplio (12 módulos + Ficha Integral + rol nuevo). Propongo entregar en **3 fases** para poder validar cada capa antes de avanzar. Ninguna fase toca Padre, Moholka, Plan, Evaluación o Pagos: solo agrega rutas nuevas bajo `/app/admin/*` y políticas RLS aditivas.

Confirma si prefieres que arranque por la Fase 1 o si quieres cambiar el orden.

---

## Base común (se hace en Fase 1)

### Modelo de datos y seguridad
- Añadir valor `neuropsicologo` al enum `public.app_role`.
- Nueva tabla `public.patient_assignments` (`patient_id`, `neuropsicologo_id`, timestamps) con GRANT + RLS: administrador ve todo, neuropsicólogo ve solo sus filas.
- **Políticas RLS aditivas** (nunca reemplazar las existentes de familia) usando `public.has_role(auth.uid(), 'administrador')` en SELECT sobre: `profiles`, `patients`, `assessments`, `assessment_answers`, `neurodevelopment_roadmaps`, `payments`, `moholka_conversations`, `moholka_messages`, `user_consents`, `user_roles`. Para neuropsicólogo: SELECT solo si existe fila en `patient_assignments`.
- Ningún permiso de UPDATE/DELETE sobre pagos, respuestas de evaluación ni conversaciones de Moholka para nadie salvo escrituras ya existentes de familia. Regenerar plan sí requiere UPDATE admin sobre `neurodevelopment_roadmaps` (política dedicada).
- Función helper `public.is_admin()` y `public.can_view_patient(_pid)` (security definer) para reutilizar en policies y server fns.

### Rutas y layout
- Nuevo layout `src/routes/_authenticated/app.admin.tsx` con `beforeLoad` que valida `has_role administrador` (los neuropsicólogos entran a un subset — ver Fase 3). Sidebar admin propio (`AdminSidebar`) con los 12 ítems del brief.
- Enlace al panel admin desde `AppSidebar` del padre **solo** si el usuario tiene rol admin (item extra "Panel admin").
- Server fns nuevas en `src/lib/admin/*.functions.ts`, todas con `requireSupabaseAuth` + verificación `has_role administrador` (o `can_view_patient` para neuropsicólogo).

---

## Fase 1 — Fundamento admin + Dashboard + módulos de solo lectura

Objetivo: administrador ya puede navegar todo NEUROPLAN en solo-lectura.

1. Migración de roles + RLS admin + tabla `patient_assignments` + helpers.
2. Layout `/app/admin` con guardia y `AdminSidebar`.
3. `/app/admin` (home): tarjetas KPI — familias, pacientes, evaluaciones (total y finalizadas), planes generados, planes desbloqueados, conversaciones Moholka, pagos recibidos, recaudo total (COP), usuarios activos (últimos 30 días). Un solo server fn `getAdminOverview` con `count` agregados.
4. **Familias** (`/app/admin/familias`): lista de `profiles` con conteo de pacientes, ciudad (derivada del primer paciente), último acceso (`auth.users.last_sign_in_at` vía `supabaseAdmin` dentro de handler), estado de suscripción (derivado de `plan_status`). Buscador + filtros básicos por estado.
5. **Pacientes** (`/app/admin/pacientes`): tabla con nombre, edad, acudiente, última evaluación, estado del plan; botón "Ficha Integral" → `/app/admin/pacientes/$patientId`.
6. **Evaluaciones** (`/app/admin/evaluaciones`): lista con paciente, fecha, estado, % completado, tiempo empleado. Vista de detalle en solo-lectura reutilizando el renderer existente (sin inputs habilitados).
7. **Hojas de Ruta** (`/app/admin/hojas-de-ruta`): lista + botón "Ver" que abre vista existente en modo lectura.
8. **Pagos** (`/app/admin/pagos`): tabla con estado, método, referencia Wompi, fecha, monto, paciente + drawer de detalle. Sin edición.
9. **Ficha Integral** (`/app/admin/pacientes/$patientId`): página única con secciones: datos del niño, acudiente, evaluaciones, hoja de ruta vigente, planes (anteriores + actual), estado del programa 12 semanas, conversaciones Moholka (solo lectura, reutiliza render existente), historial de pagos, botón de descarga del Manual (signed URL, mismo helper actual).

---

## Fase 2 — Módulos con acciones controladas

10. **Planes Interactivos** (`/app/admin/planes`): lista + botón "Abrir" (vista existente) + botón "Regenerar" con modal de confirmación. La regeneración llama al server fn actual del generador; requiere admin. Se guarda auditoría mínima (columna `regenerated_at`, `regenerated_by` en `neurodevelopment_roadmaps`).
11. **Moholka** (`/app/admin/moholka`): listado de `moholka_conversations` con paciente, fecha, número de mensajes; drawer/página de lectura del hilo. Sin envío de mensajes.
12. **CEREBRO** (`/app/admin/cerebro`): mover el editor actual (`app.admin.cerebro.tsx`) bajo el nuevo layout admin conservando toda su lógica de import CSV, versión, append/replace, stats por módulo. Añadir buscador + filtros por módulo/subcategoría sobre `knowledge_documents`.

---

## Fase 3 — Gestión de usuarios y configuración

13. **Neuropsicólogos** (`/app/admin/neuropsicologos`): CRUD de usuarios con rol `neuropsicologo` (invitar por email vía `supabaseAdmin.auth.admin.inviteUserByEmail` dentro de handler), asignación de pacientes (edita `patient_assignments`). Vista neuropsicólogo: subset del admin (dashboard, pacientes asignados, evaluaciones, hojas de ruta, planes, Moholka lectura). Sin pagos, sin configuración, sin CEREBRO, sin usuarios.
14. **Usuarios** (`/app/admin/usuarios`): tabla con rol, estado, último acceso; acciones: activar/desactivar (`auth.admin.updateUserById` con `banned_until`), cambiar rol (mutar `user_roles`), restablecer acceso (`auth.admin.generateLink` recovery).
15. **Configuración** (`/app/admin/configuracion`): tabla nueva `public.app_settings` (key/value JSON, solo admin). Formularios para logo, información institucional, versión visible del Manual, banderas de Wompi (solo lectura del `WOMPI_ENVIRONMENT`, sin exponer claves), variables generales, parámetros de Moholka (temperatura, longitud). Sin edición de reglas clínicas.
16. Validaciones automáticas manuales: recorrido Playwright con tres cuentas (admin, neuropsicólogo asignado, familia) confirmando accesos permitidos y denegados.

---

## Detalles técnicos

- **Rutas** siguen el patrón `_authenticated/app.admin.<seccion>.tsx` (dot-separated). Layout `app.admin.tsx` renderiza `<Outlet />` dentro del shell admin.
- **Server fns**: un archivo por módulo en `src/lib/admin/` (`overview.functions.ts`, `families.functions.ts`, etc.). Todas verifican `has_role administrador` (o `can_view_patient` para neuropsicólogo) antes de leer.
- **`supabaseAdmin`** solo se usa dentro del handler y solo para lo que RLS no puede resolver: leer `auth.users.last_sign_in_at`, invitaciones, `auth.admin.updateUserById`. Nunca para leer datos que ya son accesibles por RLS admin.
- **Reutilización**: los renders de Evaluación, Hoja de Ruta, Plan y Moholka se envuelven en componentes "solo lectura" (props `readOnly`) que ya existen o se agregan como wrappers, sin tocar la lógica de padre.
- **Ficha Integral** es una sola ruta compartida en URL entre admin y neuropsicólogo (`/app/admin/pacientes/$patientId`); acceso controlado por policy.

## Fuera de alcance (para confirmar antes de arrancar)

- No incluyo un rol/pantalla separada para neuropsicólogos fuera del panel admin: entran a `/app/admin` y ven un subset. Si quieres una URL propia (`/app/clinico`) dímelo.
- La suscripción/membresía continua todavía no existe como entidad; en "Familias — estado de suscripción" derivaré `unlocked/locked` de los roadmaps, no una tabla de membresías nueva.
- "Configuración de Moholka" será solo parámetros de generación (no editar prompts base) para no tocar Moholka.

¿Arranco por la **Fase 1** con esta base?
