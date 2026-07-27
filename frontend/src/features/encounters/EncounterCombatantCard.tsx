import { Check, HeartPulse, MoreHorizontal, Pencil, Shield, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { InitialsAvatar, StatChip } from "../../components/shared/displayPrimitives";
import { Button, Checkbox } from "../../components/ui";
import { effectiveAC, effectiveMaxHP } from "../../lib/domain/combat";
import type { Creature, EncounterCombatant, EncounterRunCombatant, Player } from "../../types";
import { combatantPlayerClassLevel, playerClassLevel } from "./domain";

export type CombatantCardStat = {
  label: string;
  value: ReactNode;
  icon?: typeof Shield;
};

export function CombatantCard({
  actions,
  avatarClassName = "",
  avatarSrc,
  badge,
  className = "",
  compact = false,
  fallback,
  meta,
  name,
  quantity,
  role,
  selected = false,
  stats,
  statsClassName = "",
  tone = "neutral",
}: {
  actions?: ReactNode;
  avatarClassName?: string;
  avatarSrc?: string;
  badge?: ReactNode;
  className?: string;
  compact?: boolean;
  fallback: string;
  meta: string;
  name: string;
  quantity?: ReactNode;
  role?: string;
  selected?: boolean;
  stats: CombatantCardStat[];
  statsClassName?: string;
  tone?: "neutral" | "player" | "friendly" | "enemy";
}) {
  return (
    <article
      className={[
        "combatant-row grid min-w-0 rounded-md border bg-background text-sm",
        compact ? "gap-2 p-2" : "gap-3 p-3",
        selected ? "border-primary bg-primary/10" : toneBorder(tone),
        className,
      ].join(" ")}
    >
      <div
        className={[
          "grid min-w-0",
          compact ? "gap-2 sm:grid-cols-[minmax(11rem,1fr)_auto] sm:items-center" : "gap-3",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <InitialsAvatar
            className={avatarClassName}
            name={name || fallback}
            size={compact ? "sm" : "md"}
            src={avatarSrc}
          />
          <div className="min-w-0">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{meta}</div>
          </div>
        </div>
        <div className={["flex min-w-0 flex-wrap items-center gap-2", statsClassName].join(" ")}>
          {stats.map((stat, index) => (
            <CombatantStat key={`${stat.label}-${index}`} compact={compact} stat={stat} />
          ))}
          {role ? (
            <StatChip className={compact ? "py-0.5" : ""} label={role} tone="custom" />
          ) : null}
          {typeof quantity === "string" || typeof quantity === "number" ? (
            <StatChip label={quantity} tone="metadata" />
          ) : quantity ? (
            quantity
          ) : null}
          {badge}
          {actions}
        </div>
      </div>
    </article>
  );
}

export function PlayerCombatantCard({
  player,
  actions,
  compact = false,
}: {
  player: Player;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <CombatantCard
      actions={actions}
      avatarSrc={avatarImageSrc(player.avatarAssetId, player.avatarUrl)}
      compact={compact}
      fallback={initials(player.characterName)}
      meta={playerClassLevel(player)}
      name={player.characterName}
      stats={[
        { icon: Shield, label: "AC", value: player.armorClass },
        {
          icon: HeartPulse,
          label: "HP",
          value: `${player.currentHitPoints}/${player.maxHitPoints}`,
        },
      ]}
      tone="player"
    />
  );
}

export function CreatureCombatantCard({
  creature,
  actions,
  badge,
  className = "",
  compact = false,
  quantity,
  role,
  showChallengeRating = true,
  statsClassName = "",
}: {
  creature: Creature;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  compact?: boolean;
  quantity?: ReactNode;
  role?: string;
  showChallengeRating?: boolean;
  statsClassName?: string;
}) {
  return (
    <CombatantCard
      actions={actions}
      avatarSrc={avatarImageSrc(creature.imageAssetId, creature.avatarUrl)}
      badge={badge}
      className={className}
      compact={compact}
      fallback={creature.name.slice(0, 2).toUpperCase()}
      meta={creatureMeta(creature)}
      name={creature.name}
      quantity={quantity}
      role={role ?? creatureRole(creature)}
      statsClassName={statsClassName}
      stats={[
        ...(showChallengeRating
          ? [{ icon: Sparkles, label: "CR", value: creature.challengeRating || "0" }]
          : []),
        { icon: Shield, label: "AC", value: creature.armorClass },
        { icon: HeartPulse, label: "HP", value: creature.hitPoints },
      ]}
      tone="enemy"
    />
  );
}

export function EncounterCombatantCard({
  combatant,
  sideTone,
  onEdit,
  onRemove,
}: {
  combatant: EncounterCombatant;
  sideTone: "player" | "friendly" | "enemy";
  onEdit?: (combatant: EncounterCombatant) => void;
  onRemove?: (combatant: EncounterCombatant) => void;
}) {
  return (
    <CombatantCard
      actions={
        onEdit || onRemove ? (
          <CombatantActions
            ghost
            onEdit={onEdit ? () => onEdit(combatant) : undefined}
            onRemove={onRemove ? () => onRemove(combatant) : undefined}
          />
        ) : null
      }
      avatarClassName="h-10 w-10"
      avatarSrc={combatant.avatarUrl}
      className={[
        sideTone === "enemy"
          ? "min-h-14 border-l-2 border-l-destructive"
          : sideTone === "friendly"
            ? "min-h-[3.5625rem]"
            : "min-h-[3.6875rem]",
        "sm:[&>div]:grid-cols-[minmax(11rem,1fr)_16.5625rem]",
      ].join(" ")}
      compact
      fallback={combatant.displayName.slice(0, 2).toUpperCase()}
      meta={combatantSubtitle(combatant, sideTone)}
      name={combatant.displayName}
      stats={[
        { icon: Shield, label: "AC", value: combatant.armorClass },
        {
          icon: HeartPulse,
          label: "HP",
          value: `${combatant.currentHitPoints} / ${combatant.maxHitPoints}`,
        },
      ]}
      statsClassName="!gap-6 [&>span.rounded-full]:px-2.5"
      tone={sideTone}
    />
  );
}

export function RunTargetCombatantCard({ combatant }: { combatant: EncounterRunCombatant }) {
  return (
    <CombatantCard
      avatarSrc={combatant.avatarUrl}
      fallback={combatant.displayName.slice(0, 2).toUpperCase()}
      meta="Targeting"
      name={combatant.displayName}
      stats={[
        { icon: Shield, label: "AC", value: effectiveAC(combatant) },
        {
          icon: HeartPulse,
          label: "HP",
          value: `${combatant.currentHitPoints}/${effectiveMaxHP(combatant)}`,
        },
      ]}
      tone={combatant.side}
    />
  );
}

export function CombatantQuantityControl({
  compact = false,
  label = "Qty",
  value,
  onChange,
}: {
  compact?: boolean;
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => onChange(Math.max(1, next));
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card text-xs">
      <span className={compact ? "px-1.5 text-muted-foreground" : "px-2 text-muted-foreground"}>
        {label}
      </span>
      <button
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={[
          "grid place-items-center border-l border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          compact ? "h-6 w-5" : "h-8 w-8",
        ].join(" ")}
        type="button"
        onClick={() => update(value - 1)}
      >
        -
      </button>
      <input
        aria-label={label}
        className={[
          "border-x border-border bg-background text-center font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30",
          compact ? "h-6 w-6" : "h-8 w-10",
        ].join(" ")}
        min={1}
        type="number"
        value={value}
        onChange={(event) => update(Number(event.target.value) || 1)}
      />
      <button
        aria-label={`Increase ${label.toLowerCase()}`}
        className={[
          "grid place-items-center text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          compact ? "h-6 w-5" : "h-8 w-8",
        ].join(" ")}
        type="button"
        onClick={() => update(value + 1)}
      >
        +
      </button>
    </span>
  );
}

export function RolledHpToggle({
  checked,
  compact = false,
  onChange,
}: {
  checked: boolean;
  compact?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox label="Roll HP at start" checked={checked} compact={compact} onChange={onChange} />
  );
}

export function CombatantActions({
  compact = false,
  ghost = false,
  onEdit,
  onRemove,
}: {
  compact?: boolean;
  ghost?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className={[
          "inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden",
          compact ? "h-7" : "h-8",
          ghost ? "border border-transparent bg-transparent" : "border border-border bg-surface",
        ].join(" ")}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 grid min-w-28 gap-1 rounded-md border border-border bg-card p-1 shadow-md">
        {onEdit ? (
          <button
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            type="button"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        ) : null}
        {onRemove ? (
          <button
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            type="button"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        ) : null}
      </div>
    </details>
  );
}

export function IconRemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      aria-label={label}
      type="button"
      icon={Trash2}
      size="sm"
      variant="ghost"
      onClick={onClick}
    />
  );
}

export function SelectedBadge() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
      <Check className="h-4 w-4" />
    </span>
  );
}

function CombatantStat({ compact, stat }: { compact: boolean; stat: CombatantCardStat }) {
  return (
    <StatChip
      className={compact ? "py-0.5" : ""}
      icon={stat.icon}
      label={stat.label}
      tone={combatantStatTone(stat.label)}
      value={stat.value}
    />
  );
}

function combatantStatTone(label: string) {
  if (label === "AC") return "primary";
  if (label === "HP") return "tertiary";
  if (label === "CR") return "custom";
  return "metadata";
}

function toneBorder(tone: "neutral" | "player" | "friendly" | "enemy") {
  if (tone === "friendly") return "border-companion-shared/25";
  if (tone === "enemy") return "border-destructive/25";
  if (tone === "player") return "border-border";
  return "border-border";
}

function creatureMeta(creature: Creature) {
  return [
    creature.size.trim(),
    creature.creatureType.trim(),
    creature.challengeRating.trim() ? `CR ${creature.challengeRating.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function combatantSubtitle(
  combatant: EncounterCombatant,
  sideTone: "player" | "friendly" | "enemy",
) {
  if (sideTone === "player") return combatantPlayerClassLevel(combatant);
  const creature = combatant.snapshot?.creature;
  if (creature && typeof creature === "object") {
    const record = creature as Record<string, unknown>;
    return [
      typeof record.size === "string" ? record.size : "",
      typeof (record.creatureType ?? record.creature_type) === "string"
        ? String(record.creatureType ?? record.creature_type)
        : "",
      sideTone === "enemy" &&
      typeof (record.challengeRating ?? record.challenge_rating) === "string"
        ? `CR ${String(record.challengeRating ?? record.challenge_rating)}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return sideTone === "friendly" ? "Ally" : "Enemy";
}

export function combatantRole(combatant: EncounterCombatant) {
  const name = combatant.displayName.toLowerCase();
  if (name.includes("boss") || name.includes("captain") || name.includes("chief")) return "Leader";
  if (name.includes("wolf") || name.includes("bear") || name.includes("brute")) return "Brute";
  if (name.includes("archer") || name.includes("scout")) return "Skirmisher";
  return "Foe";
}

export function creatureRole(creature: Creature) {
  const haystack = `${creature.name} ${creature.creatureType}`.toLowerCase();
  if (haystack.includes("captain") || haystack.includes("chief") || haystack.includes("mage")) {
    return "Leader";
  }
  if (haystack.includes("bear") || haystack.includes("ogre") || haystack.includes("troll")) {
    return "Brute";
  }
  if (haystack.includes("scout") || haystack.includes("wolf") || haystack.includes("spider")) {
    return "Skirmisher";
  }
  return "Foe";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
