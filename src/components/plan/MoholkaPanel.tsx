import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bot } from "lucide-react";

export function MoholkaPanel({
  open,
  onOpenChange,
  ready,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ready: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-4">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <SheetTitle className="font-serif text-xl">Moholka</SheetTitle>
          </div>
          <SheetDescription>
            {ready
              ? "Estoy aquí para acompañarte con la aplicación de tu Plan Interactivo."
              : "Moholka estará disponible cuando el Plan Interactivo haya sido generado."}
          </SheetDescription>
        </SheetHeader>
        <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
          Recuerda: Moholka orienta sobre la aplicación del Plan. No reemplaza el criterio clínico de un profesional ni realiza diagnósticos.
        </div>
      </SheetContent>
    </Sheet>
  );
}