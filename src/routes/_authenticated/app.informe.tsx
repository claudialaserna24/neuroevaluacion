import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/informe")({
  head: () => pageMeta("Acceso a formularios · informe"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
