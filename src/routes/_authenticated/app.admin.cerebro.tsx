import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/cerebro")({
  head: () => pageMeta("Acceso a formularios · admin.cerebro"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
