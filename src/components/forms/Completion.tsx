import { CheckCircle2 } from "lucide-react";

export function Completion() {
  return <article className="mx-auto max-w-2xl py-8 sm:py-12">
    <CheckCircle2 className="mb-6 h-10 w-10 text-primary" aria-hidden />
    <h1 className="font-serif text-3xl leading-tight">¡Completaste los tres formularios!</h1>
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">Gracias por tu tiempo y dedicación. Hemos recibido tu información de forma segura.</p>
    <div className="my-8 grid gap-4">
      {[
        ["Reflejos primitivos", "nos permite conocer cómo se están integrando los reflejos que sirven de base al movimiento, la postura y la regulación de tu hijo o hija."],
        ["Perfil cognitivo", "nos ayuda a comprender cómo procesa la información y cómo aprende."],
        ["Evaluación funcional sensorial", "nos muestra cómo responde a los estímulos de su entorno en la vida diaria."],
      ].map(([title, text]) => <div key={title} className="rounded-lg border border-border bg-card p-5 text-sm leading-relaxed"><strong className="text-primary">{title}:</strong> {text}</div>)}
    </div>
    <p className="text-base leading-relaxed">Con esta información, Mónika elaborará el plan personalizado. Pronto te contactaremos.</p>
  </article>;
}