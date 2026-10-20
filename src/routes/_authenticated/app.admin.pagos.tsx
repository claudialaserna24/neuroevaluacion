import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/pagos")({
  head: () => pageMeta("Acceso a formularios · admin.pagos"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
