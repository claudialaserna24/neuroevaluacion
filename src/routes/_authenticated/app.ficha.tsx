import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/ficha")({
  head: () => pageMeta("Acceso a formularios · ficha"),
  beforeLoad: () => { throw redirect({ to: "/app", replace: true }); },
});
