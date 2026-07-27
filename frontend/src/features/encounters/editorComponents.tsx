import { Check, HeartPulse, Plus, Shield, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { sourceBadgeClass } from "../../components/shared/sourceTones";
import {
  Button,
  Checkbox,
  EmptyMini,
  Field,
  FloatingInput,
  IconNumberField,
  Input,
  Sheet,
} from "../../components/ui";
import { creatureDefaultDisposition } from "../../lib/domain/forms";
import { combatantColors, defaultCombatantColor } from "../../lib/domain/options";
import type { Creature, DraftCombatant, EncounterCombatant } from "../../types";
import { EncounterCombatantCard } from "./EncounterCombatantCard";
import { creatureSummary } from "./domain";

export function CreatureEncounterAddRow({
  creature,
  campaignLinked,
  onAdd,
}: {
  creature: Creature;
  campaignLinked: boolean;
  onAdd: (side: "friendly" | "enemy", quantity: number, rolledHp: boolean) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [friendly, setFriendly] = useState(
    () => campaignLinked || creatureDefaultDisposition(creature) === "friendly",
  );
  const count = Math.max(1, Number(quantity) || 1);
  const side = friendly ? "friendly" : "enemy";
  const updateQuantity = (next: number) => setQuantity(String(Math.max(1, next)));
  useEffect(() => {
    setFriendly(campaignLinked || creatureDefaultDisposition(creature) === "friendly");
  }, [campaignLinked, creature.id]);
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CreatureAvatar creature={creature} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{creature.name}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{creatureSummary(creature, campaignLinked)}</span>
              {creature.readOnly && (
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 font-semibold",
                    sourceBadgeClass("official"),
                  ].join(" ")}
                >
                  Read-only
                </span>
              )}
            </div>
          </div>
        </div>
        <Checkbox label="Friendly" checked={friendly} onChange={setFriendly} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Qty">
          <div className="inline-flex overflow-hidden rounded-md border border-border bg-card">
            <button
              className="grid h-10 w-9 place-items-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              type="button"
              onClick={() => updateQuantity(count - 1)}
            >
              -
            </button>
            <Input
              className="h-10 min-h-0 w-12 rounded-none border-0 text-center font-semibold focus:ring-0"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <button
              className="grid h-10 w-9 place-items-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              type="button"
              onClick={() => updateQuantity(count + 1)}
            >
              +
            </button>
          </div>
        </Field>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          <Button
            className="whitespace-nowrap"
            type="button"
            icon={Plus}
            size="sm"
            onClick={() => onAdd(side, count, false)}
          >
            Add
          </Button>
          <Button
            className="whitespace-nowrap"
            type="button"
            icon={Sparkles}
            variant="secondary"
            size="sm"
            onClick={() => onAdd(side, count, true)}
          >
            Rolled HP
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreatureAvatar({ creature }: { creature: Creature }) {
  const src = avatarImageSrc(creature.imageAssetId, creature.avatarUrl);
  return <InitialsAvatar name={creature.name} src={src} />;
}

export function CombatantList({
  combatants,
  empty,
  sideTone,
  onEdit,
  onRemove,
}: {
  combatants: DraftCombatant[];
  empty: string;
  sideTone: "player" | "friendly" | "enemy";
  onEdit?: (combatant: DraftCombatant) => void;
  onRemove: (combatant: DraftCombatant) => void;
}) {
  if (combatants.length === 0) {
    return <EmptyMini copy={empty} />;
  }
  return (
    <div className="grid gap-0 [&>article]:rounded-none [&>article:first-child]:rounded-t-md [&>article:last-child]:rounded-b-md">
      {combatants.map((combatant) => (
        <EncounterCombatantCard
          key={combatant.id}
          combatant={combatant}
          sideTone={sideTone}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export function CombatantAvatar({ combatant }: { combatant: EncounterCombatant }) {
  const color = combatant.colorLabel.trim();
  const defaultAvatar = color === defaultCombatantColor;
  if (!color || defaultAvatar) {
    return (
      <InitialsAvatar
        className="rounded-md"
        name={combatant.displayName}
        size="md"
        src={combatant.avatarUrl}
      />
    );
  }
  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border-2 text-sm font-bold"
      style={{ backgroundColor: `${color}22`, borderColor: color, color }}
    >
      {combatant.avatarUrl ? (
        <img className="h-full w-full object-cover" src={combatant.avatarUrl} alt="" />
      ) : (
        combatant.displayName.slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

export function CombatantEditSheet({
  combatant,
  onOpenChange,
  onSave,
  onRemove,
}: {
  combatant: DraftCombatant | null;
  onOpenChange: (open: boolean) => void;
  onSave: (combatant: DraftCombatant) => void;
  onRemove: (combatant: DraftCombatant) => void;
}) {
  const [draft, setDraft] = useState<DraftCombatant | null>(combatant);
  useEffect(() => {
    setDraft(combatant);
  }, [combatant]);
  if (!draft) return null;
  return (
    <Sheet
      title={`Edit ${combatant?.displayName ?? "combatant"}`}
      open={Boolean(combatant)}
      onOpenChange={onOpenChange}
      trigger={<span />}
    >
      <div className="grid gap-5">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <CombatantAvatar combatant={draft} />
          <div>
            <div className="font-semibold">{draft.displayName}</div>
            <div className="text-xs text-muted-foreground">
              Use this nickname and stat override for this encounter only.
            </div>
          </div>
        </div>
        <FloatingInput
          label="Nickname or display name"
          value={draft.displayName}
          onChange={(value) => setDraft({ ...draft, displayName: value })}
        />
        <FloatingInput
          label="Avatar URL"
          value={draft.avatarUrl}
          onChange={(value) => setDraft({ ...draft, avatarUrl: value })}
        />
        <Checkbox
          label="Friendly"
          checked={draft.side === "friendly"}
          onChange={(checked) => setDraft({ ...draft, side: checked ? "friendly" : "enemy" })}
        />
        <Field label="Color label">
          <div className="flex flex-wrap gap-2">
            {combatantColors.map((color) => (
              <button
                aria-label={color.label}
                className={[
                  "h-9 rounded-md border-2 px-2 text-xs font-medium transition",
                  color.value === defaultCombatantColor
                    ? "w-auto bg-muted text-muted-foreground"
                    : "w-9",
                  draft.colorLabel === color.value
                    ? "scale-105 border-foreground"
                    : "border-border",
                ].join(" ")}
                key={color.value}
                style={
                  color.value === defaultCombatantColor
                    ? undefined
                    : { backgroundColor: color.value }
                }
                type="button"
                onClick={() => setDraft({ ...draft, colorLabel: color.value })}
              >
                {color.value === defaultCombatantColor ? "Default" : ""}
              </button>
            ))}
            <details className="relative">
              <summary className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border bg-card px-3 text-sm font-medium">
                Custom
              </summary>
              <div className="absolute left-0 top-11 z-20 grid gap-2 rounded-md border border-border bg-card p-3 shadow-xl">
                <Input
                  className="h-10 w-16 p-1"
                  type="color"
                  value={
                    draft.colorLabel && /^#[0-9a-fA-F]{6}$/.test(draft.colorLabel)
                      ? draft.colorLabel
                      : "#64748b"
                  }
                  onChange={(event) => setDraft({ ...draft, colorLabel: event.target.value })}
                />
              </div>
            </details>
            <Button
              type="button"
              icon={X}
              variant="secondary"
              onClick={() => setDraft({ ...draft, colorLabel: "" })}
            >
              Clear color
            </Button>
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <IconNumberField
            icon={Shield}
            label="AC"
            value={String(draft.armorClass || "")}
            onChange={(value) => setDraft({ ...draft, armorClass: Number(value) || 0 })}
            className="w-full"
          />
          <IconNumberField
            icon={HeartPulse}
            label="Max HP"
            value={String(draft.maxHitPoints || "")}
            onChange={(value) => setDraft({ ...draft, maxHitPoints: Number(value) || 0 })}
            className="w-full"
          />
          <IconNumberField
            icon={HeartPulse}
            label="Current HP"
            value={String(draft.currentHitPoints || "")}
            onChange={(value) => setDraft({ ...draft, currentHitPoints: Number(value) || 0 })}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          <Button type="button" icon={Trash2} variant="danger" onClick={() => onRemove(draft)}>
            Remove
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" icon={Check} onClick={() => onSave(draft)}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
