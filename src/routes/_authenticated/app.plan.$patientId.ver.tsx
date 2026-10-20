import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/plan/$patientId/ver")({
  head: () => pageMeta("Acceso a formularios · plan.$patientId.ver"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
