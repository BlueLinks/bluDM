import type { ElementType, ReactNode } from "react";

export function OptionGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function PaletteButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "rounded-md border px-3 py-2 text-sm font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border bg-background text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </span>
    </button>
  );
}

export function CompactOptionButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function TextOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "rounded-md border px-2 py-1 text-xs font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
