import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/pacientes/$patientId")({
  head: () => pageMeta("Acceso a formularios · admin.pacientes.$patientId"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
