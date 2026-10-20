import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/pacientes")({
  head: () => pageMeta("Acceso a formularios · admin.pacientes"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
