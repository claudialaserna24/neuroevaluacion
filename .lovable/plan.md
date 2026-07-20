## Dashboard del Padre (CRM Familiar) — Plan

Construir el nuevo centro de acompañamiento para familias, reemplazando `/app` como pantalla principal tras el login. Se reutilizan todas las pantallas ya existentes (evaluación, Hoja de Ruta, Plan, Manual, Moholka, Perfil); no se toca ninguna lógica de negocio.

Adopto tu recomendación: la sección "Mi hijo" se llama **Ficha Integral**.

---

### 1. Layout con menú lateral fijo

Reescribir `src/routes/_authenticated/app.tsx` para pasar de la barra inferior de 4 items a un **sidebar fijo** (shadcn `Sidebar` con `collapsible="icon"`) + header con `SidebarTrigger`, manteniendo la identidad visual actual (colores, tipografía serif, cards redondeadas).

Items del menú (solo padre, sin admin):
- 🏠 Inicio → `/app`
- 👦 Ficha Integral → `/app/ficha` (nueva)
- 📊 Evaluaciones → `/app/evaluaciones` (nueva, resumen; el flujo actual `/app/evaluacion` sigue igual)
- 🧭 Hoja de Ruta → `/app/informe`
- 📋 Plan Interactivo → `/app/plan/$patientId` (o CTA a `/app/plan-interactivo` si aún no está desbloqueado)
- 🤖 Moholka → abre el Drawer existente (no navega)
- 📘 Manual Oficial → dispara Signed URL existente
- 📈 Seguimiento → `/app/seguimiento` (nueva, v1 informativa)
- 👤 Mi Perfil → `/app/perfil`
- Cerrar sesión

En móvil el sidebar es off-canvas con trigger visible; en desktop queda fijo a la izquierda.

### 2. Nueva pantalla Inicio (`/app`)

Reemplazar el contenido actual de `src/routes/_authenticated/app.index.tsx` (manteniendo su lógica de redirects de onboarding intacta) por el Dashboard:

- **Encabezado:** "Bienvenido(a), {profiles.full_name}"
- **Tarjeta resumen del niño:** nombre, edad, programa activo, semana actual (derivada de `plan_content.rutina` o fecha de generación), estado del Plan.
- **Botón principal contextual** según estado:
  - Sin paciente → "Registrar paciente"
  - Sin evaluación / en progreso → "Continuar evaluación" o "Iniciar evaluación"
  - Evaluación completa sin pago → "Desbloquear Plan"
  - Pago aprobado, plan generando → "Estamos preparando tu Plan…" (deshabilitado, con spinner)
  - Plan listo → "Continuar Plan"
- **Grid de cards resumen** (solo las relevantes al estado): Ficha Integral, Hoja de Ruta, Plan Interactivo, Moholka (última conversación), Manual Oficial, Seguimiento. Cada card enlaza a su sección.

### 3. Nuevas rutas resumen

Rutas ligeras que solo muestran resumen + CTA a lo existente:

- `src/routes/_authenticated/app.ficha.tsx` — **Ficha Integral**: datos del niño, diagnóstico, historial de evaluaciones (conteo + última fecha), estado Hoja de Ruta, estado Plan, próxima reevaluación sugerida. Botón "Ver ficha integral" abre esta misma vista expandida.
- `src/routes/_authenticated/app.evaluaciones.tsx` — nº de evaluaciones, última fecha, estado, botón "Ver historial" / "Reevaluar".
- `src/routes/_authenticated/app.seguimiento.tsx` — semana actual, progreso simple, fecha sugerida próxima evaluación, botón "Registrar avance" (v1: muestra estado, sin backend nuevo).

Las cards de Hoja de Ruta, Plan, Manual, Moholka, Perfil enlazan a rutas ya existentes.

### 4. Backend — un único server function nuevo

`src/lib/dashboard.functions.ts` con `getFamilyDashboard()` que devuelve en **una sola llamada** todo lo necesario para el Dashboard:

- `profile` (nombre, email, ciudad, teléfono)
- `patient` activo (o null)
- `assessmentsCount`, `lastAssessmentDate`, `assessmentStatus`
- `roadmap` (nivel general + top 3 prioridades)
- `plan` (status, generated_at, semana actual)
- `lastMoholkaMessage` (fecha + snippet)
- `manualAvailable` (bool)

Consultas mínimas paralelas con `Promise.all`, respetando RLS. Reutiliza `requireSupabaseAuth`.

### 5. Integraciones sin duplicar flujos

- **Moholka desde menú/card:** disparar apertura del Drawer existente mediante un pequeño event bus (custom event `moholka:open` con `patientId`) escuchado por `MoholkaFloatingButton`. Sin páginas nuevas.
- **Manual desde card/menú:** reutilizar `getManualDownloadUrl` ya existente → abrir en nueva pestaña.
- **Plan/Evaluación/Hoja de Ruta/Perfil:** navegación directa a rutas existentes.

### 6. Estados inteligentes

La lógica de redirects del onboarding en `app.index.tsx` (consentimiento → paciente → onboarding → evaluación activa) se mantiene intacta. El Dashboard solo se renderiza cuando el usuario ya pasó ese gate; dentro, las cards y el CTA principal se adaptan al `plan_status` y estado de evaluación devueltos por `getFamilyDashboard`.

### 7. Validación final

- Login → aterriza en `/app` con Dashboard.
- Cada card muestra datos reales del usuario autenticado.
- Todos los items del menú navegan o disparan la acción correcta.
- CTA principal cambia según los 5 estados.
- Moholka abre Drawer sin salir de la página.
- Manual usa Signed URL existente.
- Sin cambios en evaluación, Plan, Moholka backend, Wompi.

### Detalles técnicos

- Archivos nuevos: `src/lib/dashboard.functions.ts`, `src/routes/_authenticated/app.ficha.tsx`, `app.evaluaciones.tsx`, `app.seguimiento.tsx`, `src/components/dashboard/AppSidebar.tsx`, `src/components/dashboard/SummaryCard.tsx`.
- Archivos modificados: `src/routes/_authenticated/app.tsx` (layout con sidebar), `src/routes/_authenticated/app.index.tsx` (nuevo Dashboard, mismos redirects), `src/components/plan/MoholkaFloatingButton.tsx` (listener del evento `moholka:open`).
- Sin migraciones SQL. Sin cambios en tablas existentes.
- Usar shadcn `Sidebar`, `Card`, tokens semánticos ya definidos (nada de colores hardcoded).
