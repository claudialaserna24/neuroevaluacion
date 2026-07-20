// Manual Oficial de Ejercicios NEUROPLAN.
// Único documento compartido por todos los pacientes.
// Se guarda en el bucket privado `cerebro-assets` y se sirve mediante signed URL.
// Cuando el archivo esté disponible, colocar aquí el path del objeto dentro del bucket
// (por ejemplo: "manuals/manual-oficial-ejercicios.pdf").
export const MANUAL_BUCKET = "cerebro-assets";
export const MANUAL_OBJECT_PATH: string | null = null;

// Duración de las signed URLs para descargas (en segundos).
export const SIGNED_URL_TTL = 60 * 10; // 10 minutos