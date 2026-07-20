// Manual Oficial de Ejercicios NEUROPLAN.
// Único documento compartido por todos los pacientes con Plan desbloqueado.
// Vive en el bucket privado `manual-assets` bajo un path fijo. El administrador
// puede reemplazarlo (upsert) desde la vista de administración; el nombre del
// objeto no cambia para que el enlace del Plan siempre apunte a la versión vigente.
export const MANUAL_BUCKET = "manual-assets";
export const MANUAL_OBJECT_PATH = "manual-oficial-ejercicios.pdf";

// Duración de las signed URLs para descargas (en segundos).
export const SIGNED_URL_TTL = 60 * 10; // 10 minutos