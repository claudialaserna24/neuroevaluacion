import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => pageMeta("Acceso a formularios · checkout"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
