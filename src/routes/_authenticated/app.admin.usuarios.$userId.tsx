import { createFileRoute } from "@tanstack/react-router";
import { FormsPanel } from "@/components/admin/FormsPanel";
import { pageMeta } from "@/lib/page-meta";
export const Route = createFileRoute("/_authenticated/app/admin/usuarios/$userId")({ head: () => pageMeta("Respuestas de la familia"), component: UserDetail });
function UserDetail() { const { userId } = Route.useParams(); return <FormsPanel userId={userId} />; }