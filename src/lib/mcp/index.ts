import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getAssessmentStatus from "./tools/get-assessment-status";
import getInitialReport from "./tools/get-initial-report";
import getProfile from "./tools/get-profile";

// Direct Supabase issuer — never the .lovable.cloud proxy. VITE_SUPABASE_PROJECT_ID
// is inlined by Vite at build time and survives publish; the fallback keeps the
// issuer well-formed during throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "neuroplan-mcp",
  title: "NEUROPLAN",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura para consultar el estado de la Evaluación Inteligente, la Hoja de Ruta y el perfil del usuario autenticado en NEUROPLAN. Ninguna herramienta emite diagnósticos clínicos ni reemplaza el criterio profesional.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getAssessmentStatus, getInitialReport, getProfile],
});