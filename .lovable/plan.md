## Objetivo

Introducir la entidad **paciente (niño)** como eje del modelo de datos. Todas las evaluaciones y la Hoja de Ruta para el Neurodesarrollo pasarán a estar asociadas al paciente, no directamente al usuario. Un mismo acudiente (usuario) podrá tener uno o varios pacientes.

## 1. Nueva tabla `public.patients`

Campos:

- `id` uuid PK
- `user_id` uuid → `auth.users` (acudiente responsable)
- `first_name` text — nombres
- `last_name` text — apellidos
- `date_of_birth` date
- `age_years` int **generado** desde `date_of_birth` (columna calculada, así "edad" nunca se desincroniza)
- `diagnosis` text nullable — diagnóstico si lo tiene
- `interventions` text nullable — terapias / protocolos recibidos
- `developmental_history` text nullable — antecedentes importantes del desarrollo
- `parent_name` text — nombre del padre/acudiente
- `parent_email` text
- `parent_phone` text
- `city` text
- `created_at`, `updated_at` con trigger `touch_updated_at`

Seguridad:

- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, `GRANT ALL ... TO service_role` (sin `anon`).
- RLS activa. Política única `patients_self_all`: `auth.uid() = user_id`.

## 2. Refactor de tablas existentes

### `assessments`

- Añadir `patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE`.
- Índice en `patient_id`.
- Mantener `user_id` (redundante pero útil para RLS directa y auditoría).
- Regla: una evaluación pertenece a **un** paciente.
- Migración de datos existentes: para cada fila actual sin paciente, crear un `patients` placeholder por `user_id` (nombre "Paciente sin registrar") y enlazar. Así ninguna evaluación queda huérfana ni se rompe RLS.

### `assessment_answers`

- Sin cambios estructurales. Sigue enlazado a `assessments`; el paciente se resuelve por join. RLS ya cubre por `assessments.user_id`.

### `initial_reports` → renombrar a `neurodevelopment_roadmaps`

- `ALTER TABLE ... RENAME TO neurodevelopment_roadmaps`.
- Añadir `patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE`.
- Cambiar la unicidad: hoy es `UNIQUE(user_id)` (implícito por el `upsert onConflict: user_id`). Pasa a `UNIQUE(patient_id, assessment_id)` para permitir una hoja de ruta por evaluación de cada paciente.
- Mantener `user_id` para RLS directa.

### Preparación para futuras tablas

Documentar (no crear todavía) el patrón para:

- `interactive_plans (id, patient_id, user_id, assessment_id, ...)` — plan desbloqueado tras compra.
- `moholka_conversations (id, patient_id, user_id, ...)` — hilos de acompañamiento IA.
Ambas seguirán la misma convención: `patient_id NOT NULL`, `user_id` para RLS, política `self_all` por `auth.uid() = user_id`.

## 3. Ajustes de código (después de migración aprobada)

- `src/lib/assessment.functions.ts`
  - `getAssessmentState` recibirá `patientId` y buscará/creará la evaluación **del paciente**, no del usuario.
  - `completeAssessment` escribirá en `neurodevelopment_roadmaps` con `onConflict: 'patient_id,assessment_id'`.
  - `getMyReport` → `getRoadmap({ patientId })`.
- Nuevo `src/lib/patients.functions.ts`: `listMyPatients`, `createPatient`, `updatePatient`, `getPatient` (todos con `requireSupabaseAuth`, scoping por `user_id`).
- `src/routes/_authenticated/`:
  - Nueva ruta `app.pacientes.tsx` — lista de pacientes del acudiente + botón "Añadir paciente".
  - Nueva ruta `app.pacientes.$patientId.tsx` — ficha con datos y accesos a Evaluación / Hoja de Ruta.
  - `app.evaluacion.tsx` y `app.informe.tsx` pasarán a recibir `patientId` por search param o path param.
  - `app.index.tsx` cambia el CTA: si no hay pacientes → "Registrar a tu hijo/a"; si hay uno → resumen de ese paciente; si hay varios → selector.
- `src/lib/mcp/tools/*`: las tres tools aceptarán `patient_id` opcional (si el usuario tiene uno, se auto-selecciona; si tiene varios, se requiere).
- `src/routes/onboarding.tsx`: tras el consentimiento de Habeas Data, se añade un paso corto "Registra a tu hijo/a" que crea el primer `patients` antes de habilitar la evaluación.

## 4. Copy / terminología en UI

- "Informe inicial" / "Hoja de Ruta" → **"Hoja de Ruta para el Neurodesarrollo"** en toda la UI y PDF.
- Referencias en `brand-copy.ts` y en `app.informe.tsx` se actualizan en el mismo paso.

## 5. Orden de ejecución

1. **Migración SQL** (una sola): crear `patients` + grants + RLS, backfill placeholders, añadir `patient_id` a `assessments` (NOT NULL tras backfill), renombrar `initial_reports` → `neurodevelopment_roadmaps` + `patient_id` + índice + nueva restricción única.
2. Regeneración de `types.ts` (automática al aprobar la migración).
3. Server functions nuevas (`patients.functions.ts`) y ajuste de `assessment.functions.ts`.
4. Rutas de UI: `pacientes` (lista + ficha + alta), ajuste de onboarding, evaluación e informe.
5. Ajuste de tools MCP y de `brand-copy.ts`.
6. Verificación end-to-end: crear paciente → iniciar evaluación → completar → ver Hoja de Ruta.

## Preguntas abiertas (confirmar antes de implementar)

- **Multi-paciente ya en Fase 2**: habilitamos desde ya que un acudiente registre varios pacientes.
  &nbsp;