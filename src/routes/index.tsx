import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, FileText, Sparkles, ArrowRight, HeartHandshake } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/")({
  component: Landing,
});

const steps = [
  {
    icon: ClipboardList,
    title: "Evaluación inteligente",
    body: "Respondes preguntas cuidadosamente diseñadas sobre el perfil cognitivo, funcional y de reflejos primitivos de tu hijo/a.",
  },
  {
    icon: FileText,
    title: "Resumen gratuito",
    body: "Recibes un resumen inteligente con los principales hallazgos y áreas a acompañar, sin costo.",
  },
  {
    icon: Sparkles,
    title: "Plan personalizado",
    body: "Desbloqueas un plan interactivo con estrategias claras, actividades y seguimiento para tu familia.",
  },
];

const faqs = [
  {
    q: "¿NEUROPLAN reemplaza al neuropsicólogo?",
    a: "No. NEUROPLAN orienta y organiza información para tu familia, pero no reemplaza el criterio clínico de un profesional.",
  },
  {
    q: "¿Cuánto dura la evaluación?",
    a: "Entre 15 y 25 minutos. Puedes pausarla y retomarla cuando quieras.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. La información se maneja bajo estándares clínicos de privacidad y confidencialidad.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo />
          <Link
            to="/auth"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        {/* Hero */}
        <section className="pt-14 pb-16 md:pt-24 md:pb-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
              <HeartHandshake className="h-3.5 w-3.5" />
              Para familias
            </span>
            <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight text-foreground md:text-6xl">
              Comprende el neurodesarrollo de tu hijo/a con claridad.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
              Una evaluación inteligente y un plan personalizado que te acompañan
              paso a paso, con respaldo clínico y sin tecnicismos.
            </p>
            <div className="mt-8">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                Comenzar evaluación gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="border-t border-border/60 py-16 md:py-20">
          <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
            Cómo funciona
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tres pasos simples para entender y actuar.
          </p>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-3xl border border-border/70 bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Paso {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-xl text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Para quién es */}
        <section className="border-t border-border/60 py-16 md:py-20">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
              Para familias que buscan claridad
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              NEUROPLAN está pensado para padres y madres de niños con desafíos
              del neurodesarrollo —atención, aprendizaje, regulación,
              lenguaje, coordinación— que quieren entender qué está pasando y
              qué hacer a continuación.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border/60 py-16 md:py-20">
          <h2 className="font-serif text-2xl tracking-tight text-foreground md:text-3xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground">
                  {f.q}
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 md:py-24">
          <div className="rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
            <h2 className="mx-auto max-w-xl font-serif text-3xl tracking-tight md:text-4xl">
              Da el primer paso hoy.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm opacity-90">
              Comienza la evaluación gratuita y recibe tu resumen inteligente.
            </p>
            <Link
              to="/auth"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
            >
              Crear mi cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} NEUROPLAN. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
