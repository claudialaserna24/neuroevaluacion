
## Objetivo

Convertir el panel actual de Moholka (hoy es solo un placeholder informativo) en un asistente conversacional funcional, integrado en toda la sección del Plan Interactivo, con memoria por paciente y contexto limitado a las fuentes autorizadas.

No se toca: evaluación, Hoja de Ruta, generación del Plan, pagos, ni la Skill del Plan.

## Alcance funcional

- Botón flotante 🤖 Moholka visible en `/app/plan/$patientId` y `/app/plan/$patientId/ver`, solo cuando `plan_status = 'unlocked'` (ya está el gating en `getInteractivePlan`).
- Al hacer clic abre un Drawer lateral (Sheet ya existente) sin abandonar la página.
- Mensaje inicial + 3 accesos rápidos (chips) predefinidos.
- Streaming de respuestas token a token.
- Historial persistente por (usuario, paciente, roadmap). Al reabrir, continúa la conversación.
- Cuando la respuesta menciona ejecutar un ejercicio, la UI muestra un botón "📘 Ver Manual Oficial de Ejercicios" que reutiliza `getManualDownloadUrl`.
- Preguntas fuera de alcance → respuesta exacta definida.

## Backend

### 1. Base de datos (una migración)

Dos tablas nuevas en `public`, con GRANTs y RLS (dueño = padre del paciente; admin lee todo).

```
moholka_conversations
  id uuid pk
  user_id uuid  (auth.users)
  patient_id uuid → patients(id)
  roadmap_id uuid → neurodevelopment_roadmaps(id)
  created_at, updated_at
  unique (patient_id)   -- una conversación por paciente

moholka_messages
  id uuid pk
  conversation_id uuid → moholka_conversations(id) on delete cascade
  role text check in ('user','assistant')
  content text
  created_at
```

Policies:
- `authenticated` SELECT/INSERT/UPDATE sus filas (JOIN por `patients.user_id = auth.uid()`).
- `administrador` (vía `has_role`) SELECT en ambas tablas → habilita consulta desde el CRM.
- GRANTs correspondientes; trigger `touch_updated_at` en `conversations`.

### 2. Server functions (nuevo archivo `src/lib/plan/moholka.functions.ts`)

Todas con `requireSupabaseAuth` + validación de ownership del paciente + `plan_status = 'unlocked'` (reutiliza `assertUnlocked`).

- `getMoholkaHistory({ patientId })` — devuelve últimos ~40 mensajes de la conversación (crea la conversación si no existe).
- `sendMoholkaMessage({ patientId, message })` — server route de streaming, no server function (necesita `Response` streaming). Se implementa como server route.

### 3. Server route de chat: `src/routes/api/moholka.ts`

- Método POST. Autenticación manual con el bearer (mismo patrón que webhook seguro) o vía middleware.
- Valida ownership + `plan_status = 'unlocked'`.
- Persiste el mensaje del usuario, construye el contexto y llama al AI Gateway con `streamText`, `openai/gpt-5.5`, provider reutilizando `createLovableAiGatewayProvider` de `src/lib/ai-gateway.server.ts`.
- En `onFinish` guarda el mensaje del asistente.
- Devuelve `toUIMessageStreamResponse` con headers `X-Lovable-AIG-*`.

### 4. Construcción de contexto acotado

Helper `buildMoholkaContext(supabase, patientId, userMessage)` que arma un prompt compacto:

1. Identidad y reglas (system prompt fijo con toda la sección "Identidad / Alcance / Restricciones / Preguntas fuera de alcance / respuesta literal").
2. Datos mínimos del paciente (nombre, edad, diagnóstico, motivo — desde `patients`).
3. **Fragmento del Plan Interactivo**: NO enviar `plan_content` completo. Extraer solo:
   - `context.intro` + `findings.body` (siempre).
   - Selección heurística por keyword: si el `userMessage` matchea el `name` de una `instruction_card`, incluir esa ficha entera; si menciona semana / rutina, incluir el bloque de `routine_12_weeks`; si menciona seguimiento, `weekly_tracking.rows`; si menciona familia, `family_recommendations`. Si no matchea nada, incluir listado de nombres de fichas para que Moholka pida precisión.
4. **Hoja de Ruta**: `neurodevelopment_roadmaps.summary` / prioridades (campo corto ya existente en el registro).
5. **CEREBRO**: reutilizar `queryCerebro` de `src/lib/plan/skill/cerebro-query.ts` con módulo derivado del match (reflejos / cognitivo / funcional) y `formatCerebroForPrompt` para incrustar 3–6 fragmentos.
6. **Historial reciente**: últimos 8 mensajes de `moholka_messages` (convertidos a `UIMessage[]`).
7. Mención del Manual como recurso (no como link — la UI decide mostrar el botón).

Reglas del prompt:
- Responder solo desde el contexto entregado. Si la pregunta no se puede responder con esas fuentes, devolver la frase literal: *"Ese tema está fuera de mi alcance. Mi función es ayudarte a comprender y aplicar el Plan Interactivo NEUROPLAN."*
- Prohibiciones explícitas (diagnósticos, medicamentos, modificar plan, inventar ejercicios).
- Firmar siempre como Moholka; nunca revelar el modelo subyacente.

### 5. Detección de "menciona ejercicio" para el botón del Manual

El server route agrega, tras `onFinish`, un flag simple: si el texto del asistente incluye el nombre de alguna `instruction_card` (comparación case-insensitive), emite un data-part `{ type: "data-manual", value: true }` en el stream de UI. La UI lo lee y muestra el botón bajo ese mensaje.

## Frontend

### 1. Reescribir `src/components/plan/MoholkaPanel.tsx`

- Usa `@ai-sdk/react` `useChat` con `DefaultChatTransport({ api: "/api/moholka", body: { patientId } })`, `id = patientId` para keying/reset por paciente.
- Al montar por primera vez: carga historial con `getMoholkaHistory` y lo pasa como `messages` inicial.
- Composición con AI Elements (instalar solo lo necesario):
  - `Conversation` / `ConversationContent` / `ConversationScrollButton`.
  - `Message` / `MessageContent` / `MessageResponse` para render markdown streaming.
  - `PromptInput` / `PromptInputTextarea` / `PromptInputFooter` / `PromptInputSubmit`.
  - `Shimmer` "Pensando..." mientras `status === 'submitted'`.
- Mensaje inicial se renderiza como un `Message` de rol `assistant` sintético cuando el historial está vacío, con 3 chips-botón:
  - "📘 ¿Cómo empiezo el Plan?"
  - "🧠 Explícame esta ficha."
  - "📅 ¿Cómo organizo la rutina?"
  - Al hacer clic → `sendMessage({ text: chip })`.
- Bajo cada mensaje del asistente que traiga el data-part `data-manual`, renderiza botón "📘 Ver Manual Oficial de Ejercicios" que llama al `useServerFn(getManualDownloadUrl)` y abre en pestaña nueva.
- Estilos: tokens semánticos existentes; assistant sin background, user bubble con `bg-primary/10 text-foreground`.
- Textarea con focus por defecto y al abrir el Sheet.

### 2. `MoholkaFloatingButton.tsx`

- Ya existe. Ajustes:
  - Texto: mostrar "🤖 Moholka" (icono + label) en todos los tamaños.
  - Recibe `patientId` y solo se renderiza cuando `ready = true` (Plan generado) — mismo comportamiento actual (`ready` se pasa desde el dashboard y desde el visor).
  - El botón sigue disponible en ambas rutas del plan (ya está incluido en `.tsx` y hay que agregarlo/verificarlo en `.ver.tsx`).
- Pasa `patientId` al `MoholkaPanel`.

### 3. Sustituir logo de identidad

- Mantener `Bot` de lucide en header del Sheet es OK como control secundario; no se cambia branding — pero para el mensaje inicial usar el nombre/paleta ya definidos en `BRAND.moholka`.

## CRM del administrador

- Sección nueva mínima en `/app/admin/moholka` (o extender `app.pacientes.$patientId.tsx`): lista de conversaciones con nombre del paciente + último mensaje. Vista de detalle read-only. RLS ya deja al admin leer todo. **Opcional en esta fase; si se prioriza, marcarlo como out-of-scope para envío rápido**.

Decisión propuesta: incluir vista read-only simple en el detalle del paciente admin, no ruta nueva.

## Validaciones automáticas (post-implementación)

- Sin plan desbloqueado → `MoholkaFloatingButton` no aparece (el dashboard ya redirige antes).
- Enviar mensaje sin ownership del paciente → 401/403 del route.
- Historial persiste entre recargas (probar con dos mensajes → refresh → siguen).
- Pregunta fuera de alcance ("¿qué medicamento le doy?") → devuelve la frase literal.
- Pregunta que nombra una ficha → aparece el botón del Manual bajo la respuesta y abre PDF en pestaña.
- Typecheck (`tsgo`) verde.

## Detalles técnicos clave

- Modelo: `openai/gpt-5.5` vía `createLovableAiGatewayProvider`. Streaming con `streamText` + `toUIMessageStreamResponse({ originalMessages, onFinish })`.
- Tokens: contexto ~ system(≈1k) + paciente(≈150) + fragmento del Plan(≈800 máx) + Hoja de Ruta(≈300) + CEREBRO 4 hits(≈600) + historial 8 msgs. Muy por debajo del límite.
- Server route usa autenticación por bearer (mismo patrón de rutas `_authenticated`); si es más simple, se implementa como `createServerFn` streaming solo si el runtime lo permite — en caso contrario se queda como server route bajo `src/routes/api/moholka.ts` (NO `api/public/`, requiere auth).
- `useChat` con `id: patientId` remonta la conversación al cambiar de paciente.
- Nada de guardar reasoning; solo `role` + `content` texto.

## Fuera de alcance

- Voz / audio.
- Notificaciones push semanales.
- Adjuntar imágenes.
- Traducción multilenguaje.
- Panel de administración con búsqueda global (queda una vista básica read-only por paciente).
