# Diagnóstico técnico del flujo post-pago

## Evidencia recogida (sin cambios aún)

### 1. Pago (tabla `payments`)
Último intento (pruebas de hoy 22:24 UTC):

| id (prefijo) | status  | wompi_reference | wompi_transaction_id | paid_at | created_at | updated_at |
|---|---|---|---|---|---|---|
| **2dad8ef5** | pending | **NULL** | NULL | NULL | 22:24:49 | 22:24:49 |
| 0c386dc2 | pending | NP-0C386DC2 | NULL | NULL | 20:52:02 | **21:39:07** |
| d65720a7 | pending | NP-D65720A7 | NULL | NULL | 20:48:19 | **21:39:07** |
| 2bf6807d | pending | NP-2BF6807D | NULL | NULL | 20:38:04 | **21:39:07** |

Los pagos anteriores con `wompi_reference` no vinieron del INSERT: comparten exactamente el mismo `updated_at = 21:39:07` → fueron **el backfill** del turno anterior. El pago nuevo (22:24) **sigue insertando `wompi_reference` en NULL**, lo que significa que **el fix de `payments.functions.ts` no está desplegado en producción** (o la publicación no rehizo el bundle del server function).

### 2. Webhook (`/api/public/wompi-webhook`)
Logs del worker (última hora):
```
[22:26:05.269] POST /api/public/wompi-webhook → 200
[22:26:06.632] [warn] [wompi-webhook] payment not found NP-2DAD8EF5
```
- Wompi **sí** llamó al webhook (~76 s después del insert).
- La firma **pasó** la validación (si no, habría respondido 401).
- El handler **buscó** por `wompi_reference = 'NP-2DAD8EF5'` y no encontró fila → devolvió 200 sin actualizar nada.
- Nunca ejecutó el `UPDATE payments`, ni el `UPDATE neurodevelopment_roadmaps`, ni disparó la Skill.

### 3. Estado de la Hoja de Ruta
```
plan_status = locked
plan_generation_status = pending   (nunca escrito por este flujo)
plan_activated_at = NULL
unlocked_at = NULL
```
Consistente con "el webhook no encontró el pago".

### 4. Skill "Generador del Plan Interactivo"
No se llamó. El disparo vive dentro del branch `APPROVED` del webhook, y ese branch nunca se alcanzó porque el `.maybeSingle()` devolvió `null`.

### 5. Generación
No aplica: nunca llegó a `buildPlanInput`, ni a `queryCerebro`, ni al gateway.

### 6. Logs
Los únicos logs relevantes del último ciclo son los del webhook citados arriba. No hay stack traces del generador porque no se ejecutó. El polling de `getPaymentStatus` en `checkout.return.tsx` está haciendo lo correcto — encuentra `status='pending'` y por eso muestra "Estamos confirmando tu pago…" indefinidamente.

## Causa raíz

**Bug 1 (bloqueante hoy):** El fix a `createPendingPayment` que inserta `wompi_reference` junto con la fila **no está activo en la deployment publicada**. Cada nuevo pago sigue naciendo con `wompi_reference = NULL`, así que el webhook nunca cruza la referencia contra ninguna fila y termina el flujo en el `warn "payment not found"`.

**Bug 2 (latente, aparecerá apenas se resuelva el Bug 1):** En el webhook, tras marcar el pago como `paid` y desbloquear el roadmap, la Skill se dispara con:
```ts
void (async () => { await generateInteractivePlan(payment.patient_id); })();
```
El handler retorna `new Response("ok")` inmediatamente. En Cloudflare Workers, una promesa fire-and-forget queda sin runtime en cuanto la respuesta se envía, salvo que se registre con `ctx.waitUntil(...)`. Resultado esperado: pago quedaría `paid`, roadmap `unlocked`, pero `plan_generation_status` se quedaría en `pending` (o `generating` si alcanza a tomar el lock) y la Skill nunca terminaría. Además `generateInteractivePlan` hace múltiples llamadas al gateway; excede con holgura los ~30 s de CPU de un handler de Worker.

## Solución (a ejecutar en modo build)

1. **Forzar re-despliegue del fix de `wompi_reference`.**
   - Reconfirmar en `src/lib/payments.functions.ts` que el `insert` incluye `id`, `wompi_reference` (referencia derivada del UUID) en una sola operación (ya está en el fuente; el problema es que producción no lo tiene).
   - Añadir un `console.info("[createPendingPayment] inserted", { paymentId, reference })` para dejar evidencia en logs y poder confirmar en la próxima prueba que el bundle publicado es el correcto.

2. **Mover el disparo de la Skill fuera del handler HTTP del webhook.**
   - En `src/routes/api/public/wompi-webhook.ts`, reemplazar el `void (async () => …)()` por un endpoint interno dedicado, p. ej. una server route `POST /api/public/plan-generate` que valide un `secret` interno (HMAC con `WOMPI_EVENTS_KEY` o un `INTERNAL_TRIGGER_SECRET` nuevo) y llame a `generateInteractivePlan`.
   - Desde el webhook, hacer `fetch(<internal-url>, { method: "POST", body: {...}, headers: { ... } })` **sin await**, o mejor con `ctx.waitUntil(...)` si está disponible en el contexto del handler. Esto asegura que la ejecución de la Skill viva en su propia invocación de Worker (con su propio presupuesto de CPU) y no dependa del ciclo de vida del webhook.
   - Como fallback de resiliencia, si el cliente sigue haciendo polling y detecta `payments.status='paid'` pero `plan_generation_status ∈ {pending, failed}`, permitir que `getPaymentStatus` (o un server fn nuevo) reintente disparar el mismo endpoint interno una sola vez. Esto cubre el caso de que el `fetch` interno se pierda.

3. **Backfill del pago actual atascado** (`2dad8ef5-…`):
   - Asignarle `wompi_reference = 'NP-2DAD8EF5'` con una migración/insert puntual para que el webhook, si Wompi lo reintenta, pueda cerrarlo. Alternativamente marcarlo `rejected` para dejarlo fuera del camino feliz.

4. **Prueba end-to-end en Sandbox** tras aplicar 1–3:
   - Iniciar compra desde la Hoja de Ruta.
   - Aprobar en Wompi Sandbox.
   - Confirmar en logs: `createPendingPayment inserted` → webhook 200 con match → `payments.status = paid` → `roadmap.plan_status = unlocked` → invocación al endpoint interno → `plan_generation_status = generating` → `ready`.
   - Verificar que `/app/plan-interactivo` renderiza el plan y no queda en el spinner.

## Detalles técnicos

- No tocar `src/integrations/supabase/*` (auto-generados).
- El endpoint interno debe estar bajo `src/routes/api/public/*` (bypass de auth) y validar el secreto en la primera línea del handler, antes de cualquier import de `client.server`.
- El polling en `checkout.return.tsx` no necesita cambios de UI adicionales tras el fix; el mensaje "verificación pendiente" seguirá funcionando como red de seguridad.
- No se requieren cambios de esquema para Bug 1; para Bug 2 solo se añade una server route y (opcional) un secreto (`INTERNAL_TRIGGER_SECRET`) vía `add_secret`.

## Riesgos

- Si el problema real del Bug 1 no es "despliegue no aplicado" sino que producción está sirviendo una versión anterior del server function por caché de build, el `console.info` propuesto lo revelará de inmediato en el próximo intento — sin él, seguiríamos a ciegas.
- El endpoint interno debe estar firmado; publicarlo sin firma sería un vector para forzar generaciones de plan arbitrarias.
