
# Auditoría del flujo de compra

Revisé los cuatro archivos del módulo (`app.informe.tsx`, `app.plan-interactivo.tsx`, `checkout.tsx`, `payments.functions.ts`) y confirmé que todas las pantallas y modales están conectadas. **No hace falta modificar nada** para probar el flujo completo sin escribir rutas manualmente.

## Mapa de botones → pantallas

```text
1. Hoja de Ruta   (/app/informe?patient=…)
   └─ Botón "Desbloquear mi Plan Interactivo"     → abre Modal de confirmación
   └─ Botón "Conocer todo lo que incluye"         → /app/plan-interactivo

2. Modal de confirmación  (dentro de la Hoja de Ruta)
   ├─ Botón "Conocer mi Plan"                     → /app/plan-interactivo
   ├─ Botón "Continuar al pago"                   → /checkout
   ├─ Botón X / Esc / clic fuera                  → cierra el modal

3. Conoce tu Plan Interactivo  (/app/plan-interactivo?patient=…)
   └─ CTA final "Desbloquear mi Plan Interactivo" → /checkout

4. Checkout  (/checkout?patient=…)
   ├─ Botón "Pagar con Wompi"                     → crea payment pendiente + toast
   └─ Botón "Volver a la Hoja de Ruta"            → /app/informe
```

## Cómo probarlo desde cero (sin URLs manuales)

1. Menú inferior → **Informe** (Hoja de Ruta).
2. En la sección "Continúa con tu Plan Interactivo" pulsa **Desbloquear mi Plan Interactivo** → aparece el modal.
3. En el modal pulsa **Conocer mi Plan** → llega a la landing interna.
4. En la landing, baja al CTA y pulsa **Desbloquear mi Plan Interactivo** → llega al Checkout.
5. En el Checkout pulsa **Pagar con Wompi** → se crea el registro `payments` (pending) y se muestra el toast "Integración con Wompi en preparación."

## Estado

Sin pantallas huérfanas y sin conexiones faltantes. Al aprobar este plan no ejecutaré cambios — es solo la confirmación del recorrido. Si prefieres que ajuste algún botón (por ejemplo, forzar que "Conocer mi Plan" siempre pase primero por la landing antes del checkout), dime y armo un plan con esos cambios.
