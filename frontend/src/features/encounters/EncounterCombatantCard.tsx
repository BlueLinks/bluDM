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
  avatarSrc,
  badge,
  fallback,
  meta,
  name,
  quantity,
  role,
  selected = false,
  stats,
  tone = "neutral",
}: {
  actions?: ReactNode;
  avatarSrc?: string;
  badge?: ReactNode;
  fallback: string;
  meta: string;
  name: string;
  quantity?: ReactNode;
  role?: string;
  selected?: boolean;
  stats: CombatantCardStat[];
  tone?: "neutral" | "player" | "friendly" | "enemy";
}) {
  return (
    <article
      className={[
        "combatant-row grid min-w-0 gap-3 rounded-md border bg-background p-3 text-sm",
        selected ? "border-primary bg-primary/10" : toneBorder(tone),
      ].join(" ")}
    >
      <div className="grid min-w-0 gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <InitialsAvatar name={name || fallback} src={avatarSrc} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-xs text-muted-foreground">{meta}</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {stats.map((stat, index) => (
            <CombatantStat key={`${stat.label}-${index}`} stat={stat} />
          ))}
          {typeof quantity === "string" || typeof quantity === "number" ? (
            <StatChip label={quantity} tone="metadata" />
          ) : quantity ? (
            quantity
          ) : null}
          {role ? <StatChip label={role} tone="custom" /> : null}
          {badge}
          {actions}
        </div>
      </div>
    </article>
  );
}

export function PlayerCombatantCard({ player, actions }: { player: Player; actions?: ReactNode }) {
  return (
    <CombatantCard
      actions={actions}
      avatarSrc={avatarImageSrc(player.avatarAssetId, player.avatarUrl)}
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
  quantity,
  role,
}: {
  creature: Creature;
  actions?: ReactNode;
  badge?: ReactNode;
  quantity?: ReactNode;
  role?: string;
}) {
  return (
    <CombatantCard
      actions={actions}
      avatarSrc={avatarImageSrc(creature.imageAssetId, creature.avatarUrl)}
      badge={badge}
      fallback={creature.name.slice(0, 2).toUpperCase()}
      meta={creatureMeta(creature)}
      name={creature.name}
      quantity={quantity}
      role={role ?? creatureRole(creature)}
      stats={[
        { icon: Sparkles, label: "CR", value: creature.challengeRating || "0" },
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
            onEdit={onEdit ? () => onEdit(combatant) : undefined}
            onRemove={onRemove ? () => onRemove(combatant) : undefined}
          />
        ) : null
      }
      avatarSrc={combatant.avatarUrl}
      fallback={combatant.displayName.slice(0, 2).toUpperCase()}
      meta={combatantSubtitle(combatant, sideTone)}
      name={combatant.displayName}
      quantity={sideTone === "enemy" ? "Qty 1" : undefined}
      role={sideTone === "enemy" ? combatantRole(combatant) : undefined}
      stats={[
        { icon: Shield, label: "AC", value: combatant.armorClass },
        {
          icon: HeartPulse,
          label: "HP",
          value: `${combatant.currentHitPoints}/${combatant.maxHitPoints}`,
        },
        ...(sideTone === "enemy"
          ? [{ icon: Sparkles, label: "CR", value: combatantChallenge(combatant) }]
          : []),
      ]}
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
  label = "Qty",
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => onChange(Math.max(1, next));
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card text-xs">
      <span className="px-2 text-muted-foreground">{label}</span>
      <button
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="grid h-8 w-8 place-items-center border-l border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        type="button"
        onClick={() => update(value - 1)}
      >
        -
      </button>
      <input
        aria-label={label}
        className="h-8 w-10 border-x border-border bg-background text-center font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
        min={1}
        type="number"
        value={value}
        onChange={(event) => update(Number(event.target.value) || 1)}
      />
      <button
        aria-label={`Increase ${label.toLowerCase()}`}
        className="grid h-8 w-8 place-items-center text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
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
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <Checkbox label="Roll HP" checked={checked} onChange={onChange} />;
}

export function CombatantActions({
  onEdit,
  onRemove,
}: {
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  return (
    <details className="relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface px-2 text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden">
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

function CombatantStat({ stat }: { stat: CombatantCardStat }) {
  return (
    <StatChip
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
      typeof record.creatureType === "string" ? record.creatureType : "",
      typeof record.challengeRating === "string" ? `CR ${record.challengeRating}` : "",
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

function combatantChallenge(combatant: EncounterCombatant) {
  const creature = combatant.snapshot?.creature;
  if (creature && typeof creature === "object") {
    const record = creature as Record<string, unknown>;
    return typeof record.challengeRating === "string" && record.challengeRating.trim()
      ? record.challengeRating
      : "0";
  }
  return "0";
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
