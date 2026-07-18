import type React from "react";

type Tone =
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
  | "primary"
  | "published"
  | "secondary"
  | "shared"
  | "success"
  | "tertiary"
  | "warning";

const toneClasses: Record<Tone, string> = {
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
  primary: "border-primary/35 bg-primary/14 text-primary",
  published: "border-companion-published/35 bg-companion-published/14 text-companion-published",
  secondary: "border-secondary/35 bg-secondary/14 text-secondary",
  shared: "border-companion-shared/35 bg-companion-shared/14 text-companion-shared",
  success: "border-success/35 bg-success/14 text-success",
  tertiary: "border-tertiary/35 bg-tertiary/14 text-tertiary",
  warning: "border-warning/35 bg-warning/14 text-warning",
};

const avatarSizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-lg",
  xl: "h-28 w-28 text-2xl",
};

export function InitialsAvatar({
  alt = "",
  className = "",
  name,
  size = "md",
  src,
  tone = "primary",
}: {
  alt?: string;
  className?: string;
  name: string;
  size?: keyof typeof avatarSizes;
  src?: string;
  tone?: Extract<
    Tone,
    | "custom"
    | "imported"
    | "metadata"
    | "official"
    | "personal"
    | "primary"
    | "secondary"
    | "shared"
    | "tertiary"
  >;
}) {
  return (
    <span
      className={[
        "grid shrink-0 place-items-center overflow-hidden rounded-md border font-bold uppercase shadow-sm",
        toneClasses[tone],
        avatarSizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {src ? (
        <img className="h-full w-full object-cover" src={src} alt={alt} loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function CharacterMetadataChip({
  children,
  tone = "metadata",
}: {
  children: React.ReactNode;
  tone?: Extract<Tone, "metadata" | "official" | "personal" | "shared" | "custom" | "imported">;
}) {
  return <StatChip tone={tone} label={children} />;
}

export function AbilityScoreCard({
  label,
  modifier,
  score,
}: {
  label: React.ReactNode;
  modifier: React.ReactNode;
  score: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold shadow-sm shadow-primary/10",
        toneClasses.secondary,
      ].join(" ")}
    >
      <span className="font-black uppercase">{label}</span>
      <span className="ml-1 text-foreground">{score}</span>
      <span className="ml-1 font-black text-secondary">{modifier}</span>
    </span>
  );
}

export function VitalStatCard({
  icon: Icon,
  label,
  size = "md",
  tone = "primary",
  value,
}: {
  icon?: React.ElementType;
  label: React.ReactNode;
  size?: "sm" | "md";
  tone?: Extract<Tone, "danger" | "primary" | "secondary" | "tertiary" | "warning">;
  value: React.ReactNode;
}) {
  const sizeClass =
    size === "sm"
      ? "grid justify-items-center gap-0.5 px-1 py-1 text-center xl:px-1.5 xl:py-1.5"
      : "px-2 py-2 text-center";
  return (
    <div className={["rounded-lg border shadow-sm", sizeClass, toneClasses[tone]].join(" ")}>
      <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function StatChip({
  className = "",
  icon: Icon,
  label,
  tone = "metadata",
  value,
}: {
  className?: string;
  icon?: React.ElementType;
  label: React.ReactNode;
  tone?: Tone;
  value?: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold shadow-[inset_0_1px_0_hsl(0_0%_100%/0.12)]",
        toneClasses[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {value !== undefined ? (
        <>
          <span className="sr-only">{readableChipText(label, value)}</span>
          <span aria-hidden="true">
            {label}
            <span className="text-foreground"> {value}</span>
          </span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}

export function PropertyCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      className={["rounded-md border px-2 py-2 text-center shadow-sm", toneClasses[tone]].join(" ")}
    >
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return "?";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function readableChipText(label: React.ReactNode, value?: React.ReactNode) {
  return [readableNodeText(label), readableNodeText(value)].filter(Boolean).join(" ");
}

function readableNodeText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(readableNodeText).filter(Boolean).join(" ");
  return "";
}
