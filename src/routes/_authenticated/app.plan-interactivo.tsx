import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/plan-interactivo")({
  head: () => pageMeta("Acceso a formularios · plan-interactivo"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
