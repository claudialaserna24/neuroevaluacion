import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/evaluaciones")({
  head: () => pageMeta("Acceso a formularios · admin.evaluaciones"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
