import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/seguimiento")({
  head: () => pageMeta("Acceso a formularios · seguimiento"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
