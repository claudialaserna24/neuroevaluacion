// Promise<void> preserves legacy return types without running retired services.
export async function disabledFeature(): Promise<void> {
  throw new Error("Función desactivada: NEUROPLAN solo recopila formularios");
}