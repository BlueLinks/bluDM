import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronsUpDown, HeartPulse, Info, Shield, Skull, X } from "lucide-react";
import React from "react";

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-7xl gap-6">{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  copy,
  action
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

export function SectionPanel({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h3 className="font-semibold">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function DashboardCard({ icon: Icon, title, value, copy }: { icon: React.ElementType; title: string; value: number; copy: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <Icon className="h-5 w-5 text-accent" />
        <span className="text-3xl font-semibold">{value}</span>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

export function CharacterVitals({
  armorClass,
  currentHitPoints,
  maxHitPoints,
  temporaryHitPoints = 0
}: {
  armorClass: number;
  currentHitPoints: number;
  maxHitPoints: number;
  temporaryHitPoints?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <VitalPill icon={Shield} label="AC" value={armorClass} tone="shield" />
      <VitalPill icon={HeartPulse} label="HP" value={`${currentHitPoints}/${maxHitPoints}`} tone="heart" />
      <VitalPill icon={HeartPulse} label="Temp" value={temporaryHitPoints} tone="temp" />
    </div>
  );
}

function VitalPill({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; tone: "shield" | "heart" | "temp" }) {
  const tones = {
    shield: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    heart: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
    temp: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
  };
  return (
    <div className={["rounded-md border px-2 py-2 text-center", tones[tone]].join(" ")}>
      <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

export function DeathSaveTrack({
  successes,
  failures,
  onUndoSuccess,
  onUndoFailure
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

function DeathSaveSlots({ count, success = false, onUndo }: { count: number; success?: boolean; onUndo?: () => void }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((index) => {
        const filled = index < count;
        const className = filled
          ? success
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300"
          : "border-border bg-muted text-muted-foreground";
        return (
          <button
            key={index}
            type="button"
            disabled={!filled || !onUndo}
            className={["grid h-7 w-7 place-items-center rounded-full border text-xs transition disabled:cursor-default", className, filled && onUndo ? "hover:scale-105" : ""].join(" ")}
            onClick={filled ? onUndo : undefined}
            title={filled && onUndo ? "Undo this death save mark" : undefined}
          >
            {filled ? success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, copy }: { icon: React.ElementType; title: string; copy: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-accent" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

export function EmptyMini({ copy }: { copy: string }) {
  return <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">{copy}</p>;
}

export function MutedPanel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">{children}</div>;
}

export function Callout({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <div className={["rounded-md border px-4 py-3 text-sm", tone === "danger" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-card"].join(" ")}>
      {children}
    </div>
  );
}

export function FormSection({ title, children, help }: { title: string; children: React.ReactNode; help?: string }) {
  return (
    <fieldset className="grid gap-5 rounded-xl border border-border bg-background p-6 shadow-sm">
      <legend className="px-2 text-sm font-bold uppercase tracking-wide text-accent">
        <span className="inline-flex items-center gap-2">{title}{help && <HelpTip text={help} />}</span>
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({ label, children, className = "", help }: { label: string; children: React.ReactNode; className?: string; help?: string }) {
  return (
    <label className={["grid gap-2 text-sm font-medium", className].filter(Boolean).join(" ")}>
      <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">{label}{help && <HelpTip text={help} />}</span>
      {children}
    </label>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-card p-2 text-xs normal-case leading-5 text-card-foreground shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition placeholder:italic placeholder:text-muted-foreground/70 focus:ring-2", props.className].filter(Boolean).join(" ")} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={["rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none ring-primary/30 transition placeholder:italic placeholder:text-muted-foreground/70 focus:ring-2", props.className].filter(Boolean).join(" ")} />;
}

export function Select({
  value,
  placeholder,
  options,
  onValueChange
}: {
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string; icon?: React.ElementType }>;
  onValueChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const SelectedIcon = selected?.icon;
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none ring-primary/30 transition hover:bg-muted/60 focus:ring-2">
        <span className="flex min-w-0 items-center gap-2">
          {SelectedIcon && <SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-xl">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none hover:bg-muted focus:bg-muted data-[state=checked]:font-semibold"
                key={option.value}
                value={option.value}
              >
                {option.icon && React.createElement(option.icon, { className: "mr-2 h-4 w-4 text-muted-foreground" })}
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <input className="h-4 w-4 accent-primary" checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Button({
  children,
  icon: Icon,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ElementType;
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90"
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm"
  };
  return (
    <button
      {...props}
      className={["inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-60", variants[variant], sizes[size], props.className]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "friendly" }) {
  return (
    <span className={["inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", tone === "friendly" ? "bg-sky-500/15 text-sky-700 dark:text-sky-200" : "bg-muted text-muted-foreground"].join(" ")}>
      {children}
    </span>
  );
}
