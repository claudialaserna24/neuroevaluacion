import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/wompi-webhook")({ server: { handlers: { POST: async () => new Response("Función desactivada", { status: 410 }) } } });
