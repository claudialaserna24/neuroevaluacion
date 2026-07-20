// Precio central del Plan Interactivo NEUROPLAN.
// Cliente-safe: no lee secretos.
export const PLAN_PRICE_USD = 80;
export const PLAN_CURRENCY = "USD" as const;

export function formatPlanPrice(): string {
  return `USD $${PLAN_PRICE_USD.toFixed(2)}`;
}