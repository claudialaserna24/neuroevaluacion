// Motor de reglas puro (sin IA) para la Hoja de Ruta para el Neurodesarrollo.

export type QuestionRow = {
  id: string;
  module: "cognitive" | "functional" | "reflex";
  dimension: string;
  order_index: number;
  scale: "cog3" | "func10" | "reflex5";
};
export type AnswerRow = { question_id: string; value: number };

export type CognitiveResult = {
  rightScore: number;
  leftScore: number;
  totalScore: number;
  level: "Leve" | "Moderado" | "Alto";
  dominantHemisphere: "derecho" | "izquierdo" | "equilibrado";
};

export type FunctionalArea = {
  area: string;
  score: number;
  max: number;
  percent: number;
  level: "Leve" | "Moderado" | "Alto" | "Muy Alto";
};
export type ReflexResult = {
  reflex: string;
  score: number;
  max: number;
  percent: number;
  level: "Baja" | "Moderada" | "Alta" | "Muy Alta";
};

export type Priorities = {
  context: {
    generalLevel: CognitiveResult["level"];
    hemisphere: CognitiveResult["dominantHemisphere"];
  };
  functionalPriorities: string[];
  reflexPriorities: string[];
};

function cogLevel(total: number): CognitiveResult["level"] {
  if (total <= 50) return "Leve";
  if (total <= 99) return "Moderado";
  return "Alto";
}
function funcLevel(pct: number): FunctionalArea["level"] {
  if (pct <= 25) return "Leve";
  if (pct <= 50) return "Moderado";
  if (pct <= 75) return "Alto";
  return "Muy Alto";
}
function reflexLevel(score: number): ReflexResult["level"] {
  if (score <= 10) return "Baja";
  if (score <= 20) return "Moderada";
  if (score <= 30) return "Alta";
  return "Muy Alta";
}

export function computeReport(questions: QuestionRow[], answers: AnswerRow[]) {
  const valueOf = new Map(answers.map((a) => [a.question_id, a.value]));

  // ---------- Cognitive ----------
  const cogQs = questions.filter((q) => q.module === "cognitive");
  let right = 0;
  let left = 0;
  for (const q of cogQs) {
    const v = valueOf.get(q.id);
    if (typeof v !== "number") continue;
    // Escala cog3: Siempre=1, Algunas veces=1, Nunca=0 (según reglas)
    const score = v > 0 ? 1 : 0;
    if (q.dimension.toLowerCase().includes("derecho")) right += score;
    else left += score;
  }
  const total = right + left;
  const cognitive: CognitiveResult = {
    rightScore: right,
    leftScore: left,
    totalScore: total,
    level: cogLevel(total),
    dominantHemisphere:
      right === left ? "equilibrado" : right > left ? "derecho" : "izquierdo",
  };

  // ---------- Functional ----------
  const funcByArea = new Map<string, { score: number; count: number }>();
  for (const q of questions.filter((q) => q.module === "functional")) {
    const v = valueOf.get(q.id) ?? 0;
    const cur = funcByArea.get(q.dimension) ?? { score: 0, count: 0 };
    cur.score += v;
    cur.count += 1;
    funcByArea.set(q.dimension, cur);
  }
  const functional: FunctionalArea[] = Array.from(funcByArea.entries())
    .map(([area, { score, count }]) => {
      const max = count * 10;
      const percent = max === 0 ? 0 : Math.round((score / max) * 100);
      return { area, score, max, percent, level: funcLevel(percent) };
    })
    .sort((a, b) => b.percent - a.percent);

  // ---------- Reflex ----------
  const refByName = new Map<string, { score: number; count: number }>();
  for (const q of questions.filter((q) => q.module === "reflex")) {
    const v = valueOf.get(q.id) ?? 0;
    const cur = refByName.get(q.dimension) ?? { score: 0, count: 0 };
    cur.score += v;
    cur.count += 1;
    refByName.set(q.dimension, cur);
  }
  const reflexes: ReflexResult[] = Array.from(refByName.entries())
    .map(([reflex, { score, count }]) => {
      const max = count * 4;
      const percent = max === 0 ? 0 : Math.round((score / max) * 100);
      return { reflex, score, max, percent, level: reflexLevel(score) };
    })
    .sort((a, b) => b.score - a.score);

  // ---------- Priorities ----------
  const funcHigh = functional.filter(
    (f) => f.level === "Alto" || f.level === "Muy Alto",
  );
  const refHigh = reflexes.filter(
    (r) => r.level === "Alta" || r.level === "Muy Alta",
  );
  const priorities: Priorities = {
    context: {
      generalLevel: cognitive.level,
      hemisphere: cognitive.dominantHemisphere,
    },
    functionalPriorities: (funcHigh.length > 0
      ? funcHigh
      : functional.slice(0, 1)
    ).map((f) => f.area),
    reflexPriorities: (refHigh.length > 0 ? refHigh : reflexes.slice(0, 1)).map(
      (r) => r.reflex,
    ),
  };

  return { cognitive, functional, reflexes, priorities };
}