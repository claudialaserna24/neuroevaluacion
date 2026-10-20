import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/familias")({
  head: () => pageMeta("Acceso a formularios · admin.familias"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
