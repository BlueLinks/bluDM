import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Field, Modal, Select } from "../../components/ui";
import type {
  CreatureSpell,
  EncounterRunCombatant,
  EncounterRunSpellSlot,
  RollMode,
} from "../../types";

type CastPayload = {
  spell: CreatureSpell;
  targetIds: string[];
  castLevel: number;
  rollMode: RollMode;
};

export function SpellCastDialog({
  actor,
  combatants,
  open,
  selectedID,
  slots,
  spells,
  onCast,
  onOpenChange,
}: {
  actor: EncounterRunCombatant;
  combatants: EncounterRunCombatant[];
  open: boolean;
  selectedID: string;
  slots: EncounterRunSpellSlot[];
  spells: CreatureSpell[];
  onCast: (payload: CastPayload) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const sortedSpells = useMemo(
    () =>
      [...spells].sort(
        (a, b) => a.spellLevel - b.spellLevel || a.spellName.localeCompare(b.spellName),
      ),
    [spells],
  );
  const [spellID, setSpellID] = useState(sortedSpells[0]?.spellId ?? "");
  const spell = sortedSpells.find((item) => item.spellId === spellID) ?? sortedSpells[0];
  const minLevel = spell?.spellLevel ?? 0;
  const [castLevel, setCastLevel] = useState(String(Math.max(1, minLevel)));
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  const [targetIds, setTargetIds] = useState<string[]>(() =>
    selectedID ? [selectedID] : actor ? [actor.id] : [],
  );
  useEffect(() => {
    if (!spellID && sortedSpells[0]) {
      setSpellID(sortedSpells[0].spellId);
      setCastLevel(String(Math.max(1, sortedSpells[0].spellLevel)));
    }
  }, [sortedSpells, spellID]);
  useEffect(() => {
    if (open) setTargetIds(selectedID ? [selectedID] : [actor.id]);
  }, [actor.id, open, selectedID]);
  const actualCastLevel = Math.max(minLevel, Number(castLevel) || minLevel);
  const slot = slots.find(
    (item) => item.combatantId === actor.id && item.spellLevel === actualCastLevel,
  );
  const needsSlot = actualCastLevel > 0;
  const hasSlot = !needsSlot || Boolean(slot && slot.remainingSlots > 0);

  function setSpell(nextID: string) {
    const nextSpell = sortedSpells.find((item) => item.spellId === nextID);
    setSpellID(nextID);
    if (nextSpell) setCastLevel(String(Math.max(1, nextSpell.spellLevel)));
  }

  return (
    <Modal
      title="Cast spell"
      open={open}
      onOpenChange={onOpenChange}
      trigger={<span />}
      className="max-w-3xl"
    >
      <div className="grid gap-5">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs font-bold uppercase text-muted-foreground">Caster</div>
          <div className="font-semibold">{actor.displayName}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_10rem]">
          <Field label="Spell">
            <Select
              value={spell?.spellId ?? ""}
              placeholder="Choose spell"
              options={sortedSpells.map((item) => ({
                value: item.spellId,
                label: `${item.spellName} · ${spellLevelLabel(item.spellLevel)}${item.sourceLabel ? ` · ${item.sourceLabel}` : ""}`,
              }))}
              onValueChange={setSpell}
            />
          </Field>
          <Field label="Cast level">
            <Select
              value={String(actualCastLevel)}
              placeholder="Level"
              options={castLevelOptions(minLevel)}
              onValueChange={setCastLevel}
            />
          </Field>
          <Field label="Roll mode">
            <Select
              value={rollMode}
              placeholder="Mode"
              options={[
                { value: "normal", label: "Normal" },
                { value: "advantage", label: "Advantage" },
                { value: "disadvantage", label: "Disadvantage" },
              ]}
              onValueChange={(value) => setRollMode(value as RollMode)}
            />
          </Field>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">Targets</div>
              <div className="text-xs text-muted-foreground">
                Choose one or more targets for this cast.
              </div>
            </div>
            {needsSlot && (
              <div className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
                Level {actualCastLevel}: {slot?.remainingSlots ?? 0}/{slot?.maxSlots ?? 0} slots
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {combatants.map((combatant) => (
              <Checkbox
                key={combatant.id}
                label={combatant.displayName}
                checked={targetIds.includes(combatant.id)}
                onChange={(checked) =>
                  setTargetIds((current) =>
                    checked
                      ? [...new Set([...current, combatant.id])]
                      : current.filter((id) => id !== combatant.id),
                  )
                }
              />
            ))}
          </div>
        </div>
        {!hasSlot && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">
            No level {actualCastLevel} spell slots remain for {actor.displayName}.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            icon={Sparkles}
            variant="success"
            disabled={!spell || !hasSlot || targetIds.length === 0}
            onClick={() =>
              spell &&
              onCast({
                spell,
                targetIds,
                castLevel: actualCastLevel,
                rollMode,
              })
            }
          >
            Cast spell
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function castLevelOptions(minLevel: number) {
  if (minLevel === 0) return [{ value: "0", label: "Cantrip" }];
  return Array.from({ length: 10 - minLevel }, (_, index) => {
    const level = minLevel + index;
    return { value: String(level), label: spellLevelLabel(level) };
  });
}

function spellLevelLabel(level: number) {
  if (level === 0) return "Cantrip";
  if (level === 1) return "1st";
  if (level === 2) return "2nd";
  if (level === 3) return "3rd";
  return `${level}th`;
}
