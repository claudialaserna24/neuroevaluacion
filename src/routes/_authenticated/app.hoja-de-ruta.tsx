import { createFileRoute } from "@tanstack/react-router";
import { FamilyDashboard } from "@/components/forms/FamilyDashboard";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/hoja-de-ruta")({ head: () => pageMeta("Hoja de ruta"), component: FamilyDashboard });
