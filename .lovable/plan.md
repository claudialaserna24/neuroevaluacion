## Diagnóstico

### Causa raíz confirmada: la referencia Wompi nunca se guarda en la base de datos

**Evidencia de la BD** (últimos 4 pagos, incluidos los intentos de hoy):

| id | status | wompi_reference | wompi_transaction_id | created_at == updated_at |
|---|---|---|---|---|
| 0c386dc2… | pending | **NULL** | NULL | sí |
| d65720a7… | pending | **NULL** | NULL | sí |
| 2bf6807d… | pending | **NULL** | NULL | sí |
| 00dca541… | pending | **NULL** | NULL | sí |

Los 4 pagos quedaron en `pending` con `wompi_reference = NULL`.

**Por qué:** la tabla `public.payments` tiene solo tres policies RLS: `INSERT own`, `SELECT own`, `admin SELECT`. **No existe policy de UPDATE.** En `createPendingPayment` (src/lib/payments.functions.ts:44-47) hacemos:

```ts
await supabase.from("payments").insert({ ... }).select("id").single(); // OK
const reference = `NP-${inserted.id.slice(0, 8).toUpperCase()}`;
await supabase.from("payments").update({ wompi_reference: reference }).eq("id", inserted.id); // 0 filas afectadas, sin error
```

El UPDATE se ejecuta como el usuario autenticado; RLS lo bloquea silenciosamente (Supabase no lanza error, solo devuelve 0 filas). El pago avanza al checkout de Wompi con la referencia en la URL, pero **la BD nunca la almacena**.

### Cascada resultante (explica exactamente lo que viste)

1. **Wompi:** el webhook SÍ llega y la firma SÍ valida (el código lo maneja correctamente). El evento llega con status `APPROVED`.
2. **Webhook (wompi-webhook.ts:96-104):** busca el pago con `.eq("wompi_reference", reference)`. Como `wompi_reference` es NULL en BD, `payment` es null → registra `"[wompi-webhook] payment not found <reference>"` y devuelve `ok`. **Nunca actualiza el pago ni la hoja de ruta.**
3. **Base de datos post-pago:**
   - `payments.status` = `pending` (nunca cambia)
   - `payments.wompi_transaction_id` = NULL
   - `payments.paid_at` = NULL
   - `neurodevelopment_roadmaps.plan_status` = `locked`
   - `plan_generation_status` = `pending`
   - `plan_activated_at` = NULL
4. **Skill:** **nunca se ejecuta.** El disparo `generateInteractivePlan` está dentro del bloque `if (upper === "APPROVED")`, pero antes salimos con "payment not found".
5. **Motor de generación:** no llega a consultar assessment / hoja de ruta / CEREBRO.
6. **UI `/checkout/return`:** sondea `getPaymentStatus` cada 2s hasta 20 intentos. El status se mantiene `pending`, `planStatus = locked`. A los ~40s cae al ramal `cancelled` → muestra **"Has cancelado el proceso de pago"** (que es engañoso: el pago sí se aprobó, solo que el backend nunca supo cuál era el pago).

### El "primer error real"

No hay una excepción lanzada; el fallo es un **UPDATE bloqueado por RLS que devuelve 0 filas sin error**, seguido de un mensaje `warn` en el webhook: `"[wompi-webhook] payment not found NP-XXXXXXXX"`. Ese es el mensaje técnico que provoca el fallo.

## Corrección

### 1. Eliminar el UPDATE post-insert (raíz del problema)

En `src/lib/payments.functions.ts` `createPendingPayment`:
- Generar el `id` del pago con `crypto.randomUUID()` **antes** del insert.
- Derivar `reference = 'NP-' + id.slice(0,8).toUpperCase()` con ese id.
- Insertar en una sola operación con `id` y `wompi_reference` ya presentes.
- Eliminar el UPDATE posterior.

Ventaja: los usuarios nunca necesitan permiso de UPDATE sobre `payments`; las transiciones de estado siguen siendo exclusivas del webhook vía `supabaseAdmin`. Esto es coherente con el modelo actual.

### 2. Backfill de los pagos existentes (opcional, para no perder los intentos previos)

Migración de datos (`INSERT`/`UPDATE` vía tool de datos) que rellena `wompi_reference` en los 4 pagos huérfanos aplicando la misma fórmula `NP-<id[:8].upper()>`. Así, si Wompi reintenta el webhook, se podrán conciliar.

### 3. Mejorar el mensaje de la UI cuando el sondeo agota intentos

En `src/routes/checkout.return.tsx`, el ramal `cancelled` actual dice literalmente "Has cancelado el proceso de pago". Cambiarlo por un estado neutral (por ejemplo `pending_verification`) que diga "Estamos confirmando tu pago con el banco. Recibirás la confirmación en breve" con enlaces a reintentar/refrescar. Esto evita el mensaje engañoso incluso si un webhook llega tarde.

### 4. Verificación end-to-end en Sandbox

Después de aplicar (1) y (2):
- Iniciar un checkout desde `/checkout?patient=<id>`. Confirmar que el nuevo pago quedó con `wompi_reference` **no nulo** en BD.
- Pagar con tarjeta de prueba Wompi Sandbox aprobada.
- Al volver a `/checkout/return`, verificar en BD:
  - `payments.status` → `paid`, `wompi_transaction_id` no nulo, `paid_at` con timestamp.
  - `neurodevelopment_roadmaps.plan_status` → `unlocked`, `unlocked_at` no nulo.
  - `plan_generation_status` → transiciona `pending` → `generating` → `ready` (revisar generator).
- Revisar logs con `server-function-logs` filtrando `wompi-webhook` y `plan skill` para confirmar la ejecución de la Skill.
- Confirmar la redirección automática al Plan Interactivo desde la pantalla de retorno.

### 5. Reporte final

Al terminar, entregar un reporte con:
- Causa: UPDATE bloqueado por RLS en `payments`, referencia nunca persistida.
- Fix: referencia calculada e insertada en la misma operación.
- Evidencia: fila del pago de prueba pasando de `pending` → `paid` y plan `locked` → `unlocked` → `ready`.

### Detalles técnicos

- No se modifica el esquema; no se agregan policies de UPDATE (mantenemos el principio de que solo el service role muta estados de pago).
- El webhook queda intacto: solo cambia el productor de la referencia.
- No se toca la lógica de firma ni el consumo de la API de Wompi.
- Si al ejecutar la prueba se descubre un fallo secundario en el generator (por ejemplo la Skill lanzando excepción al leer CEREBRO), se resuelve como paso adicional después de confirmar que el webhook ya llega al bloque `APPROVED`.