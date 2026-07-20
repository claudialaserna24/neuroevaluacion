## Plan Interactivo NEUROPLAN — Infraestructura

Preparo toda la estructura para el Plan Interactivo. La Skill de IA que rellenará el contenido se conecta después sin tocar frontend ni backend nuevos.

Nota importante: el proyecto no tiene una tabla `initial_reports`; la tabla equivalente que ya guarda la Hoja de Ruta y el estado `unlocked` cuando Wompi aprueba el pago es **`neurodevelopment_roadmaps`**. Se extiende esa tabla, como confirmaste.

### 1. Backend — extender `neurodevelopment_roadmaps`

Migración añadiendo columnas (todas nullables, para no romper filas existentes):

- `plan_content jsonb` — lo llenará la Skill (contexto, hallazgos, objetivos, fichas, rutina 12 semanas, recomendaciones familia).
- `plan_generation_status text` con default `'pending'` — valores: `pending | generating | ready | failed`.
- `plan_generated_at timestamptz`.
- `plan_activated_at timestamptz` — se setea cuando el webhook marca `plan_status = 'unlocked'`.
- `plan_pdf_url text` — URL del PDF personalizado (lo generará la Skill).
- `manual_pdf_url text` — URL del Manual Oficial (único, compartido).

El webhook Wompi ya deja `plan_status = 'unlocked'`; se le añade también `plan_activated_at = now()` cuando marca el pago como `paid`. No se toca ni el flujo de evaluación, ni el de pago, ni la Hoja de Ruta.

Manual Oficial: se guarda como constante `MANUAL_PDF_URL` en `src/lib/plan/constants.ts`, apuntando a un objeto del bucket privado `cerebro-assets`. Como el bucket es privado, la descarga se hace vía una server function que genera una signed URL. Cuando subas el archivo, sólo hay que actualizar la constante con el path del objeto.

### 2. Server functions nuevas — `src/lib/plan/plan.functions.ts`

Todas con `requireSupabaseAuth` y validación de que:
1. Existe `assessment` completada del `patient_id`.
2. Existe `neurodevelopment_roadmaps` para esa evaluación.
3. `plan_status = 'unlocked'` (pago aprobado).

Funciones:

- `getInteractivePlan({ patientId })` → devuelve `{ patient, roadmap, plan_content, plan_generation_status, plan_pdf_url, manual_available, activated_at }`. Si no se cumplen las condiciones, devuelve un shape `{ blocked: true, reason }` en vez de tirar 401.
- `getManualDownloadUrl()` → genera signed URL (10 min) para `MANUAL_PDF_URL` desde el bucket privado. Devuelve `{ url }` o `{ available: false }` si aún no hay archivo.
- `getPlanPdfDownloadUrl({ patientId })` → signed URL del PDF personalizado cuando `plan_pdf_url` exista; si no, `{ available: false, reason: 'preparing' }`.

Ninguna función genera PDFs ni contenido — sólo lee y firma URLs.

### 3. Frontend — nuevas rutas

Todas bajo `_authenticated/`, con guardia interna (llaman a `getInteractivePlan`; si `blocked` redirigen o muestran mensaje).

- `src/routes/_authenticated/app.plan.$patientId.tsx` — vista principal del Plan Interactivo (dashboard con las 4 tarjetas).
- `src/routes/_authenticated/app.plan.$patientId.ver.tsx` — "Ver Plan Interactivo" (render del `plan_content` cuando exista; estado "preparando" mientras no).

Layout de estas rutas: comparten un shell con el botón flotante de Moholka en la esquina inferior derecha.

#### Encabezado
Nombre del niño, fecha de activación (`plan_activated_at`), badge de estado. Estado visible:
- `plan_generation_status === 'ready'` → **Plan Activo**.
- Otros → **Preparando tu Plan**, con el mensaje "Estamos preparando tu Plan Interactivo NEUROPLAN…".

#### Cuatro tarjetas
1. **Ver Plan Interactivo** → botón "Abrir Plan" → navega a `app.plan.$patientId.ver`. Si `plan_content` no está listo, la vista destino muestra la pantalla de preparación.
2. **Descargar Plan en PDF** → botón "Descargar PDF". Llama `getPlanPdfDownloadUrl`. Si no está listo, botón deshabilitado con leyenda "Disponible al finalizar la generación".
3. **Manual Oficial de Ejercicios NEUROPLAN** → texto institucional + botón "Descargar Manual" que llama `getManualDownloadUrl` y abre la signed URL en nueva pestaña. Si aún no hay archivo, botón deshabilitado con "Próximamente".
4. **Moholka** → texto de acompañamiento 4 semanas + botón "Hablar con Moholka" que abre el mismo panel lateral del botón flotante.

#### Botón flotante Moholka
Componente `src/components/plan/MoholkaFloatingButton.tsx`. Fixed bottom-right, texto "💬 Recuerda que estoy aquí para ayudarte". Abre `Sheet` lateral (shadcn) con el mensaje: *"Moholka estará disponible cuando el Plan Interactivo haya sido generado."* Sin integración de IA. Se monta sólo en las rutas del Plan Interactivo.

### 4. Entrada desde el Dashboard

En `app.index.tsx` (dispatcher por estado): cuando el paciente tiene `plan_status = 'unlocked'`, la tarjeta principal ahora enlaza a `/app/plan/$patientId` (hoy va a la Hoja de Ruta). Se conserva el acceso a la Hoja de Ruta como enlace secundario.

En `checkout.return.tsx`, cuando el pago queda confirmado, el CTA "Ir a mi Plan" apunta a `/app/plan/$patientId` en lugar de al informe.

### 5. Seguridad

- RLS de `neurodevelopment_roadmaps` ya limita a `auth.uid()`. Las nuevas columnas heredan la misma política.
- Las server functions vuelven a validar en handler: evaluación completada + roadmap + `plan_status='unlocked'`. Sin las 3, respuesta `blocked`.
- Signed URLs cortas (10 min) para el Manual y el PDF personalizado. El bucket sigue privado.
- Ni el `plan_content` ni las URLs se exponen a rutas públicas.

### 6. Integración futura con la Skill

Contrato ya listo: la Skill sólo tiene que hacer un `UPDATE` en `neurodevelopment_roadmaps` fijando `plan_content` (jsonb con secciones: `context`, `findings`, `objectives`, `instruction_cards`, `routine_12_weeks`, `family_recommendations`), `plan_pdf_url`, `plan_generation_status='ready'`, `plan_generated_at=now()`. El frontend detecta automáticamente el cambio en el próximo fetch — sin cambios de código.

### 7. Validaciones finales

- Flujo pago aprobado → `plan_status='unlocked'` + `plan_activated_at` → acceso al Plan.
- Dashboard del padre lleva a la nueva vista.
- Las 4 tarjetas visibles y conectadas (Abrir Plan navega; Descargar PDF preparado; Manual con signed URL; Moholka abre panel).
- Botón flotante presente en `app.plan.*`.
- Sin pago, sin roadmap o sin evaluación → mensaje bloqueante y redirección.

### Archivos

**Nuevos**
- `src/lib/plan/constants.ts`
- `src/lib/plan/plan.functions.ts`
- `src/components/plan/MoholkaFloatingButton.tsx`
- `src/components/plan/MoholkaPanel.tsx`
- `src/routes/_authenticated/app.plan.$patientId.tsx`
- `src/routes/_authenticated/app.plan.$patientId.ver.tsx`

**Modificados**
- `src/routes/api/public/wompi-webhook.ts` — setear `plan_activated_at` junto con `plan_status='unlocked'`.
- `src/routes/_authenticated/app.index.tsx` — enlazar a `/app/plan/$patientId` cuando esté desbloqueado.
- `src/routes/checkout.return.tsx` — CTA post-pago hacia el Plan.

**Migración**
- Añadir columnas `plan_content`, `plan_generation_status`, `plan_generated_at`, `plan_activated_at`, `plan_pdf_url`, `manual_pdf_url` a `neurodevelopment_roadmaps`.
