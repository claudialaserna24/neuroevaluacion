## Manual Oficial de Ejercicios NEUROPLAN — integración completa

Reutiliza la infraestructura existente (`manual_pdf_url` en `neurodevelopment_roadmaps`, `getManualDownloadUrl`, tarjeta del dashboard y recordatorio en fichas del visor), y añade lo que falta: bucket propio, resolución dinámica del Manual actual, y admin para reemplazarlo.

### 1. Storage — bucket dedicado
- Crear bucket privado `manual-assets` mediante la herramienta de storage.
- Políticas RLS sobre `storage.objects` (migración):
  - SELECT: solo `service_role` (backend firma URLs).
  - INSERT/UPDATE/DELETE: solo usuarios con rol `administrador`.
- Sin acceso público. Descarga solo vía Signed URL generada por el backend.

### 2. Manual "activo" único
- No crear tabla nueva. Guardar el path del PDF vigente en una fila fija de `knowledge_documents` (o similar ya existente) — a confirmar; alternativa mínima: constante en DB vía una fila `settings` reutilizable. Para no crear tabla, se usará una **entrada única** en `knowledge_documents` con `module='manual'` y `content_path = manual-assets/<archivo>.pdf`.
- `neurodevelopment_roadmaps.manual_pdf_url` se llenará automáticamente al activar un plan con el path del Manual activo actual (para trazabilidad y compatibilidad); si está vacío se usa el Manual activo global. Esto respeta "cada plan tiene asociado un único Manual" sin duplicar archivos.

### 3. Backend — server functions
Modificar `src/lib/plan/plan.functions.ts`:
- `getManualDownloadUrl({ patientId })`:
  1. Verificar plan `unlocked` para ese paciente del usuario (ya existe `assertUnlocked`).
  2. Resolver path: `roadmap.manual_pdf_url` si existe; si no, leer el registro activo de `knowledge_documents` (`module='manual'`, `is_active=true`).
  3. Firmar contra bucket `manual-assets` con `supabaseAdmin.storage.createSignedUrl` (TTL 10 min).
  4. Devolver `{ available, url }`.
- Actualizar `getInteractivePlan` para reportar `manual_available` según existencia del registro activo, no de la constante hardcoded.

Eliminar `MANUAL_OBJECT_PATH` de `src/lib/plan/constants.ts`; cambiar `MANUAL_BUCKET` a `"manual-assets"`.

### 4. Admin — subida/reemplazo
Nueva ruta `src/routes/_authenticated/app.admin.manual.tsx` (solo rol administrador):
- Muestra Manual activo actual (nombre, fecha de subida) y botón "Reemplazar Manual".
- Input `<input type="file" accept="application/pdf">`.
- Server fn `uploadManual` (admin-only, verificando `has_role`): sube al bucket `manual-assets/manual-oficial-<timestamp>.pdf` con `supabaseAdmin`, actualiza el registro activo en `knowledge_documents` (marca anterior `is_active=false`, inserta nuevo activo).
- Sin versionado visible en el MVP.

Enlace de acceso desde `/app/admin/cerebro` (o el layout admin existente).

### 5. UI — Plan Interactivo
- **Dashboard** (`app.plan.$patientId.tsx`): la tarjeta "Manual Oficial de Ejercicios NEUROPLAN" ya existe. Ajustar el copy al pedido:
  > "Este manual contiene la explicación visual paso a paso de todos los ejercicios mencionados en tu Plan Interactivo."
  El botón "Descargar Manual Oficial (PDF)" llama a `getManualDownloadUrl` y abre la URL firmada en una nueva pestaña (ya implementado).
- **Visor** (`app.plan.$patientId.ver.tsx`): el recordatorio al pie de cada ficha ("La ejecución correcta de este ejercicio puede consultarse en el Manual Oficial…") se convierte en enlace/botón que dispara la misma descarga (`getManualDownloadUrl`).

### 6. Validaciones
- Bucket existe y es privado (verificable tras crear).
- `getManualDownloadUrl` sin plan desbloqueado → error.
- Signed URL con TTL corto (10 min, ya en `SIGNED_URL_TTL`).
- Admin no-administrador no puede subir (verificación server-side + RLS).

### Fuera de alcance
- Skill del Plan Interactivo: sin cambios.
- Hoja de Ruta, pagos, flujo actual: sin cambios.
- No se embeben páginas del PDF ni miniaturas.

### Detalles técnicos
- Migración: políticas RLS de `storage.objects` para `manual-assets` (SELECT via service_role únicamente, escritura solo administradores); opcionalmente marcar `module='manual'` como valor permitido en `knowledge_documents` (si tiene CHECK constraint — a verificar en build).
- Todos los accesos privilegiados vía `await import("@/integrations/supabase/client.server")` dentro del handler.
- No se toca `client.ts`, `types.ts` (se regenerarán) ni el webhook de Wompi.
