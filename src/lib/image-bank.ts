/**
 * Banco de imágenes prediseñadas para el informe.
 *
 * En NEUROPLAN NO se generan imágenes con IA: las ilustraciones del informe
 * están prediseñadas por el equipo clínico. Este mapa se poblará más
 * adelante con las claves reales (por dominio, dimensión, o tipo de recurso)
 * apuntando a URLs de assets ya existentes.
 */
export const imageBank: Record<string, string> = {};

export function getBankImage(key: string): string | undefined {
  return imageBank[key];
}