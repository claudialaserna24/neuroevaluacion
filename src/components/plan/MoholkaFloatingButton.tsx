import { useEffect, useState } from "react";
import { MoholkaPanel } from "./MoholkaPanel";

export function MoholkaFloatingButton({
  ready,
  patientId,
  hideTrigger,
}: {
  ready: boolean;
  patientId: string;
  hideTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const onOpen = () => setOpen(true);
    window.addEventListener("moholka:open", onOpen);
    return () => window.removeEventListener("moholka:open", onOpen);
  }, [ready]);
  if (!ready) return null;
  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir Moholka"
          className="fixed bottom-6 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-primary/40 transition hover:opacity-95"
        >
          <span aria-hidden>🤖</span>
          <span>Moholka</span>
        </button>
      )}
      <MoholkaPanel open={open} onOpenChange={setOpen} ready={ready} patientId={patientId} />
    </>
  );
}