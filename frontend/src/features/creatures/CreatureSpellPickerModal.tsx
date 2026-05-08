import { Plus, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Button, EmptyMini, FloatingInput, Modal } from "../../components/ui";
import type { CreatureFormState, Spell } from "../../types";

export function CreatureSpellPickerModal({
  onOpenChange,
  onSearch,
  open,
  search,
  selectedIds,
  setForm,
  setSpellSources,
  spellSources,
  spells,
}: {
  onOpenChange: (open: boolean) => void;
  onSearch: (search: string) => void;
  open: boolean;
  search: string;
  selectedIds: string[];
  setForm: Dispatch<SetStateAction<CreatureFormState>>;
  setSpellSources: (sources: string[]) => void;
  spellSources: string[];
  spells: Spell[];
}) {
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
          {spells.map((spell) => (
            <label
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-3 text-sm"
              key={spell.id}
            >
              <span>
                <span className="block font-semibold">{spell.name}</span>
                <span className="text-xs text-muted-foreground">
                  {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}{" "}
                  {spell.school && `· ${spell.school}`}
                </span>
              </span>
              <input
                className="mt-1 h-4 w-4 accent-primary"
                checked={selectedIds.includes(spell.id)}
                type="checkbox"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    spellIds: event.target.checked
                      ? [...current.spellIds, spell.id]
                      : current.spellIds.filter((id) => id !== spell.id),
                  }))
                }
              />
            </label>
          ))}
          {spells.length === 0 && (
            <EmptyMini copy="No spells match that search. Add spells to the spell library first, then link them here." />
          )}
        </div>
      </div>
    </Modal>
  );
}
