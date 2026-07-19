# NEUROPLAN — Fase 2: Estados 1–3 del Padre / Acudiente (revisado)

## Novedades de esta revisión
- **Definición oficial de Moholka** incorporada al proyecto: *asistente especializado de inteligencia artificial en neurodesarrollo*. Este texto se guarda en un archivo de copy central (`src/lib/brand-copy.ts`) para reutilizarlo en toda la app (aunque Moholka NO aparece aún en Fase 2 — la definición queda lista para Fase 3 y para textos legales / informativos).
- **Consentimiento HABEAS DATA obligatorio** antes de iniciar la evaluación. La política se redacta ahora (ver Apéndice A al final) siguiendo la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia. Sin aceptación no se puede iniciar/continuar la evaluación.

## Contenido clínico confirmado

- **Módulo 1 — Perfil Cognitivo**: 197 preguntas (99 HD + 98 HI), 7 categorías, escala Siempre/Algunas veces/Nunca (1/1/0). Niveles: 0–50 Leve, 51–99 Moderado, 100+ Alto. Lateralización HD vs HI.
- **Módulo 2 — Evaluación Funcional**: 80 preguntas (10×8 áreas), escala 1–10. Niveles por %: ≤25 Leve, ≤50 Moderado, ≤75 Alto, ≤100 Muy Alto.
- **Módulo 3 — Reflejos Primitivos**: 90 preguntas (10×9 reflejos), escala 0–4 (máx 40). Niveles: ≤10 Baja, ≤20 Moderada, ≤30 Alta, ≤40 Muy Alta.
- **Motor de integración** para "Principales prioridades identificadas": áreas Alto/Muy Alto + reflejos Alta/Muy Alta (fallback: mayor %), con nivel general y hemisferio como contexto.

## Alcance de esta fase

Estados 1–3 del menú del padre (Inicio, Mi Evaluación, Informe Inicial "Hoja de Ruta", Mi Perfil), consentimiento HABEAS DATA y persistencia del mismo. Moholka, Plan Interactivo, Membresía y Agendar quedan para Fase 3.

## 1. Backend — Lovable Cloud

Activar Lovable Cloud. Migración con enum + tablas + GRANTs + RLS:

- Enum `app_role` (`usuario`, `administrador`).
- `profiles` (id ↔ auth.users, full_name, child_name, child_dob).
- `user_roles` + función `has_role(uuid, app_role)` SECURITY DEFINER.
- `assessment_questions` — 367 preguntas semilla (id, module, dimension, category, order_index, title, scale).
- `assessments` — sesión (user_id, status, current_module, current_question_id).
- `assessment_answers` — respuestas con unique(assessment_id, question_id) para upsert.
- `initial_reports` — snapshot al completar.
- **`user_consents`** — nueva tabla: `user_id`, `policy_kind ('habeas_data')`, `policy_version`, `accepted_at`, `ip_hash`, `user_agent`. RLS: el usuario solo ve/inserta los suyos. La versión de política vive en `src/lib/legal/habeas-data.ts` (const `HABEAS_DATA_VERSION = "2026-07-19"`); si cambia, se vuelve a solicitar aceptación.

Server functions (`requireSupabaseAuth`):
- `getOrCreateAssessment`, `saveAnswer`, `completeAssessment`, `getReport`.
- **`getConsentStatus`** y **`acceptHabeasData({ version })`** → inserta fila en `user_consents`.

Auth email + Google reemplaza el mock de Fase 1.

## 2. Rutas y layout autenticado

```
src/routes/_authenticated/
  route.tsx          (managed)
  app.tsx            layout (bottom-nav móvil / sidebar desktop, dinámico)
  app.index.tsx      🏠 Inicio
  app.evaluacion.tsx 📝 Mi Evaluación
  app.informe.tsx    📄 Informe Inicial
  app.perfil.tsx     👤 Mi Perfil
```

Hook `useUserState()` deriva estado 1/2/3 desde `assessments` + `initial_reports`. `/app/informe` visible solo con `status='completed'`.

## 3. Dashboard Inicio

- Estado 1: CTA "Comenzar mi evaluación".
- Estado 2: "Continúa donde quedaste — módulo X, pregunta Y/367" + progreso.
- Estado 3: "Tu Hoja de Ruta está lista" con resumen breve.

## 4. Consentimiento HABEAS DATA (gate previo a la evaluación)

Componente `HabeasDataGate` que envuelve `/app/evaluacion`:
- Al entrar, `getConsentStatus` decide:
  - Si existe consentimiento con `policy_version` actual → muestra `EvaluationRunner`.
  - Si no → **Modal a pantalla completa en móvil** (`Dialog` de shadcn), no descartable, con:
    - Título: "Autorización para el tratamiento de datos personales (HABEAS DATA)".
    - Subtítulo corto explicando el propósito.
    - Cuerpo con scroll que muestra la política completa (Apéndice A).
    - Dos checkboxes obligatorios:
      1. "He leído y acepto la Política de Tratamiento de Datos Personales."
      2. "Autorizo expresamente el tratamiento de los datos sensibles de mi hijo/a con fines de evaluación orientadora del neurodesarrollo."
    - Botón secundario "No acepto" → cierra sesión / vuelve a `/app`.
    - Botón principal "Acepto y continuar" (deshabilitado hasta marcar ambos) → llama `acceptHabeasData({ version })` y desbloquea la evaluación.
- La aceptación se registra con timestamp, versión de política y user_agent. Se puede revocar desde "Mi Perfil" (botón "Retirar mi autorización" con confirmación → borra `initial_reports`/`assessment_answers` del usuario y cierra sesión, en línea con el derecho de supresión).

En "Mi Perfil" se agregan enlaces siempre visibles a:
- Política de Tratamiento de Datos (renderiza la misma política de la ley).
- Estado de mi autorización (fecha y versión aceptadas).
- Derechos ARCO-S (Acceso, Rectificación, Cancelación, Oposición, Supresión) con instrucciones de contacto.

## 5. Evaluación tipo Typeform

`EvaluationRunner` — una pregunta por pantalla, controles por escala (`cog3`/`func10`/`reflex5`), autoguardado por respuesta, retoma en `current_question_id`, separadores entre módulos, mobile-first, teclado accesible. Solo se monta si el gate HABEAS DATA aprobó.

## 6. Motor de reglas (sin IA)

`src/lib/report-engine.ts`: funciones puras `computeCognitive`, `computeFunctional`, `computeReflexes`, `computePriorities`. Copy en `src/lib/report-copy.ts`.

## 7. Informe Inicial — "Hoja de Ruta para el Neurodesarrollo"

Vista web + descarga PDF con `@react-pdf/renderer`. Secciones:
1. Portada.
2. Perfil Cognitivo (puntajes + nivel + lateralización).
3. Evaluación Funcional (8 áreas ordenadas por %, barras + textos).
4. Reflejos Primitivos (9 reflejos ordenados desc, badges + textos).
5. Principales prioridades identificadas.
6. Nota aclaratoria obligatoria (orientadora, no diagnóstica).
7. **CTA de cierre "Continúa con tu Plan Interactivo Personalizado"** (componente `ReportUnlockCta`, mismo bloque en web y PDF):
   - Copy exacto acordado: "La Hoja de Ruta para el Neurodesarrollo te permitió comprender las principales necesidades…"
   - "¿Qué encontrarás en tu Plan Interactivo Personalizado?" + lista de 10 elementos (orden de intervención, objetivos por etapa, actividades por reflejo y área funcional, explicación paso a paso, frecuencia semanal, tiempo aproximado, recomendaciones de participación, recursos complementarios, acompañamiento de **Moholka — asistente especializado de IA en neurodesarrollo** durante las primeras semanas, recomendación de valoración profesional ante señales de alerta).
   - Bloque **Importante** aclarando propósito orientador y educativo.
   - Cierre "Da el siguiente paso en el acompañamiento de tu hijo".
   - Botón principal "Desbloquear mi Plan Interactivo" (mock: toast "Disponible próximamente"; se conectará en Fase 3).
   - Botón secundario "Conocer todo lo que incluye" (ancla/modal con el detalle expandido).

Todo el copy vive en `src/lib/report-copy.ts`.

## 8. Componentes reutilizables

- `components/app/app-shell.tsx`, `progress-bar.tsx`.
- `components/evaluation/question-cog3.tsx` / `question-func10.tsx` / `question-reflex5.tsx`.
- `components/report/report-view.tsx`, `report-pdf.tsx`, `report-unlock-cta.tsx`.
- **`components/legal/habeas-data-gate.tsx`** y **`components/legal/policy-viewer.tsx`**.
- `src/lib/brand-copy.ts` (definición canónica de NEUROPLAN y de Moholka).
- `src/lib/legal/habeas-data.ts` (versión + contenido de la política).
- `hooks/use-user-state.ts`, `hooks/use-consent.ts`.

## 9. Verificación

- Build sin errores; 367 preguntas sembradas.
- Sin consentimiento válido, `/app/evaluacion` muestra el modal HABEAS DATA y bloquea la evaluación.
- Al aceptar, se crea fila en `user_consents` con `policy_version` y timestamp; al reingresar no se vuelve a pedir mientras la versión no cambie.
- "Retirar autorización" en Mi Perfil borra respuestas + informe del usuario y cierra sesión.
- Autoguardado + retomar; motor con casos frontera; PDF con las 7 secciones (incl. CTA final).
- Copy central usa la definición "Moholka — asistente especializado de IA en neurodesarrollo" en todos los lugares donde se la menciona (aunque el chat de Moholka aún no exista).

## Fuera de alcance (Fase 3)

Pago, generación del Plan Interactivo, chat de Moholka, Membresía, Comunidad, Agendar Valoración, panel del administrador (CEREBRO CRM).

---

## Apéndice A — Política de Tratamiento de Datos Personales (HABEAS DATA)

Contenido base que se guardará en `src/lib/legal/habeas-data.ts` y se mostrará dentro del modal y en la página pública de la política. Marco: **Ley 1581 de 2012**, **Decreto 1377 de 2013** y demás normas concordantes de la República de Colombia sobre protección de datos personales, incluyendo el tratamiento de **datos sensibles** relacionados con la salud y el neurodesarrollo de menores de edad.

**1. Responsable del tratamiento.**
NEUROPLAN, plataforma operada por [Razón social del neuropsicólogo administrador — a completar], con domicilio en [ciudad, país], correo de contacto para asuntos de datos personales: [correo].

**2. Definición de Moholka.**
Moholka es el asistente especializado de inteligencia artificial en neurodesarrollo integrado en NEUROPLAN. Moholka acompaña y orienta a las familias durante el uso del Plan Interactivo Personalizado; **no reemplaza el criterio clínico** de un profesional y no realiza diagnósticos.

**3. Datos que se recogen.**
(a) Datos de identificación del padre/madre/acudiente: nombre, correo electrónico, contraseña cifrada.
(b) Datos del niño/a: nombre, fecha de nacimiento. La cuenta es siempre gestionada por el adulto responsable.
(c) **Datos sensibles** relativos a la salud y desarrollo del niño/a: respuestas a los cuestionarios de Perfil Cognitivo, Evaluación Funcional y Reflejos Primitivos, y los puntajes y niveles derivados.
(d) Datos técnicos: dirección IP, dispositivo y navegador para seguridad y auditoría del consentimiento.

**4. Finalidades del tratamiento.**
(a) Prestar el servicio de evaluación orientadora y generar la Hoja de Ruta para el Neurodesarrollo.
(b) Generar, cuando el usuario lo desbloquee, el Plan Interactivo Personalizado y ofrecer acompañamiento por parte de Moholka.
(c) Permitir al usuario retomar la evaluación desde el último punto guardado.
(d) Cumplir obligaciones legales, contables y de seguridad de la información.
(e) Realizar análisis internos anónimos y agregados para mejorar la plataforma. Nunca se comercializan los datos.

**5. Autorización expresa para datos sensibles.**
Por tratarse de datos sensibles de un menor de edad, el padre/madre/acudiente autoriza expresamente su tratamiento con las finalidades del numeral 4. El usuario no está obligado a autorizarlo, pero sin la autorización no es posible realizar la evaluación ni generar la Hoja de Ruta.

**6. Derechos del titular (y de su representante legal).**
Conforme al artículo 8 de la Ley 1581 de 2012, el titular —o el padre/madre/acudiente en representación del menor— puede en cualquier momento:
(a) **Acceder** a sus datos personales.
(b) **Rectificar** información inexacta o incompleta.
(c) **Actualizar** los datos.
(d) **Suprimir** los datos cuando el tratamiento no se ajuste a la ley o cuando se revoque la autorización.
(e) **Revocar la autorización** otorgada.
(f) Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) de Colombia.

Estos derechos se ejercen desde "Mi Perfil > Retirar mi autorización" dentro de la aplicación, o escribiendo a [correo]. NEUROPLAN atenderá la solicitud en los términos legales (15 días hábiles, prorrogables hasta 8 días adicionales).

**7. Conservación y supresión.**
Los datos se conservan mientras exista la cuenta y la autorización esté vigente. Al retirar la autorización o eliminar la cuenta, las respuestas de evaluación y el informe se eliminan de forma permanente en un plazo máximo de 30 días, salvo obligación legal en contrario.

**8. Medidas de seguridad.**
La información se transmite bajo cifrado TLS y se almacena en la infraestructura de Lovable Cloud con controles de acceso por usuario (Row Level Security). Las contraseñas nunca se almacenan en texto plano.

**9. Transferencias y encargados.**
NEUROPLAN utiliza como encargados de tratamiento a proveedores de infraestructura (Lovable Cloud / Supabase) y de autenticación (Google, cuando el usuario elige "Continuar con Google"), que ofrecen niveles de seguridad adecuados. No se realizan transferencias a terceros con fines comerciales.

**10. Menores de edad.**
El tratamiento de datos de menores se realiza únicamente con el consentimiento previo, expreso e informado del padre/madre/acudiente, respetando el interés superior del menor y sus derechos fundamentales.

**11. Uso de inteligencia artificial.**
Durante la evaluación y la generación de la Hoja de Ruta **no se utiliza IA**. La IA (Moholka) interviene únicamente después de que el usuario desbloquea el Plan Interactivo Personalizado, exclusivamente con fines orientadores. En ningún caso Moholka emite diagnósticos ni reemplaza la valoración clínica profesional.

**12. Vigencia y cambios.**
Esta política rige desde su fecha de publicación (versión `HABEAS_DATA_VERSION`). Cualquier cambio sustancial se notificará al usuario y se solicitará nueva aceptación antes de continuar utilizando la evaluación.

**Al marcar las casillas y presionar "Acepto y continuar", el padre/madre/acudiente declara que ha leído, comprendido y aceptado esta Política, y que autoriza expresamente el tratamiento de los datos sensibles del menor con las finalidades aquí descritas.**

---

Aprueba este plan para pasar a build mode y empezar la implementación.