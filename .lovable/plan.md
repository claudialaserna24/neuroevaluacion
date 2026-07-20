# Experiencia de compra y preparación del Checkout

Precio: **USD $80** (moneda `USD`). Wompi se integrará en un módulo posterior; por ahora solo se prepara la estructura.

No se toca la Evaluación, la Hoja de Ruta (contenido) ni el Dashboard.

## 1. Modal de confirmación en la Hoja de Ruta

Archivo: `src/routes/_authenticated/app.informe.tsx`.

- Reemplazar el `<Link to="/checkout">` del botón "Desbloquear mi Plan Interactivo" por un `<button>` que abra un modal controlado con `useState`.
- El "Conocer todo lo que incluye" mantiene su función, pero también se puede abrir desde el modal.
- Modal:
  - Overlay con `backdrop-blur-sm bg-background/60` sobre la Hoja de Ruta.
  - Tarjeta central `rounded-3xl bg-card p-6 max-w-lg` con sombra y ring institucional.
  - Cierre con botón `X`, `Esc` y clic fuera.
  - Contenido literal solicitado:
    - Título serif: *"Estás a un paso de comenzar el acompañamiento personalizado de tu hijo."*
    - Párrafos introductorios exactos.
    - Lista de 7 beneficios con iconos discretos de Lucide (`CheckCircle2`, `CalendarDays`, `FileDown`, `Bot`, `MessagesSquare`, `Users`, `History`).
    - Bloque destacado **"¿Qué lograrás con este plan?"** con los 3 mensajes de resultado (recomendación adicional del brief).
    - Nota clínica en `text-xs text-muted-foreground`.
  - Botones:
    - Principal `Continuar al pago` → cierra modal y navega a `/checkout?patient=<id>`.
    - Secundario `Conocer mi Plan` → cierra modal y navega a `/app/plan-interactivo?patient=<id>`.
- Accesibilidad: `role="dialog" aria-modal="true"`, focus trap básico, `aria-labelledby`.

## 2. Página "Conoce tu Plan Interactivo"

Reescribir `src/routes/_authenticated/app.plan-interactivo.tsx` para reemplazar la landing actual por las secciones pedidas, manteniendo la estética (serif Fraunces, tokens, tarjetas `rounded-3xl`).

Secciones (todas en tarjetas visuales, mobile-first, con iconos Lucide):

1. **Hero** — título institucional, subtítulo y CTA secundario que abre el mismo checkout al final.
2. **Tu Plan Personalizado** — explica que se genera desde la Hoja de Ruta y la evaluación.
3. **Actividades paso a paso** — reflejos + integración sensorial, priorizadas.
4. **Calendario de trabajo** — frecuencia semanal.
5. **Materiales de apoyo** — recursos descargables asociados a cada actividad.
6. **Acompañamiento de Moholka (30 días)** — agente IA, solo consultas sobre aplicación del plan; no clínico/diagnóstico.
7. **Membresía** — comunidad privada, encuentros grupales con la neuropsicóloga, contenido adicional.
8. **Historial** — plan guardado, comparable con futuras reevaluaciones.
9. **"¿Qué lograrás con este plan?"** — mismo bloque de resultados que el modal (recomendación de conversión).
10. **CTA final** — bloque destacado con fondo `bg-gradient-to-br from-primary/10 ...`:
  - Título: *"Comienza hoy el acompañamiento personalizado de tu hijo."*
    - Texto solicitado.
    - Botón `Desbloquear mi Plan Interactivo` → `/checkout?patient=<id>`.

Se conserva `validateSearch` con `patient` uuid.

## 3. Checkout con resumen de compra

Archivo: `src/routes/_authenticated/checkout.tsx` (reemplazar el placeholder actual).

- Loader/component: cargar datos del paciente y de la última evaluación finalizada mediante server functions ya existentes (`getPatient`, `getRoadmap` o equivalente) usando `useServerFn` + `useQuery` — mismo patrón que `app.informe.tsx`. Si no existe una función que devuelva `assessmentId`, extenderé `getRoadmap` (o añadiré un helper) para exponerlo; no se cambia lógica clínica.
- Layout de tarjeta única con dos columnas en desktop, apiladas en móvil:
  - **Resumen de compra**
    - "Niño/a: `<full_name>`"
    - Producto: **Plan Interactivo NEUROPLAN**
    - Precio: `USD $80.00`
    - Moneda: `USD`
    - Total: `USD $80.00`
  - **Nota**: pago único, acceso inmediato tras confirmación.
- Botón principal **"Pagar "** (estilo `bg-primary`, icono `Lock`). Por ahora: al hacer clic, crea un registro `payments` en estado `pending` vía server function `createPendingPayment` y muestra un toast "Integración con Wompi en preparación." — no redirige a Wompi todavía. Deja el `assessment_id`, `patient_id`, `user_id`, `amount=80`, `currency=USD` listos.
- Botón secundario: volver a Hoja de Ruta.

Constante `PLAN_PRICE_USD = 80` en `src/lib/plan-pricing.ts` (nuevo, cliente-safe) para reutilizar en modal, landing y checkout.

## 4. Backend — tabla `payments` y estado del plan

Migración única con:

```sql
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','cancelled');
CREATE TYPE public.plan_status AS ENUM ('locked','unlocked');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.payment_status NOT NULL DEFAULT 'pending',
  wompi_reference text UNIQUE,
  wompi_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Updates de estado solo desde service_role (webhook Wompi futuro).

CREATE TRIGGER payments_touch BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Estado del plan por evaluación
ALTER TABLE public.neurodevelopment_roadmaps
  ADD COLUMN IF NOT EXISTS plan_status public.plan_status NOT NULL DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;
```

- Los cambios de `status` a `paid` (y el `plan_status → 'unlocked'` correspondiente) se harán vía service_role en el módulo Wompi; se deja preparada la columna.

## 5. Server functions nuevas

`src/lib/payments.functions.ts` con `requireSupabaseAuth`:

- `createPendingPayment({ patientId, assessmentId })` — inserta `pending`, valida que el paciente pertenezca al `userId` (RLS lo refuerza). Devuelve `{ paymentId, reference }` donde `reference = "NP-<paymentId>"`.
- `getPlanStatus({ patientId })` — lee `neurodevelopment_roadmaps.plan_status` de la última roadmap del paciente. Se usará más adelante.

Registrar imports desde el componente `checkout.tsx` (no en loaders públicos).

## Archivos afectados

- `src/routes/_authenticated/app.informe.tsx` — modal de confirmación.
- `src/routes/_authenticated/app.plan-interactivo.tsx` — rehacer landing con nuevas secciones.
- `src/routes/_authenticated/checkout.tsx` — resumen y botón Wompi.
- `src/lib/plan-pricing.ts` — nuevo, precio central.
- `src/lib/payments.functions.ts` — nuevo, server fns.
- Migración: `payments`, enums, columnas de plan en `neurodevelopment_roadmaps`.

## Fuera de alcance

- Integración real con Wompi (widget, webhook, verificación de firma).
- Cambios en Evaluación, Hoja de Ruta (contenido), Dashboard o motor.
- Emails transaccionales de compra.