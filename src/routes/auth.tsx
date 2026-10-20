import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/page-meta";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => pageMeta("Ingresar", "Ingresa o crea tu cuenta familiar para completar tus formularios."),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") && !s.next.includes("\\") ? s.next : undefined,
  }),
  component: AuthPage,
});

type Tab = "login" | "register";

function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const goNext = (fallback: "/app" | "/onboarding") => {
    if (next) {
      // Same-origin relative path already validated by validateSearch.
      window.location.href = next;
      return;
    }
    navigate({ to: fallback });
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <Link to="/" className="mx-auto">
          <Logo />
        </Link>

        {/* Tabs */}
        <div className="rounded-full bg-card p-1.5 shadow-sm ring-1 ring-border/70">
          <div className="grid grid-cols-2 gap-1">
            <TabButton active={tab === "login"} onClick={() => setTab("login")}>
              Ingresar
            </TabButton>
            <TabButton active={tab === "register"} onClick={() => setTab("register")}>
              Registrarme
            </TabButton>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-2 shadow-sm ring-1 ring-border/50">
          {tab === "login" ? (
            <LoginForm onSuccess={() => goNext("/app")} next={next} />
          ) : (
            <RegisterForm onSuccess={() => goNext("/app")} next={next} />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Al continuar aceptas nuestros términos y política de privacidad.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2.5 text-sm font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function FloatingField({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  rightSlot,
  autoComplete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  rightSlot?: ReactNode;
  autoComplete?: string;
}) {
  const filled = value.length > 0;
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3 ring-1 ring-border/70 focus-within:ring-2 focus-within:ring-primary/40">
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <div className="relative flex-1">
        <span
          className={cn(
            "pointer-events-none absolute left-0 origin-left text-muted-foreground transition-all",
            filled ? "top-0 text-[10px] uppercase tracking-wide" : "top-2 text-sm",
          )}
        >
          {label}
        </span>
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="mt-3 block w-full bg-transparent text-sm font-medium text-foreground outline-none"
        />
      </div>
      {rightSlot}
    </label>
  );
}

function LoginForm({ onSuccess, next }: { onSuccess: () => void; next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          const msg =
            error.message.toLowerCase().includes("invalid")
              ? "Correo o contraseña incorrectos."
              : error.message;
          setErrorMsg(msg);
          toast.error(msg);
          return;
        }
        onSuccess();
      }}
      className="flex flex-col gap-3 p-4"
    >
      {errorMsg && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}
      <FloatingField
        icon={Mail}
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <FloatingField
        icon={Lock}
        label="Contraseña"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        rightSlot={
          <Button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="text-muted-foreground"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        }
      />

      <div className="flex items-center justify-between px-1 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Recuérdame
        </label>
        <Button type="button" variant="link" disabled={recovering} onClick={async () => {
          if (!email.trim()) { setErrorMsg("Ingresa tu correo para recuperar la contraseña."); return; }
          setRecovering(true);
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
          setRecovering(false);
          if (error) setErrorMsg("No pudimos enviar el correo. Intenta nuevamente.");
          else { setErrorMsg(null); toast.success("Si el correo está registrado, recibirás un enlace para recuperar tu contraseña."); }
        }} className="font-medium text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Button>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>


    </form>
  );
}

function RegisterForm({ onSuccess, next }: { onSuccess: () => void; next?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        setInfoMsg(null);
        if (!name.trim()) {
          setErrorMsg("Ingresa tu nombre completo.");
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setErrorMsg("Ingresa un correo electrónico válido.");
          return;
        }
        if (password.length < 6) {
          setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin,
            data: { full_name: name, role: "usuario" },
          },
        });
        setLoading(false);
        if (error) {
          let msg = error.message;
          if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
            msg = "Este correo ya está registrado. Ingresa con tu contraseña.";
          } else if (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("pwned")) {
            msg = "La contraseña es demasiado débil. Prueba una más segura.";
          }
          setErrorMsg(msg);
          toast.error(msg);
          return;
        }
        if (data.session) {
          toast.success("¡Cuenta creada! Bienvenido/a.");
          onSuccess();
        } else {
          setInfoMsg("Cuenta creada. Revisa tu correo para confirmar antes de ingresar.");
          toast.success("Revisa tu correo para confirmar tu cuenta.");
        }
      }}
      className="flex flex-col gap-3 p-4"
    >
      {errorMsg && (
        <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {infoMsg}
        </div>
      )}
      <FloatingField
        icon={User}
        label="Nombre completo"
        value={name}
        onChange={setName}
        autoComplete="name"
      />
      <FloatingField
        icon={Mail}
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />
      <FloatingField
        icon={Lock}
        label="Contraseña"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        rightSlot={
          <Button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="text-muted-foreground"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        }
      />

      <Button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {loading ? "Creando..." : "Crear cuenta"}
      </Button>


    </form>
  );
}

