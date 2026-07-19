import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HabeasDataGate } from "@/components/legal/HabeasDataGate";
import {
  getAssessmentState,
  saveAnswer,
  completeAssessment,
} from "@/lib/assessment.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/evaluacion")({
  head: () => ({ meta: [{ title: "Evaluación — NEUROPLAN" }, { name: "robots", content: "noindex" }] }),
  component: EvaluacionPage,
});

const MODULE_LABEL: Record<string, { label: string; short: string }> = {
  cognitive: { label: "Perfil Cognitivo", short: "Cognitivo" },
  functional: { label: "Evaluación Funcional", short: "Funcional" },
  reflex: { label: "Reflejos Primitivos", short: "Reflejos" },
};

type Question = {
  id: string;
  module: "cognitive" | "functional" | "reflex";
  dimension: string;
  order_index: number;
  title: string;
  scale: "cog3" | "func10" | "reflex5";
  category?: string | null;
};

const SCALE_OPTIONS: Record<Question["scale"], { value: number; label: string }[]> = {
  cog3: [
    { value: 2, label: "Siempre" },
    { value: 1, label: "Algunas veces" },
    { value: 0, label: "Nunca" },
  ],
  func10: Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  reflex5: [
    { value: 0, label: "0 · Ausente" },
    { value: 1, label: "1 · Muy leve" },
    { value: 2, label: "2 · Leve" },
    { value: 3, label: "3 · Moderado" },
    { value: 4, label: "4 · Marcado" },
  ],
};

function EvaluacionPage() {
  return (
    <HabeasDataGate>
      <EvaluacionRunner />
    </HabeasDataGate>
  );
}

function EvaluacionRunner() {
  const navigate = useNavigate();
  const fetchState = useServerFn(getAssessmentState);
  const submit = useServerFn(saveAnswer);
  const complete = useServerFn(completeAssessment);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Load questions + state
  useEffect(() => {
    (async () => {
      const { data: qs } = await supabase
        .from("assessment_questions")
        .select("id, module, dimension, category, order_index, title, scale")
        .order("module")
        .order("order_index");
      const state = await fetchState();
      setQuestions((qs ?? []) as unknown as Question[]);
      setAssessmentId(state.assessment.id);
      const map = new Map<string, number>();
      for (const a of state.answered) map.set(a.question_id, a.value);
      setAnswers(map);
      // Resume from first unanswered
      const orderIndex = (qs ?? []).findIndex((q) => !map.has(q.id));
      setCursor(orderIndex === -1 ? (qs?.length ?? 1) - 1 : orderIndex);
    })();
  }, [fetchState]);

  const total = questions.length;
  const currentQ = questions[cursor];
  const totalAnswered = answers.size;
  const progress = total ? Math.round((totalAnswered / total) * 100) : 0;

  const moduleProgress = useMemo(() => {
    const mods: Question["module"][] = ["cognitive", "functional", "reflex"];
    return mods.map((m) => {
      const qs = questions.filter((q) => q.module === m);
      const done = qs.filter((q) => answers.has(q.id)).length;
      return { module: m, done, total: qs.length };
    });
  }, [questions, answers]);

  async function handleAnswer(value: number) {
    if (!currentQ || !assessmentId) return;
    setSaving(true);
    const next = new Map(answers);
    next.set(currentQ.id, value);
    setAnswers(next);
    try {
      await submit({
        data: { assessmentId, questionId: currentQ.id, value },
      });
    } catch {
      toast.error("No se pudo guardar la respuesta. Se intentará de nuevo.");
    } finally {
      setSaving(false);
    }
    if (cursor < total - 1) setCursor(cursor + 1);
  }

  async function handleComplete() {
    if (!assessmentId) return;
    setCompleting(true);
    try {
      await complete({ data: { assessmentId } });
      toast.success("¡Evaluación completada!");
      navigate({ to: "/app/informe" });
    } catch {
      toast.error("No se pudo generar tu Hoja de Ruta. Intenta de nuevo.");
    } finally {
      setCompleting(false);
    }
  }

  if (!currentQ) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Preparando tu evaluación…
      </div>
    );
  }

  const allAnswered = totalAnswered >= total;
  const options = SCALE_OPTIONS[currentQ.scale];
  const selectedValue = answers.get(currentQ.id);

  return (
    <div className="flex flex-col gap-5">
      {/* Header progreso */}
      <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide text-primary">
            {MODULE_LABEL[currentQ.module].label}
          </span>
          <span>
            {totalAnswered} / {total} · {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          {moduleProgress.map((mp) => (
            <div
              key={mp.module}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-center",
                mp.module === currentQ.module
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-background",
              )}
            >
              <p className="font-medium text-foreground">
                {MODULE_LABEL[mp.module].short}
              </p>
              <p className="text-muted-foreground">
                {mp.done}/{mp.total}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Pregunta */}
      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {currentQ.dimension}
          {currentQ.category ? ` · ${currentQ.category}` : ""}
        </p>
        <p className="mt-2 font-serif text-xl leading-snug text-foreground">
          {currentQ.title}
        </p>

        <div className={cn("mt-6 grid gap-2", currentQ.scale === "func10" ? "grid-cols-5" : "grid-cols-1")}>
          {options.map((opt) => {
            const active = selectedValue === opt.value;
            return (
              <button
                key={`${opt.value}-${opt.label}`}
                onClick={() => handleAnswer(opt.value)}
                disabled={saving}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  currentQ.scale === "func10" && "px-2 py-3 text-center",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          {saving ? "Guardando…" : "Autoguardado activo. Puedes salir y retomar."}
        </p>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(Math.max(0, cursor - 1))}
          disabled={cursor === 0}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        {allAnswered ? (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {completing ? "Generando…" : "Generar Hoja de Ruta"}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Pregunta {cursor + 1} de {total}
          </span>
        )}
      </div>
    </div>
  );
}