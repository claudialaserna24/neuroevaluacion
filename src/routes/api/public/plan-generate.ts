import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/plan-generate")({ server: { handlers: { POST: async () => new Response("Función desactivada", { status: 410 }) } } });
