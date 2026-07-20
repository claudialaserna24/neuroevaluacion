import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, BookOpen, Loader2, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getMoholkaHistory } from "@/lib/plan/moholka.functions";
import { getManualDownloadUrl } from "@/lib/plan/plan.functions";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  manual?: boolean;
};

const INITIAL_ASSISTANT = `Hola, soy **Moholka**.

Estoy aquí para ayudarte a comprender y aplicar tu Plan Interactivo NEUROPLAN durante las primeras cuatro semanas.

Puedo ayudarte a entender los ejercicios, la organización de la rutina y responder dudas relacionadas con tu Plan.`;

const QUICK_ACTIONS = [
  "📘 ¿Cómo empiezo el Plan?",
  "🧠 Explícame esta ficha.",
  "📅 ¿Cómo organizo la rutina?",
];

function extractManualFlag(text: string): { text: string; manual: boolean } {
  if (text.includes("<!--manual-->")) {
    return { text: text.replace(/\n?\n?<!--manual-->/g, "").trim(), manual: true };
  }
  return { text, manual: false };
}

function renderMarkdown(text: string) {
  // Renderizado minimalista: **negrita** y saltos de línea.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function MoholkaPanel({
  open,
  onOpenChange,
  ready,
  patientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ready: boolean;
  patientId?: string;
}) {
  const fetchHistory = useServerFn(getMoholkaHistory);
  const fetchManual = useServerFn(getManualDownloadUrl);

  const history = useQuery({
    queryKey: ["moholka-history", patientId],
    queryFn: () => fetchHistory({ data: { patientId: patientId! } }),
    enabled: Boolean(open && ready && patientId),
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hidratar mensajes desde historial cuando llega.
  useEffect(() => {
    if (history.data) {
      const mapped: Msg[] = history.data.messages.map((m) => {
        const { text, manual } = extractManualFlag(m.content);
        return { id: m.id, role: m.role, content: text, manual };
      });
      setMessages(mapped);
    }
  }, [history.data]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Focus textarea
  useEffect(() => {
    if (open && ready) {
      const t = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open, ready]);

  const openManual = async () => {
    if (!patientId) return;
    setManualBusy(true);
    try {
      const res = await fetchManual({ data: { patientId } });
      if (res.available) window.open(res.url, "_blank", "noopener");
    } finally {
      setManualBusy(false);
    }
  };

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending || !patientId) return;
    setInput("");
    const userMsg: Msg = {
      id: `u_${Date.now()}`,
      role: "user",
      content: clean,
    };
    const assistantId = `a_${Date.now()}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setSending(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Sesión expirada");

      const res = await fetch("/api/moholka", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patientId, message: clean }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const { text: cleanText, manual } = extractManualFlag(acc);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId ? { ...msg, content: cleanText, manual } : msg,
          ),
        );
      }
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  "No pude responder en este momento. Por favor intenta nuevamente en unos segundos.",
              }
            : msg,
        ),
      );
      console.error("[moholka] send failed", e);
    } finally {
      setSending(false);
    }
  };

  const showIntro = !history.isLoading && messages.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <SheetTitle className="font-serif text-xl leading-tight">Moholka</SheetTitle>
              <SheetDescription className="text-xs">
                Asistente NEUROPLAN — acompañamiento del Plan Interactivo
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {!ready ? (
          <div className="flex-1 p-6 text-sm text-muted-foreground">
            Moholka estará disponible cuando el Plan Interactivo haya sido generado.
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {history.isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {showIntro && (
                <>
                  <AssistantBubble
                    text={INITIAL_ASSISTANT}
                    onOpenManual={openManual}
                    manualBusy={manualBusy}
                    showManual={false}
                  />
                  <div className="flex flex-col gap-2">
                    {QUICK_ACTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage(q)}
                        className="rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm text-foreground transition hover:bg-primary/10 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantBubble
                    key={m.id}
                    text={m.content || "…"}
                    onOpenManual={openManual}
                    manualBusy={manualBusy}
                    showManual={!!m.manual}
                  />
                ),
              )}

              {sending &&
                messages[messages.length - 1]?.role === "assistant" &&
                !messages[messages.length - 1]?.content && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Moholka está pensando…
                  </div>
                )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="border-t border-border/50 px-3 py-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  rows={1}
                  disabled={sending}
                  placeholder="Escríbele a Moholka…"
                  className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Enviar"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Moholka orienta sobre la aplicación del Plan. No reemplaza el criterio clínico profesional ni realiza diagnósticos.
              </p>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AssistantBubble({
  text,
  showManual,
  onOpenManual,
  manualBusy,
}: {
  text: string;
  showManual: boolean;
  onOpenManual: () => void;
  manualBusy: boolean;
}) {
  return (
    <div className="max-w-[92%] space-y-2 text-sm text-foreground">
      <div className="whitespace-pre-wrap leading-relaxed">
        {renderMarkdown(text)}
      </div>
      {showManual && (
        <button
          type="button"
          onClick={onOpenManual}
          disabled={manualBusy}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {manualBusy ? "Abriendo…" : "📘 Ver Manual Oficial de Ejercicios"}
        </button>
      )}
    </div>
  );
}