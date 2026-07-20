
# Refinamiento UX — Módulo de Evaluación

No se toca el motor de evaluación, preguntas, escalas, cálculo, almacenamiento, autoguardado ni la Hoja de Ruta. Solo capas de UX y navegación.

## 1. Pantallas de introducción por módulo (una vez por módulo)

En `src/routes/_authenticated/app.evaluacion.tsx`:

- Añadir estado `moduleIntroShown: { cognitive: boolean; functional: boolean; reflex: boolean }`.
- Persistir por paciente en `localStorage` con clave `neuroplan.moduleIntro.<patientId>` para que sobreviva a recargas, pero se muestre una sola vez por módulo por paciente.
- Antes de renderizar la primera pregunta cuyo `module` aún no fue introducido, mostrar una pantalla intersticial a pantalla completa dentro del mismo layout con:
  - Título en serif (`font-serif text-2xl`)
  - Párrafo(s) explicativos y viñetas de escalas
  - Botón CTA ("Comenzar" o "Continuar" según el copy indicado)
- Al hacer clic en el CTA, se marca el módulo como introducido y se muestra la pregunta.
- La detección se hace por el `module` de `currentQ` — si cambia entre pregunta N y N+1 (transición entre módulos), se dispara la intro del nuevo módulo automáticamente.

Copys exactos según lo entregado por el usuario para Perfil Cognitivo, Evaluación Funcional y Reflejos Primitivos.

Nota: la Evaluación Funcional actualmente usa una única escala `func10` (0–10). El copy del usuario menciona dos aspectos (Frecuencia y Nivel de compromiso). Se respetará el texto tal como fue provisto en la intro; no se modifica el motor ni la estructura de preguntas. Si más adelante se requiere capturar dos valores por ítem, se abordará en otro cambio.

## 2. Navegación durante Reflejos

Revisar por qué desaparece "Anterior" en el módulo de reflejos. Sospecha: el `cursor === 0` funciona globalmente, pero puede haber un condicional/estilo que oculta el botón según la escala. Ajustar `app.evaluacion.tsx` para que:

- "Anterior" sea visible y clicable durante los tres módulos siempre que `cursor > 0`.
- Se pueda retroceder incluso entre módulos (no solo dentro del mismo).
- Mantener la regla actual: no se puede finalizar (Generar Hoja de Ruta) hasta responder todas las preguntas — ya se cumple con `allAnswered`. No se cambia esa lógica.

## 3. Landing interna de venta `/plan-interactivo`

Convertir el botón "Conocer todo lo que incluye" (hoy inerte, en `app.informe.tsx`) en un enlace a una nueva ruta:

`src/routes/_authenticated/app.plan-interactivo.tsx`

Contenido (mobile-first, misma estética serif/tokens actuales):

1. **Hero**: "Ya conoces las prioridades. Ahora descubre cómo acompañar a tu hijo paso a paso." + subtítulo emocional + CTA principal "Desbloquear mi Plan Interactivo".
2. **Comparativa Hoja de Ruta (gratis) vs Plan Interactivo (completo)** — tabla/tarjetas de dos columnas mostrando qué incluye cada uno.
3. **Recorrido visual "Qué recibirás"** — tarjetas con íconos de Lucide (sin revelar actividades específicas):
   - Plan personalizado organizado por prioridades
   - Actividades paso a paso
   - Frecuencia semanal recomendada
   - Recursos descargables
   - Acompañamiento de Moholka durante 30 días
   - Respuestas a preguntas relacionadas con el plan
   - Membresía grupal con la neuropsicóloga
   - Actualizaciones del plan cuando sea necesario
4. **CTA final protagonista** — "Desbloquear mi Plan Interactivo" que enlaza a `/checkout?patient=<id>`.

Se recibe el `patient` por search param para propagarlo al checkout.

## 4. Ruta temporal `/checkout`

`src/routes/_authenticated/checkout.tsx` (dentro del layout autenticado):

- Search param `patient` (uuid).
- Pantalla simple con:
  - Título: "Estamos preparando tu Plan Interactivo"
  - Texto: "En el siguiente paso integrarás la pasarela de pago para desbloquear automáticamente el Plan Interactivo."
  - Botón secundario "Volver" al informe.
- Sin lógica de pago. Solo placeholder.

## 5. Conexiones de botones

En `app.informe.tsx`:
- "Conocer todo lo que incluye" → `Link to="/app/plan-interactivo" search={{ patient }}`.
- "Desbloquear mi Plan Interactivo" → `Link to="/checkout" search={{ patient }}`.

## Archivos afectados

- `src/routes/_authenticated/app.evaluacion.tsx` (intros + fix botón Anterior)
- `src/routes/_authenticated/app.informe.tsx` (conectar botones existentes)
- `src/routes/_authenticated/app.plan-interactivo.tsx` (nuevo)
- `src/routes/_authenticated/checkout.tsx` (nuevo, placeholder)

## Fuera de alcance

Motor de evaluación, preguntas, escalas, reglas, cálculos, DB, RLS, autoguardado, Hoja de Ruta, pasarela de pago real.
