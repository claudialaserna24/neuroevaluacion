import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/manual")({
  head: () => pageMeta("Acceso a formularios · manual"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
