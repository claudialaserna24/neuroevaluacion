import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/pacientes/$patientId")({
  head: () => pageMeta("Acceso a formularios · pacientes.$patientId"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
