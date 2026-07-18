import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenida — NEUROPLAN" },
      { name: "description", content: "Prepara tu evaluación en NEUROPLAN." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 pt-8 text-center">
        <Logo />
        <div className="rounded-3xl bg-card p-8 shadow-sm ring-1 ring-border/60">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-primary">
            Todo listo
          </span>
          <h1 className="mt-5 font-serif text-3xl leading-tight tracking-tight text-foreground">
            Bienvenido/a a NEUROPLAN.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Estamos preparando tu evaluación. En unos minutos vas a responder
            preguntas sobre el perfil cognitivo, funcional y de reflejos
            primitivos de tu hijo/a. Puedes pausar y retomar cuando quieras.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Comenzar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          NEUROPLAN acompaña, no reemplaza el criterio clínico profesional.
        </p>
      </div>
    </div>
  );
}