import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Mail, Lock, User, Eye, EyeOff, Users, Stethoscope } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — NEUROPLAN" },
      {
        name: "description",
        content: "Ingresa o crea tu cuenta en NEUROPLAN para comenzar la evaluación.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? s.next
      : undefined,
  }),
  component: AuthPage,
});

type Tab = "login" | "register";
type Role = "usuario" | "administrador";

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
    <button
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
    </button>
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
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) return toast.error(error.message);
        onSuccess();
      }}
      className="flex flex-col gap-3 p-4"
    >
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
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="text-muted-foreground"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
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
        <button type="button" className="font-medium text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>

      <SocialDivider />
      <GoogleButton next={next} />
    </form>
  );
}

function RegisterForm({ onSuccess, next }: { onSuccess: () => void; next?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>("usuario");
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + (next ?? "/app"),
            data: { full_name: name, role },
          },
        });
        setLoading(false);
        if (error) return toast.error(error.message);
        toast.success("Cuenta creada. Revisa tu correo para confirmar.");
        onSuccess();
      }}
      className="flex flex-col gap-3 p-4"
    >
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
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="text-muted-foreground"
          >
            {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
      />

      <div className="mt-2">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quiero registrarme como
        </p>
        <div className="grid grid-cols-2 gap-3">
          <RoleCard
            selected={role === "usuario"}
            onClick={() => setRole("usuario")}
            icon={<Users className="h-5 w-5" />}
            title="Padre / Madre"
            subtitle="Familia"
          />
          <RoleCard
            selected={role === "administrador"}
            onClick={() => setRole("administrador")}
            icon={<Stethoscope className="h-5 w-5" />}
            title="Neuropsicólogo"
            subtitle="Administrador"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-3 rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        {loading ? "Creando..." : "Crear cuenta"}
      </button>

      <SocialDivider />
      <GoogleButton next={next} />
    </form>
  );
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition",
        selected
          ? "border-primary bg-accent ring-2 ring-primary/30"
          : "border-border bg-background hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-primary",
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}

function SocialDivider() {
  return (
    <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      O continúa con
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton({ next }: { next?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin + (next ?? "/app"),
        });
        if (result.error) toast.error(result.error.message ?? "No se pudo iniciar sesión con Google");
      }}
      className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-medium text-foreground transition hover:bg-muted"
    >
      <GoogleIcon />
      Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.7 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.5 36.4 44 30.7 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}