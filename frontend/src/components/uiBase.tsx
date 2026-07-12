import { Check, HeartPulse, Info, Shield, Skull, X } from "lucide-react";
import React from "react";
import { VitalStatCard } from "./shared/displayPrimitives";
export { Button } from "./uiButton";

const pageSizeClasses = {
  content: "max-w-5xl",
  default: "max-w-screen-2xl",
  full: "max-w-none",
  wide: "max-w-none",
  workspace: "max-w-[92rem]",
};

export function Page({
  children,
  className = "",
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: keyof typeof pageSizeClasses;
}) {
  return (
    <div className={["mx-auto grid w-full gap-6", pageSizeClasses[size], className].join(" ")}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-normal">{title}</h2>
        {copy && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionPanel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={["rounded-xl depth-raised p-3 sm:p-4 xl:p-5", className].filter(Boolean).join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2 xl:mb-4">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-semibold">{title}</h3>
        {action && <div className="ml-auto min-w-0">{action}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function DashboardCard({
  icon: Icon,
  title,
  value,
  copy,
}: {
  icon: React.ElementType;
  title: string;
  value: number;
  copy: string;
}) {
  return (
    <div className="depth-raised rounded-xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-3xl font-semibold">{value}</span>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="depth-flat rounded-lg px-2 py-2 text-center">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

export function CharacterVitals({
  armorClass,
  currentHitPoints,
  maxHitPoints,
  temporaryHitPoints = 0,
}: {
  armorClass: number;
  currentHitPoints: number;
  maxHitPoints: number;
  temporaryHitPoints?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <VitalPill icon={Shield} label="AC" value={armorClass} tone="shield" />
      <VitalPill
        icon={HeartPulse}
        label="HP"
        value={`${currentHitPoints}/${maxHitPoints}`}
        tone="heart"
      />
      <VitalPill icon={HeartPulse} label="Temp" value={temporaryHitPoints} tone="temp" />
    </div>
  );
}

function VitalPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: React.ReactNode;
  value: React.ReactNode;
  tone: "shield" | "heart" | "temp";
}) {
  const tones = {
    shield: "primary",
    heart: "tertiary",
    temp: "secondary",
  } as const;
  return <VitalStatCard icon={Icon} label={label} tone={tones[tone]} value={value} />;
}

export function DeathSaveTrack({
  successes,
  failures,
  onUndoSuccess,
  onUndoFailure,
}: {
  successes: number;
  failures: number;
  onUndoSuccess?: () => void;
  onUndoFailure?: () => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <DeathSaveSlots count={successes} success onUndo={onUndoSuccess} />
        <DeathSaveSlots count={failures} onUndo={onUndoFailure} />
      </div>
      <div className="text-[0.68rem] font-bold uppercase text-muted-foreground">Death saves</div>
    </div>
  );
}

function DeathSaveSlots({
  count,
  success = false,
  onUndo,
}: {
  count: number;
  success?: boolean;
  onUndo?: () => void;
}) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((index) => {
        const filled = index < count;
        const className = filled
          ? success
            ? "border-success bg-success/15 text-success"
            : "border-destructive bg-destructive/15 text-destructive"
          : "border-border bg-muted text-muted-foreground";
        return (
          <button
            key={index}
            type="button"
            disabled={!filled || !onUndo}
            className={[
              "grid h-7 w-7 place-items-center rounded-full border text-xs transition disabled:cursor-default",
              className,
              filled && onUndo ? "hover:scale-105" : "",
            ].join(" ")}
            onClick={filled ? onUndo : undefined}
            title={filled && onUndo ? "Undo this death save mark" : undefined}
          >
            {filled ? (
              success ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )
            ) : (
              <Skull className="h-4 w-4" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ElementType;
  title: string;
  copy: string;
}) {
  return (
    <div className="depth-featured rounded-xl border-dashed p-8 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

export function EmptyMini({ copy }: { copy: string }) {
  return (
    <p className="depth-flat rounded-md border-dashed p-4 text-sm text-muted-foreground">{copy}</p>
  );
}

export function MutedPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="depth-raised rounded-xl p-5 text-sm text-muted-foreground">{children}</div>
  );
}

export function Callout({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger" | "info" | "success" | "warning";
}) {
  return (
    <div
      className={[
        "depth-flat rounded-lg px-4 py-3 text-sm",
        tone === "danger"
          ? "border-destructive/35 bg-destructive/12 text-destructive"
          : tone === "info"
            ? "border-info/35 bg-info/12 text-info"
            : tone === "success"
              ? "border-success/35 bg-success/12 text-success"
              : tone === "warning"
                ? "border-warning/35 bg-warning/12 text-warning"
                : "border-border bg-surface text-foreground",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function FormSection({
  title,
  children,
  help,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  help?: string;
  className?: string;
}) {
  return (
    <fieldset
      className={["grid min-w-0 gap-5 rounded-xl depth-flat p-4 sm:p-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <legend className="px-2 text-sm font-bold uppercase tracking-wide text-accent">
        <span className="inline-flex items-center gap-2">
          {title}
          {help && <HelpTip text={help} />}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  children,
  className = "",
  help,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  help?: string;
}) {
  return (
    <label
      className={["grid min-w-0 gap-2 text-sm font-medium", className].filter(Boolean).join(" ")}
    >
      <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">
        {label}
        {help && <HelpTip text={help} />}
      </span>
      {children}
    </label>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md depth-raised p-2 text-xs normal-case leading-5 text-card-foreground group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "min-h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition placeholder:italic placeholder:text-muted-foreground/70 focus:ring-2",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none ring-primary/30 transition placeholder:italic placeholder:text-muted-foreground/70 focus:ring-2",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <input
        className="h-4 w-4 accent-primary"
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?:
    | "accent"
    | "custom"
    | "danger"
    | "default"
    | "draft"
    | "imported"
    | "info"
    | "metadata"
    | "official"
    | "personal"
    | "published"
    | "shared"
    | "success"
    | "warning";
}) {
  const tones = {
    accent: "border-primary/35 bg-primary/14 text-primary",
    custom: "border-companion-custom/35 bg-companion-custom/14 text-companion-custom",
    danger: "border-destructive/35 bg-destructive/14 text-destructive",
    default: "border-border bg-surface text-foreground",
    draft: "border-companion-draft/35 bg-companion-draft/14 text-companion-draft",
    imported: "border-companion-imported/35 bg-companion-imported/14 text-companion-imported",
    info: "border-info/35 bg-info/14 text-info",
    metadata: "border-companion-metadata/35 bg-companion-metadata/14 text-companion-metadata",
    official: "border-companion-official/35 bg-companion-official/14 text-companion-official",
    personal: "border-companion-personal/35 bg-companion-personal/14 text-companion-personal",
    published: "border-companion-published/35 bg-companion-published/14 text-companion-published",
    shared: "border-companion-shared/35 bg-companion-shared/14 text-companion-shared",
    success: "border-success/35 bg-success/14 text-success",
    warning: "border-warning/35 bg-warning/14 text-warning",
  };
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]",
        tones[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
