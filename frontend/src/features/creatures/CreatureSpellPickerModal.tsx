import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Button, EmptyMini, FloatingInput, Modal } from "../../components/ui";
import { standardSourceDisplayName } from "../../lib/domain/standardSources";
import type { CreatureSpellRef, Spell } from "../../types";

export function CreatureSpellPickerModal({
  onOpenChange,
  onSearch,
  open,
  search,
  selectedRefs,
  slotCounts,
  onSaveSelection,
  setSpellSources,
  spellSources,
  spells,
}: {
  onOpenChange: (open: boolean) => void;
  onSearch: (search: string) => void;
  open: boolean;
  search: string;
  selectedRefs: CreatureSpellRef[];
  slotCounts: Record<number, number>;
  onSaveSelection: (refs: CreatureSpellRef[]) => void;
  setSpellSources: (sources: string[]) => void;
  spellSources: string[];
  spells: Spell[];
}) {
  const [draftRefs, setDraftRefs] = useState<CreatureSpellRef[]>(selectedRefs);
  const selectedIds = draftRefs.map((ref) => ref.spellId);
  const selectedCountByLevel = useMemo(
    () =>
      draftRefs.reduce<Record<number, number>>((counts, ref) => {
        counts[ref.spellLevel] = (counts[ref.spellLevel] ?? 0) + 1;
        return counts;
      }, {}),
    [draftRefs],
  );
  const sortedSpells = useMemo(
    () =>
      [...spells].sort((a, b) => {
        const selectedDelta =
          Number(selectedIds.includes(b.id)) - Number(selectedIds.includes(a.id));
        if (selectedDelta !== 0) return selectedDelta;
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      }),
    [selectedIds, spells],
  );

  useEffect(() => {
    if (open) setDraftRefs(selectedRefs);
  }, [open, selectedRefs]);

  function toggleSpell(spell: Spell, checked: boolean) {
    if (checked && isSpellLimitReached(spell, selectedIds, selectedCountByLevel, slotCounts)) {
      return;
    }
    setDraftRefs((current) =>
      checked
        ? [
            ...current.filter((ref) => ref.spellId !== spell.id),
            {
              spellId: spell.id,
              librarySource: spell.librarySource,
              spellLevel: spell.level,
            },
          ]
        : current.filter((ref) => ref.spellId !== spell.id),
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add spells"
      trigger={
        <Button type="button" icon={Plus}>
          Add spells
        </Button>
      }
    >
      <div className="grid gap-4">
        <section className="grid gap-2 rounded-lg border border-border bg-card p-3">
          <div>
            <h3 className="text-sm font-semibold">Browse standard spell sources</h3>
            <p className="text-xs text-muted-foreground">
              Standard spells are read-only references. User-created spells are always shown too.
            </p>
          </div>
          <StandardSourceToggles selected={spellSources} onChange={setSpellSources} />
        </section>
        <FloatingInput icon={Search} label="Search spells" value={search} onChange={onSearch} />
        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
          {sortedSpells.map((spell) => {
            const selected = selectedIds.includes(spell.id);
            const disabled = isSpellLimitReached(
              spell,
              selectedIds,
              selectedCountByLevel,
              slotCounts,
            );
            return (
              <label
                className={[
                  "flex items-start justify-between gap-3 rounded-md border p-3 text-sm transition",
                  selected ? "border-primary bg-primary/5" : "border-border bg-background",
                  disabled && !selected ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
                key={spell.id}
                title={disabled && !selected ? spellLimitMessage(spell.level) : undefined}
              >
                <span>
                  <span className="block font-semibold">{spell.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}{" "}
                    {spell.school && `· ${spell.school}`}
                    {spell.librarySource === "standard" &&
                      ` · ${standardSourceDisplayName({ key: spell.sourceKey, label: spell.sourceLabel })}`}
                  </span>
                </span>
                <input
                  className="mt-1 h-4 w-4 accent-primary disabled:cursor-not-allowed"
                  checked={selected}
                  disabled={disabled && !selected}
                  type="checkbox"
                  onChange={(event) => toggleSpell(spell, event.target.checked)}
                />
              </label>
            );
          })}
          {sortedSpells.length === 0 && (
            <EmptyMini copy="No spells match that search. Add spells to the spell library first, then link them here." />
          )}
        </div>
        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-border bg-card px-1 pt-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSaveSelection(draftRefs);
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function isSpellLimitReached(
  spell: Spell,
  selectedIds: string[],
  selectedCountByLevel: Record<number, number>,
  slotCounts: Record<number, number>,
) {
  if (spell.level === 0 || selectedIds.includes(spell.id)) return false;
  return (selectedCountByLevel[spell.level] ?? 0) >= (slotCounts[spell.level] ?? 0);
}

function spellLimitMessage(level: number) {
  if (level === 1) return "Remove a spell from 1st level before adding another.";
  if (level === 2) return "Remove a spell from 2nd level before adding another.";
  if (level === 3) return "Remove a spell from 3rd level before adding another.";
  return `Remove a spell from ${level}th level before adding another.`;
}
