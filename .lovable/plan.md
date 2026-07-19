# Cargar el contenido clínico real de la evaluación

Reemplazar los 367 placeholders de `assessment_questions` por las preguntas exactas que enviaste, y ajustar la app para que refleje la clasificación, la escala y las categorías de tus documentos.

## Alcance

- Perfil Cognitivo: 197 preguntas (99 hemisferio derecho + 98 izquierdo), organizadas por 7 categorías (Motoras, Sensoriales, Emocionales, Conductuales, Sociales, Académicas, Inmunes, Autonómicas).
- Evaluación Funcional: 80 preguntas en 8 áreas (Vestibular, Auditiva, Visual, Propioceptiva, Táctil Hipo, Táctil Hiper, Olfativa Hiper, Olfativa Hipo).
- Reflejos Primitivos: 90 preguntas en **9 reflejos** — Parálisis del Miedo, Moro, TLR, Galant, ATNR, STNR, Búsqueda y Succión, Palmar, Babinski (Hocico queda fuera, según tu decisión).
- Se mantiene la etiqueta "Alto" en el nivel cognitivo (no se cambia a "Grave").

## Cómo se almacenan las preguntas

Cada pregunta llevará:

- `module`: `cognitive` · `functional` · `reflex`
- `dimension`: nombre exacto de la agrupación mostrada al padre — para cognitivo será `"Hemisferio derecho"` o `"Hemisferio izquierdo"`; para funcional el área (`"Vestibular"`, `"Auditiva"`…); para reflejos el reflejo (`"Moro"`, `"TLR"`…).
- `category`: la sub-categoría dentro del módulo cognitivo (Motoras, Sensoriales, Emocionales, Conductuales, Sociales, Académicas, Inmunes, Autonómicas). En Funcional y Reflejos queda `null`.
- `title`: el enunciado corto en negrita del documento.
- `order_index`: 1..N por módulo, en el orden exacto del documento.
- `scale`: `cog3` (Siempre/Algunas veces/Nunca), `func10` (1–10), `reflex5` (0–4).

## Cambios técnicos

### 1. Migración de base de datos (una sola)

- `TRUNCATE public.assessment_questions RESTART IDENTITY CASCADE;` (borra respuestas huérfanas de las pruebas de placeholders).
- `INSERT` masivo de las 367 filas reales con los enunciados literales del documento.

### 2. Evaluación (`src/routes/_authenticated/app.evaluacion.tsx`)

- Opciones de la escala `cog3`: **Siempre = 1, Algunas veces = 1, Nunca = 0** (según la regla del documento). Se muestran 3 botones ("Siempre", "Algunas veces", "Nunca").
- Escala `func10` se mantiene 1–10 y `reflex5` 0–4.
- Encabezado del módulo pasa a mostrar la `dimension` (p.ej. "Perfil Cognitivo · Hemisferio derecho · Motoras") para dar contexto al padre.

### 3. Motor de reglas (`src/lib/report-engine.ts`)

- Cognitivo: sigue con niveles Leve (0–50) / Moderado (51–99) / **Alto** (100+) y calcula puntaje derecho vs. izquierdo a partir de `dimension`.
- Funcional: se conserva puntaje por área + porcentaje sobre el máximo (10×preguntas) y ranking descendente, como lo pide el documento.
- Reflejos: niveles Baja (0–10) / Moderada (11–20) / Alta (21–30) / Muy Alta (31–40), independientes por reflejo.

### 4. Hoja de Ruta (`app.informe.tsx`)

- Renombrar bloques a los nombres que trae tu documento: "Perfil cognitivo por hemisferio", "Áreas funcionales priorizadas", "Reflejos primitivos priorizados".
- Añadir el aviso obligatorio del documento de reflejos ("Los resultados constituyen una orientación… no representan un diagnóstico…") en la sección de reflejos y en el pie del informe.
- Mantener el CTA "Desbloquear mi Plan Interactivo" / "Conocer todo lo que incluye".

### 5. `saveAnswer`

- Validador aceptará `value` entre 0 y 10 (cubre las tres escalas). Sin cambio funcional.

## Fuera de alcance de este paso

- No se cambia la Fase (seguimos en Estados 1–3 del menú del padre).
- No se conecta pago real ni Moholka (llega en Fase 3).
- Hocico (Snout) queda fuera; si más adelante lo quieres agregar, será una migración separada de 10 preguntas.

## Verificación

- `SELECT module, count(*) FROM assessment_questions GROUP BY module;` debe devolver `cognitive=197, functional=80, reflex=90`.
- Recorrer 3 preguntas en la UI (una por módulo) y confirmar que el enunciado coincide con el documento.
- Completar la evaluación con respuestas de prueba y revisar la Hoja de Ruta: hemisferios, ranking de áreas y ranking de reflejos.
