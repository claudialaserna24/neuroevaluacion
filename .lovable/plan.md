# Plan: Eliminar párrafo del hero en la homepage

## Alcance
Eliminar únicamente el párrafo que comienza con "Si decides continuar, podrás acceder a un programa de acompañamiento..." del hero de `src/routes/index.tsx`, dejando todo el resto del contenido, diseño, layout, colores, tipografía, espaciado, iconografía, imágenes y navegación intactos.

## Cambio a realizar
- **Archivo**: `src/routes/index.tsx`
- **Acción**: Remover el segundo párrafo del hero (el que describe el Plan Interactivo Personalizado, Moholka y la membresía grupal).
- **Resultado esperado**: El hero conserva la etiqueta superior, el H1, el primer párrafo sobre la Hoja de Ruta, el botón principal y el texto debajo del botón.

## Verificación
- Ejecutar el build para confirmar que no hay errores de sintaxis.
- Revisar el preview en viewport móvil para confirmar que el párrafo desapareció y el espaciado restante se ve correcto.