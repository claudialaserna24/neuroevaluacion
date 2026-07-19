## Objetivo
Reemplazar las preguntas de **Perfil Cognitivo** (197) y **Evaluación Funcional** (80) usando los .docx unificados. Cada pregunta se guarda como un único bloque; la UI resalta la etiqueta (texto antes de los dos puntos) en negrilla y la explicación en tono normal, todo en el mismo párrafo.

## Pasos

1. **Extracción** — Script Python parsea los dos .docx: por cada párrafo que empieza con `N.`, quito el prefijo numérico y conservo el texto completo `Etiqueta: explicación` como un solo string. También detecto la categoría/dimensión (encabezados como "Vestibular", "Motoras", etc.) y el hemisferio ("Hemisferio Derecho/Izquierdo") para mapear a `dimension`/`category`. Verifico totales: 99 HD + 98 HI = 197 cognitivo, 8×10 = 80 funcional.

2. **Migración de datos** (`supabase--insert`, sin cambios de esquema):
   - Para cada pregunta existente de módulos `cognitive` y `functional`, hago `UPDATE assessment_questions SET title = <texto unificado>, description = NULL WHERE module = ... AND order_index = ...`.
   - No toco el módulo `reflex`.
   - No cambio ids ni `order_index`, así se preservan las respuestas ya guardadas.

3. **UI — `src/routes/_authenticated/app.evaluacion.tsx`**:
   - Nuevo helper `renderQuestionText(title)`: parte el texto en el primer `": "`; si hay match, renderiza `<strong>etiqueta</strong>: resto` dentro de un mismo `<p>`; si no, muestra el texto tal cual.
   - Reemplazo el `<p>` del título (serif) y elimino el `<p>` de descripción. Un solo bloque en tipografía serif, con la etiqueta en negrilla y la explicación en peso normal, misma línea/párrafo.
   - Mantengo tamaño y layout actuales.

4. **Verificación** — Playwright headless: abrir `/app/evaluacion`, tomar screenshot de las primeras 2 preguntas de cognitivo y de funcional; confirmar visualmente que la etiqueta aparece en negrilla y la explicación continúa en el mismo párrafo. Consultar por SQL que ninguna pregunta cognitiva/funcional quedó con `description` no-nulo y que `title` contiene `": "`.

## Notas técnicas
- No hay cambios de esquema: la columna `description` queda existente pero sin uso para estos dos módulos (se deja por si el módulo de reflejos u otros la necesitan más adelante).
- No se tocan `assessment_answers` ni assessments en curso; el `order_index` es la llave estable.
- Reflejos primitivos no se modifican en este cambio.