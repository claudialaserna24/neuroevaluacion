## Motor de generación del Plan Interactivo NEUROPLAN — ajustes v2

La Skill ya existe (`src/lib/plan/skill/*`) pero el schema, prompts, contexto y visor no cumplen la especificación nueva. Este plan la alinea sin tocar evaluación, Hoja de Ruta, pagos ni CEREBRO.

### Cambios principales vs. implementación actual

1. **Todos los reflejos, no solo prioritarios.** Hoy solo se consultan `reflexPriorities`. Debe incluirse toda la lista de reflejos de `roadmap.reflexes` (ordenada por prioridad descendente ya calculada por el backend).
2. **Fichas más ricas.** Cada ficha debe incluir: `name`, `priority_level`, `purpose`, `description`, `frequency`, `repetitions`, `progression`, `materials`, más el mensaje obligatorio al Manual Oficial. El schema actual solo tiene `title/body/materials/frequency`.
3. **Rutina 12 semanas basada en CEREBRO, no inventada.** La progresión (repeticiones, intensidad, frecuencia) debe leerse de CEREBRO (módulo Protocolos/Actividades) y la Skill solo organiza. Reforzar en prompt y pasar briefing de progresión por reflejo.
4. **Sección Seguimiento semanal** como plantilla estructurada (12 filas con campos observables) en vez de texto libre.
5. **Sección Finalización del programa** (invitación a nueva evaluación) reemplazando `closing`.
6. **Aviso legal exacto**, actualizado al texto nuevo del brief.
7. **Visor** actualizado para renderizar el nuevo shape (fichas ricas, rutina como tabla, seguimiento).

### Archivos a modificar

- `src/lib/plan/skill/schema.ts` — nuevo `PlanContentSchema`:
  - `context: { child_name, age, diagnosis, reason, duration_weeks, intro }`
  - `findings: { body }`
  - `objectives: { items: string[] }`
  - `instruction_cards: { intro, cards: [{ name, priority_level, purpose, description, frequency, repetitions, progression, materials, sources[] }] }`
  - `routine_12_weeks: { intro, weeks: [{ week, focus, activities, adjustments }] }`
  - `weekly_tracking: { intro, rows: [{ week, observations_prompt, achievements_prompt, difficulties_prompt }] }`
  - `family_recommendations: { items: string[] }`
  - `closing: { body }` (finalización + invitación nueva evaluación)
  - `legal_notice: { body }`
  - Todo plano, sin `.min/.max/.enum`.
- `src/lib/plan/skill/context-builder.ts` — extraer del roadmap la lista completa de reflejos (`roadmap.reflexes` como array tipado con `reflex`, `level`, `percent`) además de las prioridades. Incluir `patient.age`, `diagnosis`, `motivo` en `PlanInput`.
- `src/lib/plan/skill/cerebro-query.ts` — añadir helper `queryProgressionRules(module)` para leer Protocolos/Actividades específicos de progresión, manteniendo búsqueda incremental (nunca `select *` sin filtro).
- `src/lib/plan/skill/generator.ts`:
  - Iterar sobre TODOS los reflejos del roadmap, en orden ya calculado, no sobre `reflexPriorities`.
  - Añadir bloque CEREBRO de "Protocolos de progresión" al briefing.
  - Recordar en el prompt que la progresión debe copiarse literal de CEREBRO.
- `src/lib/plan/skill/prompts.ts`:
  - Reescribir instrucciones para las 9 secciones nuevas.
  - Actualizar el aviso legal al texto exacto del brief.
  - Reforzar: no inventar progresiones, incluir todos los reflejos, mensaje obligatorio al final de cada ficha.
- `src/routes/_authenticated/app.plan.$patientId.ver.tsx` — actualizar tipos y render:
  - Fichas con lista de campos etiquetados y footer con el mensaje del Manual Oficial.
  - Rutina como tabla de 12 semanas.
  - Bloque Seguimiento semanal.
  - Aviso legal al final.

### Sin cambios

- `plan.functions.ts`, webhook Wompi, `plan-interactivo` landing, checkout, botones Moholka, tabla `neurodevelopment_roadmaps` y su columna `plan_content` (sigue como `jsonb`).
- CEREBRO (`knowledge_documents`) y su UI de admin.
- Motor `report-engine.ts` y Hoja de Ruta.

### Validación tras implementar

- Regenerar plan de un paciente `unlocked` con `regenerateInteractivePlan` y comprobar en DB que `plan_content` contiene las 9 secciones, `plan_generation_status='ready'`, `plan_generated_at` seteado.
- Verificar que cada reflejo de `roadmap.reflexes` aparece en `instruction_cards.cards` con los 8 campos + mensaje del Manual.
- Verificar en el visor que las 9 secciones se muestran en el orden pedido.
