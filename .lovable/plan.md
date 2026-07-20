
# Integración funcional Wompi — Sandbox

Reutilizamos toda la infraestructura ya creada (`wompi.server.ts`, `wompi.functions.ts`, secrets, tabla `payments`, `plan_status`). No se toca UI existente salvo el flujo del checkout y agregar 3 pantallas de resultado.

## ⚠️ Nota importante sobre moneda

Wompi solo procesa **COP** (pesos colombianos). Hoy `plan-pricing.ts` define el precio en **USD $80**. Para Sandbox usaremos **COP** en la transacción (los productos digitales de Wompi son COP). Propuesta: mantener `PLAN_PRICE_USD = 80` como precio de referencia y añadir `PLAN_PRICE_COP` (p.ej. `320000` COP) que es el monto real cobrado. La UI del checkout puede seguir mostrando USD $80 o mostrar ambos — confírmame si prefieres cambiar el precio mostrado a COP. Continúo el plan asumiendo que agrego `PLAN_PRICE_COP = 320000` y muestro un renglón "Equivalente en COP" en el resumen.

## Enfoque técnico

Usaremos **Web Checkout (redirección)** de Wompi — el modo más simple y oficial para pagos únicos: el usuario sale a `https://checkout.wompi.co/p/` con `public-key`, `reference`, `amount-in-cents`, `currency=COP`, `signature:integrity`, `redirect-url`. Cuando Wompi termina, redirige al usuario a nuestro `redirect-url` con `id` de transacción en query. En paralelo, el webhook oficial de Wompi (`transaction.updated`) marca el pago como `paid`/`declined` en nuestra base — es la fuente de verdad.

## Cambios

### 1. Backend — server functions (`src/lib/payments.functions.ts`)

- `createPendingPayment` (existente): calcular `amountInCents` en COP, generar firma con `generateIntegritySignature`, devolver `{ paymentId, reference, checkoutUrl }` construyendo la URL del Web Checkout con todos los parámetros firmados y `redirect-url = ${SITE_URL}/checkout/return?paymentId=...`.
- `getPaymentStatus({ paymentId })` (nuevo): devuelve `status`, `wompi_transaction_id`, y `plan_status` del roadmap. Se usa desde la pantalla de retorno para poll (cada 2s, máx ~30s).

### 2. Webhook público (`src/routes/api/public/wompi-webhook.ts` — nuevo)

- `POST` handler bajo `/api/public/wompi-webhook` (bypass de auth).
- Verifica `signature.checksum` con `verifyEventSignature` (propiedades declaradas por Wompi).
- Al recibir `transaction.updated`:
  - Busca `payments` por `wompi_reference`.
  - Consulta el estado real de la transacción a la API de Wompi (`GET /transactions/{id}` con `WOMPI_PRIVATE_KEY`) — nunca confiar solo en el payload.
  - Si `status === "APPROVED"`: actualiza `payments` con `status=paid`, `paid_at=now()`, `wompi_transaction_id`; y actualiza el `neurodevelopment_roadmaps` correspondiente (`plan_status=unlocked`, `unlocked_at=now()`) filtrando por `assessment_id` del payment (solo desbloquea esa evaluación).
  - Si `DECLINED`/`VOIDED`/`ERROR`: `status=rejected`.
  - Escribe con `supabaseAdmin` (import dinámico dentro del handler).
- Responde `200 OK` siempre tras verificar la firma para que Wompi no reintente indefinidamente.

**URL a registrar en el panel Wompi:**
`https://neuroevaluacion.lovable.app/api/public/wompi-webhook`

### 3. Migración SQL

- Añadir valor `'rejected'` al enum `payment_status` si no existe.
- Añadir `GRANT UPDATE ON public.neurodevelopment_roadmaps TO service_role` si falta (para que el webhook con admin client pueda desbloquear).

### 4. UI — Checkout (`src/routes/_authenticated/checkout.tsx`)

Reemplazar el `onClick` actual del botón "Pagar con Wompi":
1. Al hacer clic, mostrar loader con texto **"Estamos preparando tu pago de forma segura..."**.
2. Llamar `createPendingPayment` → recibe `checkoutUrl`.
3. `window.location.href = checkoutUrl` (redirección al Web Checkout Wompi).

### 5. Pantalla de retorno (`src/routes/checkout.return.tsx` — nuevo, público)

Wompi permite `redirect-url` a cualquier URL nuestra. La ponemos pública (no bajo `_authenticated`) para evitar problemas de sesión en el retorno; si no hay sesión, hacemos que el chequeo del pago sea por `paymentId` + firma corta o simplemente confiamos en RLS al re-abrir la sesión (la sesión persiste en `localStorage`, así que en la práctica el usuario vuelve autenticado).

Estados:
- **Verificando** (poll a `getPaymentStatus`): **"Estamos verificando tu pago. Esto puede tardar unos segundos."**
- **Aprobado** (`status=paid`): pantalla de éxito con identidad NEUROPLAN — título "¡Pago realizado con éxito!", texto "Tu Plan Interactivo ya está disponible y puedes comenzar inmediatamente.", botón **Ir a mi Plan Interactivo** → `/app/plan-interactivo` (o la ruta del plan desbloqueado del paciente).
- **Rechazado** (`status=rejected`): "No fue posible completar el pago." + botón **Intentar nuevamente** → vuelve a `/checkout?patient=...`.
- **Cancelado** (Wompi vuelve con query `?env=... &id=...` pero la transacción quedó `VOIDED`/no existe / usuario cerró): "Has cancelado el proceso de pago." + botón **Volver a la Hoja de Ruta** → `/app/informe?patient=...`.

Después de ~30s de poll sin resolución, cae a estado "cancelado" con opción de reintentar (el webhook seguirá procesando en background si llega tarde).

### 6. Menú Plan Interactivo — habilitación automática

Ya existe `getPlanStatus`. Verificar que el ítem de menú/CTA "Plan Interactivo" del dashboard use `plan_status === 'unlocked'` para habilitarse. Si el chequeo no está, agregarlo en el punto donde se lista el menú (sin cambiar diseño).

## Pruebas Sandbox

1. Completar evaluación → Hoja de Ruta → Desbloquear.
2. Checkout → "Pagar con Wompi" → redirige al widget Sandbox.
3. Usar tarjeta de prueba Wompi (APPROVED: `4242 4242 4242 4242`, CVV `123`, cualquier fecha futura).
4. Volver a `/checkout/return` → ver "verificando" → luego "¡Pago realizado con éxito!".
5. Verificar en DB: `payments.status='paid'`, `paid_at`, `wompi_transaction_id`; `neurodevelopment_roadmaps.plan_status='unlocked'`.
6. Repetir con tarjeta DECLINED (`4111 1111 1111 1111`) para validar flujo de rechazo.
7. Confirmar que solo se desbloquea el roadmap del `assessment_id` pagado.

## Fuera de alcance

- No se modifica landing, evaluación, informe, ni auth.
- No se cambia el precio USD mostrado (salvo el añadido COP en el resumen — confirmar).
