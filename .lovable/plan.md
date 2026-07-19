## Ajuste de copy en el registro del paciente

### Cambios a realizar en `src/routes/_authenticated/app.pacientes.tsx`

1. **Encabezado superior**
   - Reemplazar el bloque actual:
     - Etiqueta "PACIENTES"
     - Título "Mis pacientes"
     - Descripción "Cada paciente tiene su propia evaluación y Hoja de Ruta para el Neurodesarrollo."
   - Por el nuevo texto:
     - Título: **"Cuéntanos sobre tu hijo..."**
     - Subtítulo: **"Para comenzar la evaluación necesitamos conocer algunos datos básicos de tu hijo. Esta información nos permitirá personalizar todo el proceso y generar posteriormente su Hoja de Ruta para el Neurodesarrollo."**
   - Ocultar el botón "Añadir paciente" en este contexto de onboarding; el formulario ya se muestra automáticamente con `?first=1`.

2. **Título del formulario**
   - Cambiar **"Nuevo paciente"** por **"Información de tu hijo (a)"**.

3. **Botón de acción**
   - Cambiar el texto del botón submit de **"Guardar paciente"** a **"Continuar con la evaluación →"**.
   - Mantener el estado de carga como "Guardando…" o ajustarlo a "Continuando…".

4. **Consideraciones de diseño**
   - Preservar la tipografía serif y la paleta actual (#1A858D).
   - Mantener el layout mobile-first; el formulario sigue siendo de una columna en pantallas pequeñas.
   - No se modifica lógica de negocio ni arquitectura de datos.

### Resultado esperado
La pantalla de registro del primer paciente se percibe como el paso inicial de la evaluación NEUROPLAN, con lenguaje cálido orientado al padre de familia.