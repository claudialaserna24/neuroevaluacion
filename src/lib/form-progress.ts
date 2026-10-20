export const FORM_MODULES = ["cognitive", "functional", "reflex"] as const;
export type FormModule = (typeof FORM_MODULES)[number];
export const FORM_LABELS: Record<FormModule, string> = {
  cognitive: "Perfil cognitivo",
  functional: "Evaluación funcional sensorial",
  reflex: "Reflejos primitivos",
};
export function formProgress(questions: { id: string; module: string }[], answered: Iterable<string>) {
  const ids = new Set(answered);
  return FORM_MODULES.map((module) => {
    const items = questions.filter((q) => q.module === module);
    const done = items.filter((q) => ids.has(q.id)).length;
    return { module, total: items.length, done, status: items.length > 0 && done === items.length ? "Completado" : done > 0 ? "En progreso" : "Sin iniciar" };
  });
}
export function allFormsCompleted(forms: { status: string }[]) {
  return forms.length === 3 && forms.every((f) => f.status === "Completado");
}
export function canAdminRead(roles: string[]) { return roles.includes("administrador"); }
export function resumeQuestion(questions: { id: string }[], answered: Iterable<string>, lastId: string | null) {
  const saved = new Set(answered);
  const last = questions.findIndex((q) => q.id === lastId);
  // A saved question advances to the next one; an unanswered cursor stays put.
  if (last >= 0 && !saved.has(questions[last].id)) return last;
  if (last >= 0 && last < questions.length - 1 && !saved.has(questions[last + 1].id)) return last + 1;
  const missing = questions.findIndex((q) => !saved.has(q.id));
  return missing >= 0 ? missing : Math.max(0, questions.length - 1);
}
export function answerLabel(scale: string, value: number | null | undefined) {
  if (value == null) return "Sin respuesta";
  if (scale === "cog3") return ["Nunca", "Algunas veces", "Siempre"][value] ?? String(value);
  if (scale === "reflex5") return ["0 · Ausente", "1 · Muy leve", "2 · Leve", "3 · Moderado", "4 · Marcado"][value] ?? String(value);
  return String(value);
}
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}