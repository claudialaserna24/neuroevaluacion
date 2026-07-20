# Infraestructura segura para Wompi

Las credenciales ya quedaron guardadas como Secrets en Lovable Cloud (nunca expuestas al frontend). Este paso solo prepara la infraestructura backend; la integración real de checkout/webhook llegará en el próximo módulo.

## Secrets creados (backend-only)
- `WOMPI_PUBLIC_KEY` — llave pública (uso en server functions para widget/redirect).
- `WOMPI_PRIVATE_KEY` — llave privada (consultas a API Wompi).
- `WOMPI_INTEGRITY_KEY` — firma de integridad de transacciones.
- `WOMPI_EVENTS_KEY` — verificación HMAC de webhooks.
- `WOMPI_ENVIRONMENT` — `sandbox` o `production`.

Accesibles vía `process.env.*` dentro de `createServerFn` handlers y rutas `api/public/*`. Nunca vía `import.meta.env` ni cliente.

## Trabajo a realizar

1. **Cliente Wompi server-only** — `src/lib/wompi.server.ts`
   - Exporta `getWompiConfig()` que lee los 5 `process.env.*` dentro de la función (no en el módulo).
   - Exporta `getWompiApiBaseUrl()` que devuelve `https://sandbox.wompi.co/v1` o `https://production.wompi.co/v1` según `WOMPI_ENVIRONMENT`.
   - Exporta `generateIntegritySignature({ reference, amountInCents, currency })` usando SHA-256 con `WOMPI_INTEGRITY_KEY` (formato oficial de Wompi).
   - Exporta `verifyEventSignature(payload, signature)` usando HMAC-SHA256 con `WOMPI_EVENTS_KEY`.
   - Sufijo `.server.ts` garantiza que jamás se incluya en el bundle del cliente.

2. **Server function de diagnóstico** — `src/lib/wompi.functions.ts`
   - `getWompiStatus` protegida con `requireSupabaseAuth`: devuelve `{ configured: true/false, environment: 'sandbox'|'production' }` sin revelar valores. Sirve para verificar en el próximo módulo que los secrets están accesibles.

3. **Verificación**
   - Confirmar que `getWompiStatus` responde `configured: true` desde el backend.
   - Confirmar que ningún archivo `.tsx`/`.ts` fuera de `*.server.ts` / `*.functions.ts` referencia `WOMPI_*`.

## Lo que NO se toca en este paso
- No se implementa creación de transacciones, redirect, widget, ni webhook receiver (llega en el próximo módulo).
- No se modifica la UI del checkout existente.

## Valores manuales pendientes
Ninguno — los 5 secrets ya fueron ingresados por el usuario en el formulario seguro de Lovable.
