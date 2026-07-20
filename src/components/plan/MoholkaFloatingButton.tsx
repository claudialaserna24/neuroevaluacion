import { useState } from "react";
import { MoholkaPanel } from "./MoholkaPanel";

export function MoholkaFloatingButton({
  ready,
  patientId,
}: {
  ready: boolean;
  patientId: string;
}) {
  const [open, setOpen] = useState(false);
  if (!ready) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Moholka"
        className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-primary/40 transition hover:opacity-95 sm:bottom-6"
      >
        <span aria-hidden>🤖</span>
        <span>Moholka</span>
      </button>
      <MoholkaPanel open={open} onOpenChange={setOpen} ready={ready} patientId={patientId} />
    </>
  );
}