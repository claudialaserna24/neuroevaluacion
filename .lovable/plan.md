## Plan

**1. Asignar administrador a holguinmonika@gmail.com**

Vía migración SQL que:
- Busca el `user_id` en `auth.users` por email.
- Inserta el rol `administrador` en `public.user_roles` (ON CONFLICT DO NOTHING).
- Si el usuario aún no se ha registrado, la migración falla explícitamente para avisarte; en ese caso, primero se registra normalmente (como padre) y luego re-ejecutamos la asignación.

**2. Quitar la opción "Administrador" del registro público**

En `src/routes/auth.tsx`:
- Eliminar el selector de rol (tarjetas "Padre / Madre" vs "Neuropsicólogo / Administrador") del formulario de registro.
- Quitar el estado `role`, el tipo `Role`, el componente `RoleCard` y los íconos `Users` / `Stethoscope` si quedan sin uso.
- En `supabase.auth.signUp`, enviar siempre `data: { full_name: name, role: "usuario" }` (aunque el trigger ya usa `usuario` por defecto vía `COALESCE`, lo dejamos explícito).
- No se toca `handle_new_user` — el default `'usuario'` ya cubre cualquier registro sin rol.

**3. Verificación**

- Confirmar que al registrarse un usuario nuevo cae en `user_roles` con rol `usuario`.
- Confirmar que holguinmonika@gmail.com aparece con rol `administrador` y ve el enlace "Panel administrador" en el sidebar al iniciar sesión.
- Revisar build/typecheck tras remover imports no usados.

### Detalles técnicos

- Migración: `INSERT INTO public.user_roles (user_id, role) SELECT id, 'administrador'::app_role FROM auth.users WHERE email = 'holguinmonika@gmail.com' ON CONFLICT (user_id, role) DO NOTHING;`
- Si el usuario ya tiene rol `usuario`, se conserva junto al nuevo `administrador` (la tabla permite múltiples roles por user_id). `has_role`/`is_admin` seguirán devolviendo true para admin.
- No se cambia el flujo de OAuth Google — los nuevos usuarios via Google también entran como `usuario` por default del trigger.