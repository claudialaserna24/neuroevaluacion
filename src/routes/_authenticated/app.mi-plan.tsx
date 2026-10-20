import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/mi-plan")({
  head: () => pageMeta("Acceso a formularios · mi-plan"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
