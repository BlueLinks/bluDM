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
  onSaveSelection: (refs: CreatureSpellRef[]) => void;
  setSpellSources: (sources: string[]) => void;
  spellSources: string[];
  spells: Spell[];
}) {
  const [draftRefs, setDraftRefs] = useState<CreatureSpellRef[]>(selectedRefs);
  const selectedIds = draftRefs.map((ref) => ref.spellId);
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
        <Button type="button" icon={Plus} variant="success">
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
          {sortedSpells.map((spell) => (
            <label
              className={[
                "flex items-start justify-between gap-3 rounded-md border p-3 text-sm",
                selectedIds.includes(spell.id)
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background",
              ].join(" ")}
              key={spell.id}
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
                className="mt-1 h-4 w-4 accent-primary"
                checked={selectedIds.includes(spell.id)}
                type="checkbox"
                onChange={(event) => toggleSpell(spell, event.target.checked)}
              />
            </label>
          ))}
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
            variant="success"
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
