import { ArrowRight, LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string | null;
  cta?: string;
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "muted";
  children?: React.ReactNode;
};

export function SummaryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  cta,
  to,
  params,
  search,
  onClick,
  disabled,
  tone = "default",
  children,
}: Props) {
  const base = cn(
    "flex h-full flex-col rounded-3xl p-5 shadow-sm ring-1 transition",
    tone === "primary"
      ? "bg-gradient-to-br from-primary/10 via-primary/5 to-background ring-primary/25"
      : tone === "muted"
        ? "bg-muted/40 ring-border/50"
        : "bg-card ring-border/50",
    !disabled && (to || onClick) && "hover:ring-primary/40",
    disabled && "opacity-60",
  );

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full",
            tone === "primary"
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {(to || onClick) && !disabled ? (
          <ArrowRight className="h-4 w-4 text-primary" />
        ) : null}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-serif text-lg leading-snug text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-3 flex-1">{children}</div> : null}
      {cta ? (
        <p className="mt-4 text-sm font-semibold text-primary">{cta}</p>
      ) : null}
    </>
  );

  if (disabled || (!to && !onClick)) {
    return <div className={base}>{inner}</div>;
  }
  if (to) {
    return (
      <Link
        to={to}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params={params as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search={search as any}
        className={base}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(base, "text-left")}>
      {inner}
    </button>
  );
}