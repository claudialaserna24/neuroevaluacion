import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-lg font-semibold"
      >
        N
      </span>
      <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
        NEUROPLAN
      </span>
    </div>
  );
}