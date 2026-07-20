## Causa raíz confirmada

El disparo del generador nunca se ejecuta en Cloudflare Workers: los `void fetch(...)` fire-and-forget desde `wompi-webhook.ts` y `getPaymentStatus` mueren cuando el handler devuelve la Response, antes de que el request saliente llegue a `/api/public/plan-generate`. Por eso el roadmap queda en `plan_generation_status='pending'` para siempre. `ctx.waitUntil` no está expuesto en estos handlers de TanStack.

## Solución: generación bajo demanda desde la pantalla del Plan

El disparo lo hace el cliente al aterrizar en `/app/plan/{patientId}`, dentro de un request awaited — así el isolate del Worker permanece vivo hasta que la IA termina. Sin cambios en Evaluación, Hoja de Ruta, integración Wompi ni diseño.

### 1. Migración de BD

Añadir a `neurodevelopment_roadmaps`:
- `plan_generation_status_updated_at timestamptz` — se actualiza en cada transición de `plan_generation_status`.
- `plan_generation_error text` — mensaje técnico del último fallo.

Trigger `BEFORE UPDATE`: si `plan_generation_status` cambia, setear `plan_generation_status_updated_at = now()`. Backfill inicial: `plan_generation_status_updated_at = COALESCE(plan_generated_at, updated_at, now())`.

### 2. Nueva server fn `startPlanGeneration` (en `src/lib/plan/plan.functions.ts`)

Autenticada con `requireSupabaseAuth`. Input: `{ patientId, force?: boolean }`.

Flujo:
1. Verifica que existe pago `status='paid'` del `userId` para ese paciente (RLS + doble check).
2. Lee roadmap más reciente: exige `plan_status='unlocked'`.
3. Decide según `plan_generation_status`:
   - `ready` → devuelve `{ status: 'ready' }`. Sin regeneración (idempotente). `force` se ignora salvo que el estado sea `failed` o un `generating` vencido.
   - `generating` con `plan_generation_status_updated_at` < 3 min → devuelve `{ status: 'generating' }` (otro request ya está trabajando).
   - `generating` vencido (≥ 3 min) → tratado como `failed`; permite tomar el lock.
   - `pending` o `failed` → toma lock. `force: true` sólo puede transicionar desde `failed` o `generating` vencido; nunca desde `ready` ni desde un `generating` vivo.
4. **Lock atómico** vía UPDATE condicional en un solo statement:
   ```
   UPDATE neurodevelopment_roadmaps
   SET plan_generation_status='generating',
       plan_generation_error=NULL
   WHERE id=$roadmapId
     AND plan_status='unlocked'
     AND (
       plan_generation_status IN ('pending','failed')
       OR (plan_generation_status='generating'
           AND plan_generation_status_updated_at < now() - interval '3 minutes')
     )
   RETURNING id;
   ```
   Si no devuelve filas, otro request ganó → responde `{ status: 'generating' }` sin llamar a la IA. Esto garantiza no-duplicación incluso con reintentos concurrentes del botón.
5. Con el lock tomado, `await generateInteractivePlan(patientId, { skipLock: true })` en el mismo request. Al terminar responde `{ status: 'ready' }` o `{ status: 'failed', error }`.
6. **Cualquier excepción** en el `try/catch`: UPDATE a `plan_generation_status='failed'`, `plan_generation_error = <mensaje serializado>`. Se propaga error al cliente sólo tras persistir el estado.

### 3. Ajustes a `src/lib/plan/skill/generator.ts`

- Aceptar `{ skipLock?: boolean; force?: boolean }`. Cuando `skipLock` es true, saltar `tryLock` porque ya se hizo en `startPlanGeneration`.
- Renovar `plan_generation_status_updated_at` implícitamente vía trigger.
- En el `catch`, además de marcar `failed`, guardar `plan_generation_error` con el mensaje del error (`err instanceof Error ? err.message : String(err)`), truncado.
- Mantener la escritura de `plan_content` + `plan_generation_status='ready'` + `plan_generated_at` al éxito.

### 4. UI: `src/routes/_authenticated/app.plan.$patientId.tsx`

- Al recibir data del roadmap:
  - Si `plan_generation_status ∈ {pending, failed}` **o** (`='generating'` y `plan_generation_status_updated_at` ≥ 3 min) → invocar `startPlanGeneration` una vez (guardado con `useRef` para no repetir en re-renders). En `failed` se pasa `force: true`; en `pending` no hace falta.
  - Si `='generating'` fresco → sólo polling.
- `refetchInterval` cada ~5 s mientras `plan_generation_status ∈ {pending, generating}`; detener cuando `='ready'` o `='failed'`.
- Al pasar a `ready`: botones **Abrir Plan** y **Descargar PDF** se habilitan automáticamente por el mismo re-render (sin recarga).
- Al pasar a `failed`: mostrar mensaje  
  *"No pudimos terminar de preparar tu plan. Tu pago está seguro y puedes intentar nuevamente."*  
  + botón **Reintentar generación** que llama `startPlanGeneration({ force: true })`. El botón queda deshabilitado mientras el request está en vuelo, y el propio lock atómico impide duplicados si el usuario hace doble click.

### 5. Post-pago: redirección al Plan

Verificar `src/routes/checkout.return.tsx`: cuando el polling recibe `status='paid'` y `planStatus='unlocked'`, redirigir a `/app/plan/{patientId}`. Ahí la UI dispara la generación como se describe arriba. (Este comportamiento ya existe; sólo se verifica y ajusta el `to` si fuera necesario — sin cambios de diseño.)

### 6. Limpieza de disparos muertos

- Eliminar el `void fetch('/api/public/plan-generate', …)` de `src/routes/api/public/wompi-webhook.ts` (queda sólo el marcado de `paid`/`unlocked`/`pending`).
- Eliminar el fallback `void fetch(...)` de `getPaymentStatus` en `src/lib/payments.functions.ts`.
- `src/routes/api/public/plan-generate.ts` se conserva por si un admin quiere disparar manualmente (firma HMAC ya presente), pero deja de ser parte del flujo automático.

### 7. Backfill del caso atascado

Sobre el roadmap actualmente `plan_generation_status='pending'` (roadmap `166eb525…`, pago `897e1595…` ya `paid` y `unlocked`): dejar tal cual — al abrir la pantalla, la nueva lógica lo detecta y arranca la generación automáticamente. Si se detecta que quedó en `generating` sin `updated_at`, el backfill de la migración lo pondrá con `updated_at=now()`; tras 3 min será elegible para retomarlo.

## Verificación (obligatoria al final)

1. Migración aplicada; columnas y trigger presentes; backfill OK.
2. Abrir `/app/plan/{patientId}` del caso atascado → observar transiciones `pending → generating → ready` sin recargar. Confirmar que **Abrir Plan** y **Descargar PDF** se habilitan solos.
3. Recoger logs de worker: `[plan-skill] locked → generating`, `[plan-skill] ready` (o `failed` con `plan_generation_error`).
4. Reportar al usuario: estado final del roadmap en BD, timestamps y extracto de logs.
5. Si el caso terminara en `failed`: presentar el error persistido, el mensaje visible en UI y confirmar que **Reintentar** cambia estado a `generating` nuevamente vía lock atómico (sin duplicaciones).

## Fuera de alcance

- No se modifica la Evaluación, la Hoja de Ruta, ni la integración Wompi (más allá de quitar el `fetch` huérfano ya muerto).
- No se cambia el diseño de ninguna pantalla — sólo los estados/mensajes ya definidos en la especificación previa.
- No se renombra `ready` a `completed` en el modelo de datos para no romper contratos existentes.
