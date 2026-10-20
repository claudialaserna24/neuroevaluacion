import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/moholka")({ server: { handlers: { POST: async () => new Response("Función desactivada", { status: 410 }) } } });
