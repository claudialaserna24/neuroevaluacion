import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/onboarding")({ head: () => pageMeta("Bienvenida a formularios"), beforeLoad: () => { throw redirect({ to: "/app", replace: true }); } });
