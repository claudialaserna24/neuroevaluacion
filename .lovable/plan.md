# Experiencia de compra y preparación del Checkout

Precio: **USD $80** (moneda `USD`). Wompi se integrará en un módulo posterior; por ahora solo se prepara la estructura. No se toca la Evaluación, la Hoja de Ruta (contenido) ni el Dashboard.

## 1. Modal de confirmación en la Hoja de Ruta
Archivo: `src/routes/_authenticated/app.informe.tsx`.
- Reemplazar el `<Link to="/checkout">` del botón "Desbloquear mi Plan Interactivo" por un `<button>` que abra un modal controlado con `useState`.
- Modal con overlay `backdrop-blur-sm bg-background/60`, tarjeta `rounded-3xl bg-card p-6 max-w-lg`, cierre con `X`, `Esc` y clic fuera.
- Contenido:
  - Título serif: *"Estás a un paso de comenzar el acompañamiento personalizado de tu hijo."*
  - Párrafos introductorios.
  - Lista de 7 beneficios con iconos Lucide (`CheckCircle2`, `CalendarDays`, `FileDown`, `Bot`, `MessagesSquare`, `Users`, `History`).
  - Bloque **"¿Qué lograrás con este plan?"** con 3 mensajes de resultado.
  - Nota clínica en `text-xs text-muted-foreground`.
- Botones: `Continuar al pago` → `/checkout?patient=<id>`; `Conocer mi Plan` → `/app/plan-interactivo?patient=<id>`.
- Accesibilidad: `role="dialog" aria-modal="true"`, focus trap básico, `aria-labelledby`.

## 2. Página "Conoce tu Plan Interactivo"
Reescribir `src/routes/_authenticated/app.plan-interactivo.tsx` con estética serif Fraunces y tarjetas `rounded-3xl`. Secciones:
1. Hero institucional con CTA secundario.
2. Tu Plan Personalizado (derivado de la Hoja de Ruta y la evaluación).
3. Actividades paso a paso (reflejos + integración sensorial).
4. Calendario de trabajo (frecuencia semanal).
5. Materiales de apoyo (recursos descargables).
6. Acompañamiento de Moholka (30 días, no clínico).
7. Membresía (comunidad, encuentros con neuropsicóloga).
8. Historial (comparable con reevaluaciones).
9. "¿Qué lograrás con este plan?" (mismo bloque del modal).
10. CTA final `Desbloquear mi Plan Interactivo` → `/checkout?patient=<id>`.

Se conserva `validateSearch` con `patient` uuid.

## 3. Checkout con resumen de compra
Archivo: `src/routes/_authenticated/checkout.tsx`.
- Cargar paciente y última evaluación via `useServerFn` + `useQuery` (`getPatient`, `getRoadmap`). Si falta `assessmentId`, extender `getRoadmap` para exponerlo.
- Tarjeta con dos columnas en desktop, apiladas en móvil:
  - Resumen: niño, producto **Plan Interactivo NEUROPLAN**, precio `USD $80.00`, total `USD $80.00`.
  - Nota: pago único, acceso inmediato tras confirmación.
- Botón **"Pagar con Wompi"** (icono `Lock`): crea `payments` en estado `pending` vía `createPendingPayment` y muestra toast "Integración con Wompi en preparación."
- Botón secundario: volver a Hoja de Ruta.
- Constante `PLAN_PRICE_USD = 80` en `src/lib/plan-pricing.ts` (nuevo).

## 4. Backend — tabla `payments` y estado del plan
Migración única:
- Enums `payment_status` (`pending|paid|failed|cancelled`) y `plan_status` (`locked|unlocked`).
- Tabla `public.payments` con `user_id`, `patient_id`, `assessment_id`, `amount`, `currency`, `status`, `wompi_reference` (único), `wompi_transaction_id`, `paid_at`, timestamps.
- GRANT `SELECT, INSERT, UPDATE` a `authenticated`; `ALL` a `service_role`.
- RLS: `SELECT`/`INSERT` propios (`auth.uid() = user_id`); updates solo `service_role`.
- Trigger `touch_updated_at`.
- `neurodevelopment_roadmaps`: añadir `plan_status` (default `locked`) y `unlocked_at`.

Las transiciones a `paid` / `unlocked` se harán vía service_role en el módulo Wompi.

## 5. Server functions nuevas
`src/lib/payments.functions.ts` con `requireSupabaseAuth`:
- `createPendingPayment({ patientId, assessmentId })` → devuelve `{ paymentId, reference: "NP-<paymentId>" }`.
- `getPlanStatus({ patientId })` → lee `plan_status` de la última roadmap.

## Archivos afectados
- `src/routes/_authenticated/app.informe.tsx`
- `src/routes/_authenticated/app.plan-interactivo.tsx`
- `src/routes/_authenticated/checkout.tsx`
- `src/lib/plan-pricing.ts` (nuevo)
- `src/lib/payments.functions.ts` (nuevo)
- Migración: `payments`, enums, columnas de plan.

## Fuera de alcance
- Integración real con Wompi (widget, webhook, firma).
- Cambios en Evaluación, Hoja de Ruta (contenido), Dashboard o motor.
- Emails transaccionales de compra.
