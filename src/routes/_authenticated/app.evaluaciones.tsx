import { createFileRoute } from "@tanstack/react-router";
import { FamilyDashboard } from "@/components/forms/FamilyDashboard";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/evaluaciones")({ head: () => pageMeta("Formularios"), component: FamilyDashboard });
