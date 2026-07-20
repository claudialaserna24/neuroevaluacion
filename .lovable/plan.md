# Plan: Actualización de contenido textual en Landing Page

## Alcance
Actualizar únicamente los textos de `src/routes/index.tsx`, manteniendo intacto el diseño, layout, colores, tipografía, espaciados, iconografía, imágenes y navegación.

## Cambios a realizar

### 1. Hero principal
- **Etiqueta superior**: reemplazar `Para familias` por `Para familias que buscan una guía clara para el neurodesarrollo`.
- **Título H1**: reemplazar `Comprende el neurodesarrollo de tu hijo/a con claridad.` por `Descubre por dónde empezar para apoyar el desarrollo de tu hijo.`.
- **Subtítulo**: reemplazar el párrafo actual por:
  > Completa una evaluación guiada y recibe una Hoja de Ruta para el Neurodesarrollo, un resumen gratuito que organiza las principales áreas que requieren atención.
  > 
  > Si decides continuar, podrás acceder a un programa de acompañamiento que incluye un Plan Interactivo Personalizado, el acompañamiento de Moholka, un agente de Inteligencia Artificial especializado en neurodesarrollo, y una membresía grupal dirigida por la neuropsicóloga para profundizar en temas de neurodesarrollo y resolver dudas durante el proceso.
- **Botón principal**: mantener `Comenzar evaluación gratuita` (ya coincide).
- **Texto debajo del botón**: añadir el párrafo `Al finalizar recibirás tu Hoja de Ruta para el Neurodesarrollo.` debajo del botón principal.

### 2. Sección "Cómo funciona"
Mantener los 3 pasos y sus iconos; actualizar títulos y descripciones.

- **Encabezado de sección**: mantener `Cómo funciona` y subtítulo `Tres pasos simples para entender y actuar.`.
- **Paso 1**:
  - Título: `Conoce las necesidades de tu hijo`
  - Body: `Responde una evaluación guiada que analiza diferentes áreas del neurodesarrollo mediante preguntas organizadas y fáciles de completar.`
- **Paso 2**:
  - Título: `Recibe tu Hoja de Ruta para el Neurodesarrollo`
  - Body: `Obtén un resumen gratuito con las principales prioridades identificadas y una orientación clara para saber por dónde comenzar.`
- **Paso 3**:
  - Título: `Accede al Programa de Acompañamiento`
  - Body: lista con los ítems:
    - Un Plan Interactivo Personalizado.
    - Actividades organizadas según las necesidades identificadas.
    - Recursos prácticos para implementar en casa.
    - El acompañamiento de Moholka, un agente de Inteligencia Artificial especializado en neurodesarrollo que responderá preguntas relacionadas con la implementación del plan.
    - Una membresía grupal periódica liderada por la neuropsicóloga para ampliar conocimientos sobre neurodesarrollo y resolver dudas comunes del proceso.

### 3. Sección "Para familias"
- **Título H2**: reemplazar `Para familias que buscan claridad` por `No necesitas tener todas las respuestas para dar el siguiente paso.`.
- **Texto**: reemplazar el párrafo actual por:
  > NEUROPLAN ayuda a las familias a organizar la información, identificar las principales necesidades del neurodesarrollo y comenzar con una orientación estructurada, clara y basada en evidencia.
  > 
  > Nuestro objetivo no es reemplazar la valoración profesional, sino ayudarte a actuar con mayor confianza mientras decides los siguientes pasos para acompañar el desarrollo de tu hijo.

### 4. Último llamado a la acción (CTA final)
- **Título H2**: reemplazar `Da el primer paso hoy.` por `Empieza hoy con una orientación clara para tu familia.`.
- **Subtítulo**: reemplazar por:
  > Completa la evaluación gratuita y recibe tu Hoja de Ruta para el Neurodesarrollo. Descubre las principales prioridades identificadas y decide cuándo dar el siguiente paso con nuestro Programa de Acompañamiento.
- **Botón**: mantener `Crear mi cuenta` (ya coincide).

## Consideraciones
- No se modificarán clases CSS, estructura de componentes, iconos ni enlaces.
- Se respetará el estilo limpio y minimalista actual.
- Se verificará que el build pase tras los cambios.