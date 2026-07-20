import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — NEUROPLAN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ patient: z.string().uuid() }).parse(s),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { patient } = Route.useSearch();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <h1 className="mt-6 font-serif text-3xl leading-tight text-foreground">
        Estamos preparando tu Plan Interactivo
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        En el siguiente paso integrarás la pasarela de pago para desbloquear
        automáticamente el Plan Interactivo.
      </p>
      <Link
        to="/app/informe"
        search={{ patient }}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la Hoja de Ruta
      </Link>
    </main>
  );
}