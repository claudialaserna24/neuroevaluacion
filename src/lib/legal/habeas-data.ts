// Política de Tratamiento de Datos Personales (HABEAS DATA) — Colombia (Ley 1581/2012, Decreto 1377/2013).
// Al cambiar el contenido, incrementa la versión: se le pedirá aceptación nuevamente al usuario.
export const HABEAS_DATA_VERSION = "2026-07-19";

export const HABEAS_DATA_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Responsable del tratamiento",
    body: "NEUROPLAN, plataforma operada por el neuropsicólogo administrador, con correo de contacto para asuntos de datos personales indicado en la sección Mi Perfil de la aplicación. Marco legal: Ley 1581 de 2012, Decreto 1377 de 2013 y demás normas concordantes de la República de Colombia sobre protección de datos personales.",
  },
  {
    heading: "2. Moholka",
    body: "Moholka es el asistente especializado de inteligencia artificial en neurodesarrollo integrado en NEUROPLAN. Moholka acompaña y orienta a las familias durante el uso del Plan Interactivo Personalizado. No reemplaza el criterio clínico de un profesional y no realiza diagnósticos.",
  },
  {
    heading: "3. Datos que se recogen",
    body: "(a) Datos de identificación del padre/madre/acudiente: nombre, correo electrónico, contraseña cifrada. (b) Datos del niño/a: nombre y fecha de nacimiento; la cuenta es siempre gestionada por el adulto responsable. (c) Datos sensibles relativos a la salud y desarrollo del niño/a: respuestas a los cuestionarios de Perfil Cognitivo, Evaluación Funcional y Reflejos Primitivos, y los puntajes y niveles derivados. (d) Datos técnicos: dispositivo y navegador para seguridad y auditoría del consentimiento.",
  },
  {
    heading: "4. Finalidades del tratamiento",
    body: "(a) Prestar el servicio de evaluación orientadora y generar la Hoja de Ruta para el Neurodesarrollo. (b) Generar, cuando el usuario lo desbloquee, el Plan Interactivo Personalizado y ofrecer acompañamiento de Moholka. (c) Permitir al usuario retomar la evaluación desde el último punto guardado. (d) Cumplir obligaciones legales y de seguridad de la información. (e) Análisis internos anónimos y agregados para mejorar la plataforma. Nunca se comercializan los datos.",
  },
  {
    heading: "5. Autorización expresa para datos sensibles",
    body: "Por tratarse de datos sensibles de un menor de edad, el padre/madre/acudiente autoriza expresamente su tratamiento con las finalidades del numeral 4. El usuario no está obligado a autorizarlo; sin la autorización no es posible realizar la evaluación ni generar la Hoja de Ruta.",
  },
  {
    heading: "6. Derechos del titular",
    body: "Conforme al artículo 8 de la Ley 1581 de 2012, el padre/madre/acudiente en representación del menor puede en cualquier momento: (a) acceder a sus datos, (b) rectificarlos, (c) actualizarlos, (d) suprimirlos cuando el tratamiento no se ajuste a la ley o cuando se revoque la autorización, (e) revocar la autorización otorgada, (f) presentar quejas ante la Superintendencia de Industria y Comercio (SIC). Estos derechos se ejercen desde Mi Perfil > Retirar mi autorización.",
  },
  {
    heading: "7. Conservación y supresión",
    body: "Los datos se conservan mientras exista la cuenta y la autorización esté vigente. Al retirar la autorización o eliminar la cuenta, las respuestas y el informe se eliminan de forma permanente en un plazo máximo de 30 días, salvo obligación legal en contrario.",
  },
  {
    heading: "8. Medidas de seguridad",
    body: "La información se transmite bajo cifrado TLS y se almacena en infraestructura de Lovable Cloud con controles de acceso por usuario (Row Level Security). Las contraseñas nunca se almacenan en texto plano.",
  },
  {
    heading: "9. Transferencias y encargados",
    body: "NEUROPLAN utiliza como encargados de tratamiento a proveedores de infraestructura de Lovable Cloud y de autenticación (Google, cuando el usuario elige Continuar con Google), que ofrecen niveles adecuados de seguridad. No se realizan transferencias a terceros con fines comerciales.",
  },
  {
    heading: "10. Menores de edad",
    body: "El tratamiento de datos de menores se realiza únicamente con el consentimiento previo, expreso e informado del padre/madre/acudiente, respetando el interés superior del menor y sus derechos fundamentales.",
  },
  {
    heading: "11. Uso de inteligencia artificial",
    body: "Durante la evaluación y la generación de la Hoja de Ruta no se utiliza IA. La IA (Moholka) interviene únicamente después de que el usuario desbloquea el Plan Interactivo Personalizado, exclusivamente con fines orientadores. En ningún caso Moholka emite diagnósticos ni reemplaza la valoración clínica profesional.",
  },
  {
    heading: "12. Vigencia y cambios",
    body: `Esta política rige desde su fecha de publicación (versión ${HABEAS_DATA_VERSION}). Cualquier cambio sustancial se notificará al usuario y se solicitará nueva aceptación antes de continuar utilizando la evaluación.`,
  },
];