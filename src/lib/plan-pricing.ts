// Precio central del Plan Interactivo NEUROPLAN.
// Cliente-safe: no lee secretos.
export const PLAN_PRICE_USD = 80;
export const PLAN_CURRENCY = "USD" as const;

// Monto real cobrado por Wompi (COP). Wompi solo procesa COP.
export const PLAN_PRICE_COP = 320000;
export const WOMPI_CURRENCY = "COP" as const;

export function formatPlanPrice(): string {
  return `USD $${PLAN_PRICE_USD.toFixed(2)}`;
}

export function formatPlanPriceCOP(): string {
  return `COP $${PLAN_PRICE_COP.toLocaleString("es-CO")}`;
}