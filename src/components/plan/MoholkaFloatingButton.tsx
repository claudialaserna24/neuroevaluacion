import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { MoholkaPanel } from "./MoholkaPanel";

export function MoholkaFloatingButton({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Moholka"
        className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg ring-1 ring-primary/40 transition hover:opacity-95 sm:bottom-6"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">
          Recuerda que estoy aquí para ayudarte
        </span>
        <span className="sm:hidden">💬 Ayuda</span>
      </button>
      <MoholkaPanel open={open} onOpenChange={setOpen} ready={ready} />
    </>
  );
}