import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/page-meta";
import { resumeQuestion } from "@/lib/form-progress";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/evaluacion")({
  head: () => pageMeta("Completar formularios"),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid(), module: z.enum(["cognitive", "functional", "reflex"]).optional() }).parse(s),
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
  description?: string | null;
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
  const { patient, module } = Route.useSearch();
  return (
    <HabeasDataGate>
      <EvaluacionRunner patientId={patient} selectedModule={module} />
    </HabeasDataGate>
  );
}

function EvaluacionRunner({ patientId, selectedModule }: { patientId: string; selectedModule?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchState = useServerFn(getAssessmentState);
  const submit = useServerFn(saveAnswer);
  const complete = useServerFn(completeAssessment);

  const [loadError, setLoadError] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Map<string, number | "na">>(new Map());
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [introShown, setIntroShown] = useState<Record<string, boolean>>({});
  const introStorageKey = `neuroplan.moduleIntro.${patientId}`;

  // Load intro state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(introStorageKey);
      if (raw) setIntroShown(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [introStorageKey]);

  function markIntroShown(mod: string) {
    setIntroShown((prev) => {
      const next = { ...prev, [mod]: true };
      try {
        window.localStorage.setItem(introStorageKey, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  // Load questions + state
  useEffect(() => {
    (async () => {
      const { data: catalog, error: catalogError } = await supabase
        .from("assessment_questions")
        .select("id, module, dimension, category, order_index, title, description, scale")
        .order("module")
        .order("order_index");
      if (catalogError) throw catalogError;
      const qs = selectedModule ? catalog?.filter((q) => q.module === selectedModule) : catalog;
      const state = await fetchState({ data: { patientId } });
      setQuestions((qs ?? []) as unknown as Question[]);
      setAssessmentId(state.assessment.id);
      const map = new Map<string, number | "na">();
      for (const a of state.answered) if (qs?.some((q) => q.id === a.question_id)) map.set(a.question_id, a.text_value ? "na" : (a.value as number));
      setAnswers(map);
      setCursor(resumeQuestion(qs ?? [], map.keys(), state.assessment.current_question_id));
    })().catch(() => setLoadError(true));
    }, [fetchState, patientId, selectedModule]);

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

  async function handleAnswer(value: number | "na") {
    if (!currentQ || !assessmentId || saving) return;
    setSaving(true);
    const next = new Map(answers);
    next.set(currentQ.id, value);
    try {
      await submit({
        data: value === "na" ? { assessmentId, questionId: currentQ.id, value: null, notApplicable: true } : { assessmentId, questionId: currentQ.id, value },
      });
      setAnswers(next);
      await queryClient.invalidateQueries({ queryKey: ["family-forms"] });
      if (cursor < total - 1) setCursor(cursor + 1);
      else if (next.size === total) {
        await complete({ data: { assessmentId } });
        await navigate({ to: "/app", replace: true });
      }
    } catch {
      toast.error("No se pudo guardar. Vuelve a seleccionar tu respuesta para reintentar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!assessmentId) return;
    setCompleting(true);
    try {
      await complete({ data: { assessmentId } });
      toast.success("¡Evaluación completada!");
      navigate({ to: "/app", replace: true });
    } catch {
      toast.error("No se pudo finalizar. Intenta de nuevo.");
    } finally {
      setCompleting(false);
    }
  }

  if (loadError) return <p role="alert">No pudimos cargar tus formularios. Intenta nuevamente.</p>;
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

  // Show module intro before the first unseen question of a module
  if (!introShown[currentQ.module]) {
    return (
      <ModuleIntro
        module={currentQ.module}
        onStart={() => markIntroShown(currentQ.module)}
      />
    );
  }

  const renderQuestionText = (text: string) => {
    const idx = text.indexOf(": ");
    if (idx > 0 && idx < 120) {
      return (
        <>
          <strong className="font-semibold">{text.slice(0, idx)}:</strong>{" "}
          <span className="font-normal">{text.slice(idx + 2)}</span>
        </>
      );
    }
    return text;
  };

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
        {currentQ.module === "functional" && (
          <p className="mt-2 text-xs text-foreground">
            Si una situación no se ha presentado o no has podido observarla, elige 'No aplica / No observable'.
          </p>
        )}
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
          {renderQuestionText(currentQ.title)}
        </p>
        {currentQ.description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {currentQ.description}
          </p>
        ) : null}

        <div className={cn("mt-6 grid gap-2", currentQ.scale === "func10" ? "grid-cols-5" : "grid-cols-1")}>
          {options.map((opt) => {
            const active = selectedValue === opt.value;
            return (
              <Button
                key={`${opt.value}-${opt.label}`}
                onClick={() => handleAnswer(opt.value)}
                disabled={saving}
                className={cn(
                  "h-auto whitespace-normal rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  currentQ.scale === "func10" && "px-2 py-3 text-center",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/40",
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>

        {currentQ.scale === "func10" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAnswer("na")}
            disabled={saving}
            className={cn(
              "mt-4 h-auto w-full whitespace-normal rounded-2xl border-dashed px-4 py-3 text-sm font-medium",
              selectedValue === "na" && "border-solid border-primary bg-primary text-primary-foreground",
            )}
          >
            No aplica / No observable
          </Button>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          {saving ? "Guardando…" : "Autoguardado activo. Puedes salir y retomar."}
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          onClick={() => setCursor(Math.max(0, cursor - 1))}
          disabled={cursor === 0 || saving}
          variant="ghost"
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {allAnswered ? (
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {completing ? "Guardando…" : "Finalizar formulario"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Pregunta {cursor + 1} de {total}
          </span>
        )}
      </div>
    </div>
  );
}

function ModuleIntro({
  module,
  onStart,
}: {
  module: Question["module"];
  onStart: () => void;
}) {
  const content = MODULE_INTRO[module];
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/50">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {MODULE_LABEL[module].label}
        </p>
        <h1 className="mt-2 font-serif text-2xl leading-tight text-foreground">
          {content.title}
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
          {content.body}
        </div>
        <Button
          type="button"
          onClick={onStart}
          className="mt-6 h-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {content.cta}
        </Button>
      </div>
    </div>
  );
}

const MODULE_INTRO: Record<
  Question["module"],
  { title: string; body: React.ReactNode; cta: string }
> = {
  cognitive: {
    title: "Perfil Cognitivo",
    cta: "Comenzar",
    body: (
      <>
        <p>
          En este módulo encontrarás situaciones relacionadas con el
          comportamiento y el aprendizaje de tu hijo. Responde pensando en cómo
          se comporta habitualmente, no en situaciones aisladas.
        </p>
        <p className="font-medium text-foreground">
          Selecciona una única respuesta por pregunta:
        </p>
        <ul className="space-y-1.5 pl-4">
          <li>
            <strong>Siempre:</strong> ocurre con mucha frecuencia o casi siempre.
          </li>
          <li>
            <strong>Algunas veces:</strong> ocurre de forma ocasional.
          </li>
          <li>
            <strong>Nunca:</strong> no suele presentarse.
          </li>
        </ul>
        <p className="text-muted-foreground">
          No existen respuestas correctas o incorrectas. Lo importante es
          responder con la mayor sinceridad posible.
        </p>
      </>
    ),
  },
  functional: {
    title: "Evaluación Funcional",
    cta: "Continuar",
    body: (
      <>
        <p>
          Ahora responderás preguntas relacionadas con el procesamiento
          sensorial y el funcionamiento diario de tu hijo.
        </p>
        <p className="font-medium text-foreground">
          Para cada situación deberás considerar:
        </p>
        <ul className="space-y-2 pl-4">
          <li>
            <strong>Frecuencia:</strong> indica con qué frecuencia ocurre la
            situación. Escala de 0 a 10.
          </li>
          <li>
            <strong>Nivel de compromiso:</strong> indica cuánto afecta esa
            situación la vida diaria del niño. Escala de 0 a 10.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Responde pensando en el comportamiento habitual de tu hijo.
        </p>
      </>
    ),
  },
  reflex: {
    title: "Patrones Asociados a Reflejos Primitivos",
    cta: "Comenzar",
    body: (
      <>
        <p>
          En este módulo responderás preguntas relacionadas con comportamientos
          que podrían estar asociados a algunos reflejos primitivos.
        </p>
        <p className="text-muted-foreground">
          Las respuestas no constituyen un diagnóstico ni reemplazan una
          valoración profesional.
        </p>
        <p className="font-medium text-foreground">Selecciona un valor entre:</p>
        <ul className="space-y-1.5 pl-4">
          <li><strong>0</strong> = No se presenta</li>
          <li><strong>1</strong> = Muy poco</li>
          <li><strong>2</strong> = Algunas veces</li>
          <li><strong>3</strong> = Frecuente</li>
          <li><strong>4</strong> = Muy frecuente</li>
        </ul>
      </>
    ),
  },
};