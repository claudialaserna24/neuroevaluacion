import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/hojas-de-ruta")({
  head: () => pageMeta("Acceso a formularios · admin.hojas-de-ruta"),
  beforeLoad: () => { throw redirect({ to: "/app/admin", replace: true }); },
});
