import { createFileRoute } from "@tanstack/react-router";
import { FormsPanel } from "@/components/admin/FormsPanel";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/")({ head: () => pageMeta("Usuarios registrados"), component: FormsPanel });
