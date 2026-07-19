
# Módulo 0 — Flujo de incorporación del padre (solo lógica)

Objetivo: encadenar Landing → Auth → Consentimiento → Paciente → Onboarding → Evaluación de forma automática, sin rediseñar pantallas y sin IA. Se añade un único punto de decisión servidor + un despachador cliente que redirige al paso correcto.

## 1. Backend

Migración (una sola):

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
```

No se crean tablas nuevas. `handle_new_user` ya inserta el `profiles` en el signup, así que el flag arranca en `false` por default.

## 2. Server function única: `getOnboardingState`

Nuevo archivo `src/lib/onboarding.functions.ts`, con `requireSupabaseAuth`. Devuelve un DTO plano que el cliente usa para decidir la siguiente ruta:

```ts
{
  hasConsent: boolean,          // user_consents WHERE policy_kind='habeas_data'
  activePatientId: string | null, // último patients.created_at DESC
  onboardingCompleted: boolean, // profiles.onboarding_completed
  activeAssessmentId: string | null,   // assessments WHERE status='in_progress' del paciente activo
  hasCompletedAssessment: boolean,     // assessments WHERE status='completed' del paciente activo
}
```

Segunda server fn `startEvaluationFromOnboarding({ patientId })`:
1. `UPDATE profiles SET onboarding_completed=true WHERE id=auth.uid()`.
2. Reutiliza la lógica actual de `getAssessmentState({ patientId })` para asegurar una evaluación `in_progress` (find-or-create).
3. Devuelve `{ assessmentId }`.

Todo pasa por RLS existente (`profiles_self_all`, `assessments_self_all`, `patients_self_all`, `consents_self_read`). No se tocan políticas.

## 3. Punto de decisión en el cliente

Se centraliza en `/app` (ya es la ruta raíz autenticada). Se convierte `src/routes/_authenticated/app.index.tsx` en despachador:

- Al montar, llama `getOnboardingState` (loader + `useSuspenseQuery`, patrón estándar del template).
- Redirige con `navigate({ replace: true })` según esta tabla — el usuario nunca elige el paso:

| Estado | Redirige a |
|---|---|
| `!hasConsent` | `/consentimiento` |
| `hasConsent && !activePatientId` | `/app/pacientes?first=1` (abre el formulario automáticamente) |
| paciente OK, `!onboardingCompleted` | `/onboarding?patient=<id>` |
| onboarding OK, `activeAssessmentId` presente | `/app/evaluacion?patient=<id>` (retoma) |
| onboarding OK, evaluación `completed` | permanece en `/app` → renderiza el **Dashboard actual** (lista de pacientes / resumen) |

Único caso que **renderiza contenido** en `/app`: el dashboard del usuario recurrente que ya terminó. El resto son redirecciones inmediatas → nunca se ve "flash" del dashboard.

## 4. Ajustes de rutas existentes (sin rediseñar UI)

### `src/routes/auth.tsx`
- Login `onSuccess` → `navigate({ to: "/app" })` (hoy ya).
- Register `onSuccess` → **también** `navigate({ to: "/app" })` en vez de `/onboarding`. El despachador se encarga de mandarlo a consent → paciente → onboarding.
- `emailRedirectTo` pasa a `${origin}/app`.

### `src/routes/onboarding.tsx`
- Acepta search param `patient` (uuid).
- Copy actualizado (según brief):
  - Menciona los 3 módulos: Perfil Cognitivo, Evaluación Funcional, Patrones Asociados a Reflejos Primitivos.
  - Menciona pausa/autoguardado y "al finalizar recibirás una Hoja de Ruta para el Neurodesarrollo".
  - Se elimina toda mención a diagnósticos.
- Botón único **"Comenzar evaluación"**: llama `startEvaluationFromOnboarding({ patientId })` y luego `navigate({ to: "/app/evaluacion", search: { patient: patientId } })`.
- Si llega sin `patient` en la URL, el propio despachador lo habrá mandado antes al paso correcto; como salvaguarda extra, la página también llama a `getOnboardingState` y se auto-corrige.

### Nueva ruta pública/gated `src/routes/_authenticated/consentimiento.tsx`
- Reutiliza el componente `HabeasDataGate` que ya existe. Se monta como página completa (no como overlay) para que el flujo sea el "paso" que describes.
- Al aceptar (`acceptHabeasData` ya existe) → `navigate({ to: "/app", replace: true })`.
- La versión modal del `HabeasDataGate` sigue disponible por si se necesita en otro lugar, pero en este módulo se usa como página.

### `src/routes/_authenticated/app.pacientes.tsx`
- Añade `validateSearch` con `first?: "1"`. Si `first === "1"` y no hay pacientes:
  - Abre el formulario `NewPatientForm` automáticamente (equivalente a `showForm=true` inicial).
  - Al guardar exitosamente, en lugar de navegar al detalle del paciente, `navigate({ to: "/onboarding", search: { patient: row.id } })`.
- Comportamiento normal (sin `first=1`) se mantiene: alta manual desde el CRUD que sigue igual.

## 5. Regla de "usuarios que regresan"

Se cumple automáticamente por el despachador `/app`:
- Evaluación en progreso → cae en la fila 4 de la tabla → abre `/app/evaluacion?patient=<id>` (la ruta actual ya reanuda desde la última pregunta guardada porque `getAssessmentState` restaura las respuestas).
- Evaluación completada → cae en la fila 5 → dashboard.
- Onboarding ya visto → nunca vuelve a la pantalla `/onboarding` (el flag `onboarding_completed` lo evita, incluso si en el futuro se completa una segunda evaluación).

## 6. Validaciones (checklist del brief)

- Landing → Registro/Login: ya conectado.
- Consentimiento solo cuando `!hasConsent`.
- Paciente asociado a `auth.uid()`: garantizado por `createPatient` + RLS `patients_self_all`.
- Onboarding solo primera vez: `onboarding_completed` cambia a `true` en `startEvaluationFromOnboarding`.
- Assessment se crea al presionar "Comenzar evaluación" vía `getAssessmentState` (find-or-create, estado `in_progress`).
- Abandono/regreso: despachador retoma exactamente en `/app/evaluacion?patient=<id>` con las respuestas ya guardadas.
- Ya completó → dashboard.

## 7. Fuera de alcance (no se toca)

- Diseño visual de landing, auth, onboarding, dashboard, formulario de paciente.
- Motor clínico, informe, Moholka, pagos.
- Multi-evaluación histórica (el constraint `UNIQUE(user_id)` sigue en `assessments`; Módulo 0 no lo necesita).
- Políticas RLS para rol administradora (queda para el módulo de CRM).

## 8. Orden de ejecución

1. Migración `profiles.onboarding_completed`.
2. `src/lib/onboarding.functions.ts` con las dos server fns.
3. Reescritura del contenido de `app.index.tsx` como despachador (mantiene el dashboard como fallback).
4. Nueva ruta `_authenticated/consentimiento.tsx` que envuelve `HabeasDataGate` como página.
5. `app.pacientes.tsx`: `validateSearch` + auto-abrir formulario + redirección post-guardado a `/onboarding`.
6. `onboarding.tsx`: nuevo copy, search param `patient`, botón llama a `startEvaluationFromOnboarding` y navega a evaluación.
7. `auth.tsx`: registro también redirige a `/app`, `emailRedirectTo` → `/app`.
8. Verificación end-to-end en la preview: usuario nuevo (consent → paciente → onboarding → evaluación) y usuario que vuelve (retoma o dashboard).
