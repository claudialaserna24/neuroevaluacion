
## Skill "Generador del Plan Interactivo NEUROPLAN"

Esta fase deja lista **la lógica de generación** del Plan Interactivo. No genera PDF, no toca Moholka, no publica nada al usuario final: solo construye el contenido y lo escribe en `neurodevelopment_roadmaps.plan_content`, marcando `plan_generation_status`.

Se respeta lo que ya existe: tablas, RLS, webhook Wompi, rutas del Plan y `getInteractivePlan`. No se recalcula nada — todos los puntajes, prioridades, hemisferio y orden de reflejos ya vienen del backend (`neurodevelopment_roadmaps` + `report-engine`).

### 1. Ubicación de la Skill

Módulo server-only nuevo: `src/lib/plan/skill/`.

- `src/lib/plan/skill/prompts.ts` — system prompt clínico + plantillas por sección.
- `src/lib/plan/skill/cerebro-query.ts` — consulta filtrada e incremental a `knowledge_documents` (CEREBRO).
- `src/lib/plan/skill/context-builder.ts` — arma el `PlanInput` a partir de paciente + roadmap + assessment (sin recalcular).
- `src/lib/plan/skill/generator.ts` — orquesta: input → consultas CEREBRO → llamada al modelo → `PlanContent` validado.
- `src/lib/plan/skill/schema.ts` — tipos y schema Zod del `PlanContent` (9 secciones).
- `src/lib/plan/skill/generate.functions.ts` — server functions expuestas.

Nada de esto se importa desde el cliente. Todo corre server-side vía `createServerFn` con `requireSupabaseAuth` (para el trigger manual del admin) y una función interna llamable desde el webhook.

### 2. Contrato del `PlanContent`

`plan_content` (jsonb ya existente en `neurodevelopment_roadmaps`) tendrá exactamente estas 9 secciones, cada una con el texto redactado por la Skill y las referencias a CEREBRO utilizadas:

1. `context` — Contexto del caso.
2. `findings` — Hallazgos de la valoración.
3. `objectives` — Objetivos del programa.
4. `instruction_cards` — Fichas de indicaciones (una por prioridad / reflejo).
5. `routine_12_weeks` — Rutina semanal de 12 semanas.
6. `follow_up` — Seguimiento.
7. `family_recommendations` — Recomendaciones para la familia.
8. `closing` — Cierre.
9. `legal_notice` — Aviso legal.

Cada sección incluye: `title`, `body` (markdown), `sources: string[]` (ids de `knowledge_documents` utilizados). Este shape ya es compatible con la vista `app.plan.$patientId.ver.tsx`.

### 3. Precondiciones (guardas duras)

La Skill solo se ejecuta si TODAS son verdad — se validan en `generator.ts` antes de la primera llamada al modelo:

- Existe `patient` del `user_id` correcto.
- Existe `assessment` con `status = 'completed'` de ese paciente.
- Existe `neurodevelopment_roadmaps` para esa evaluación.
- `roadmap.plan_status = 'unlocked'` (pago Wompi aprobado).
- `roadmap.plan_generation_status ∈ {'pending','failed'}` (evita regenerar sobre uno ya `ready` salvo forzado por admin).

Si algo falla, `plan_generation_status` no cambia y la función devuelve `{ ok: false, reason }`. Nunca escribe contenido parcial.

### 4. Máquina de estados de `plan_generation_status`

`pending` → `generating` (lock optimista) → `ready` (con `plan_content` + `plan_generated_at`) o `failed` (registrando el motivo). El cambio a `generating` se hace con un `UPDATE ... WHERE plan_generation_status IN ('pending','failed')` para evitar dobles disparos concurrentes.

### 5. Consulta filtrada a CEREBRO

`cerebro-query.ts` implementa búsqueda incremental, nunca "cargar todo":

1. Intento exacto: `module` + `subcategory` + `severity_level` + `behavioral_condition`.
2. Amplía: quita `behavioral_condition`.
3. Amplía: quita `severity_level`.
4. Amplía: solo `module` + `subcategory`.
5. Último recurso: solo `module`.

Filtros comunes: `is_active = true`, `ORDER BY version DESC`, `LIMIT` acotado (p. ej. 6 por consulta). Devuelve `{ hits: KnowledgeDoc[], matchedLevel }` para que el generador sepa qué tan específico fue el match; si no encuentra nada, se registra en la sección correspondiente como "sin material en CEREBRO para esta condición" y no se inventa.

Las consultas se lanzan por prioridad de la Hoja de Ruta y por reflejo, en el mismo orden que ya calculó el backend — la Skill no reordena.

### 6. Orquestación del generador

`generator.ts`:

1. Cargar `PlanInput` (paciente, roadmap con puntajes y prioridades, respuestas relevantes de la evaluación, equipamiento del onboarding, duración = 12 semanas).
2. Marcar `plan_generation_status = 'generating'` con lock optimista.
3. Para cada prioridad y cada reflejo (en el orden recibido), consultar CEREBRO y armar el "briefing" mínimo (fragmentos citados, no la base completa).
4. Llamar al modelo por Lovable AI Gateway (default `openai/gpt-5.5`, sin priority) con `generateText` + `Output.object(PlanContentSchema)` — schema plano, sin `min/max`, con límites solo en el prompt (siguiendo `ai-sdk-lovable-gateway`; `structuredOutputs: true` para OpenAI). Bloque `try/catch` con `NoObjectGeneratedError.isInstance` y fallback a parseo tolerante para no romper el flujo.
5. Validar shape final con Zod (9 secciones presentes, sin secciones vacías salvo que se marque "sin material en CEREBRO").
6. Guardar: `UPDATE neurodevelopment_roadmaps SET plan_content=$json, plan_generation_status='ready', plan_generated_at=now() WHERE id=$id`.
7. Errores → `plan_generation_status='failed'` con `plan_content` intacto.

Reglas dentro del prompt del sistema:
- No emitir diagnósticos.
- No inventar ejercicios, materiales, frecuencias, imágenes ni protocolos.
- Solo usar el material CEREBRO entregado en el prompt.
- Respetar orden de prioridades y reflejos recibido.
- Usar solo el equipamiento marcado por la familia.
- Lenguaje claro, cercano, profesional, para familias.

### 7. Puntos de disparo (solo lógica, sin UI nueva de usuario)

- **Automático post-pago**: en `src/routes/api/public/wompi-webhook.ts`, cuando el webhook marca `plan_status='unlocked'`, encolar la generación llamando `generateInteractivePlan` en modo `fire-and-forget` (`waitUntil` si está disponible, o `Promise.resolve().then(...)`). Si falla, queda en `failed` y se puede reintentar.
- **Reintento manual admin**: server function `regenerateInteractivePlan({ patientId })` protegida por `requireSupabaseAuth` + verificación de rol admin (`has_role`) para reintento operativo. Sin UI dedicada en esta fase; se llama desde herramientas internas.

La vista `app.plan.$patientId.tsx` ya sabe leer `plan_generation_status` (`pending` / `generating` → "Estamos preparando tu Plan"; `ready` → habilita "Ver Plan Interactivo"). No hace falta cambiarla.

### 8. Fuera de alcance en este módulo

- Generación del PDF (`plan_pdf_url` sigue vacío; el botón "Descargar PDF" ya está en estado "preparando").
- Integración conversacional de Moholka.
- Envíos por email o notificaciones.
- UI de administración para reintentos (solo la server function queda lista).

### Detalles técnicos

- **Modelo por defecto**: `openai/gpt-5.5` vía `createLovableAiGatewayProvider` con `structuredOutputs: true`. Sin priority tier.
- **Schema** en Zod: strict-compatible (todo required, `.nullable()` en opcionales, sin bounds numéricos ni enums grandes). Los límites de longitud van en el prompt, y se hace clamp en código si excede.
- **Tokens**: se envía a CEREBRO solo lo estrictamente necesario (título + `intervention_text`, no la fila completa) y solo los hits filtrados.
- **Logs**: se conserva el `X-Lovable-AIG-Run-ID` en los headers de respuesta interna para trazabilidad.
- **RLS**: el generador corre con `supabaseAdmin` cargado dentro del handler (patrón `server-side-modern`) porque debe escribir `plan_content` sin sesión del usuario en el disparo desde webhook. Antes de escribir, revalida `plan_status='unlocked'`.
- **Secrets**: usa `LOVABLE_API_KEY` ya presente. No requiere secretos nuevos.

### Archivos

**Nuevos**
- `src/lib/plan/skill/schema.ts`
- `src/lib/plan/skill/prompts.ts`
- `src/lib/plan/skill/cerebro-query.ts`
- `src/lib/plan/skill/context-builder.ts`
- `src/lib/plan/skill/generator.ts`
- `src/lib/plan/skill/generate.functions.ts`

**Modificados**
- `src/routes/api/public/wompi-webhook.ts` — al marcar `unlocked`, disparar `generateInteractivePlan` en background y dejar `plan_generation_status='generating'`.

**Sin migraciones**: todas las columnas necesarias (`plan_content`, `plan_generation_status`, `plan_generated_at`, `plan_pdf_url`) ya existen.
