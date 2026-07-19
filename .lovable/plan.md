## Objetivo

Actualmente cada pregunta muestra solo el enunciado en negrilla (p.ej. "Mala coordinación"). Los documentos originales incluyen, debajo de cada enunciado, una descripción con ejemplos que ayudan al padre a entender la conducta. Vamos a integrarlos en la evaluación para los módulos **Perfil Cognitivo** (197 preguntas) y **Evaluación Funcional** (80). El módulo de Reflejos no se modifica (no lo pidió el usuario y ese documento no sigue el mismo patrón de "título + descripción").

## Cambios

### 1. Base de datos
- Migración: `ALTER TABLE public.assessment_questions ADD COLUMN description text;`
- Poblado: para cada pregunta con el mismo `order_index` dentro de `cognitive` y `functional`, escribir la descripción exacta tomada de:
  - `Perfil_cognitivo_con_indicaciones_para_interpretación.docx`
  - `Evaluacion_Funcional.docx`
  
  Estrategia técnica: parsear los `.docx` con `python-docx`, detectar los párrafos en negrilla con prefijo `N.` como enunciado y tomar el siguiente párrafo como descripción; generar un `UPDATE ... WHERE module=... AND order_index=N` por cada uno dentro de una única migración SQL. Las 90 preguntas del módulo `reflex` quedan con `description = NULL`.

### 2. Backend
- `src/lib/assessment.functions.ts` ya no filtra columnas puntualmente, pero la carga real se hace desde el cliente. No requiere cambios.
- `src/lib/mcp/tools/get-assessment-status.ts`: sin cambios (no lee `title`/`description`).

### 3. Frontend — `src/routes/_authenticated/app.evaluacion.tsx`
- Ampliar el tipo `Question` con `description: string | null`.
- Añadir `description` al `select` de `supabase.from("assessment_questions")`.
- Renderizar debajo del título (`currentQ.title`) un párrafo con `currentQ.description` en tipografía sans, tamaño `text-sm`, color `text-muted-foreground`, respetando el mobile-first (padding actual, sin ampliar el card).
- Mantener el orden visual: chip de dimensión → `title` (serif, negrilla, como hoy) → `description` (si existe) → opciones.

### 4. Tipos Supabase
- `src/integrations/supabase/types.ts` es auto-generado; se regenerará tras la migración.

## Consideraciones de diseño
- Sin cambios en paleta ni tipografía; la descripción usa el token `--muted-foreground` para dar jerarquía frente al enunciado en negrilla serif.
- En móvil se mantiene una sola columna; el texto largo hace scroll natural del card.
- Si `description` es `null` (módulo reflex), no se renderiza nada — no queda espacio vacío.

## Resultado esperado
El padre lee, por ejemplo:

> **Mala coordinación**
> Le cuesta combinar varias partes del cuerpo en un mismo movimiento, como saltar y aplaudir a la vez, patear un balón sin perder el equilibrio, o coordinar brazos y piernas al nadar o bailar.

y luego elige Siempre / Algunas veces / Nunca.