import { Check, HeartPulse, Pencil, Plus, Shield, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
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
import { combatantPlayerClassLevel, creatureSummary } from "./domain";

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
            <div className="text-xs text-muted-foreground">
              {creatureSummary(creature, campaignLinked)}
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
            variant="success"
            size="sm"
            onClick={() => onAdd(side, count, false)}
          >
            Add
          </Button>
          <Button
            className="whitespace-nowrap bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
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

function CreatureAvatar({ creature }: { creature: Creature }) {
  const src = avatarImageSrc(creature.imageAssetId, creature.avatarUrl);
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted text-sm font-bold text-muted-foreground">
      {src ? (
        <img className="h-full w-full object-cover" src={src} alt="" />
      ) : (
        creature.name.slice(0, 2).toUpperCase()
      )}
    </div>
  );
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
  const nameTone =
    sideTone === "friendly"
      ? "text-emerald-700 dark:text-emerald-300"
      : sideTone === "enemy"
        ? "text-red-700 dark:text-red-300"
        : "";
  return (
    <div className="grid gap-3">
      {combatants.map((combatant) => (
        <div
          className="combatant-row rounded-md border border-border bg-background p-3"
          key={combatant.id}
        >
          <div className="flex items-center gap-3">
            <CombatantAvatar combatant={combatant} />
            <div className="min-w-0 flex-1">
              <div className={["truncate font-semibold", nameTone].filter(Boolean).join(" ")}>
                {combatant.displayName}
              </div>
              {sideTone === "player" && (
                <div className="text-xs text-muted-foreground">
                  {combatantPlayerClassLevel(combatant)}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-accent" /> AC {combatant.armorClass}
                </span>
                <span className="inline-flex items-center gap-1">
                  <HeartPulse className="h-3.5 w-3.5 text-accent" /> HP {combatant.currentHitPoints}
                  /{combatant.maxHitPoints}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  type="button"
                  icon={Pencil}
                  size="sm"
                  variant="secondary"
                  onClick={() => onEdit(combatant)}
                >
                  Edit
                </Button>
              )}
              <Button
                type="button"
                icon={Trash2}
                size="sm"
                variant="danger"
                onClick={() => onRemove(combatant)}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CombatantAvatar({ combatant }: { combatant: EncounterCombatant }) {
  const color = combatant.colorLabel.trim();
  const defaultAvatar = color === defaultCombatantColor;
  return (
    <div
      className={[
        "grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md text-sm font-bold",
        color && !defaultAvatar
          ? "border-2"
          : "border border-border bg-muted text-muted-foreground",
      ].join(" ")}
      style={
        color && !defaultAvatar
          ? { backgroundColor: `${color}22`, borderColor: color, color }
          : undefined
      }
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
