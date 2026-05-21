import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button, EmptyMini } from "../../components/ui";
import { standardSourceDisplayName } from "../../lib/domain/standardSources";
import type { CreatureFormState, CreatureSpellcastingProfile, Spell } from "../../types";

type CreatureFormSetter = Dispatch<SetStateAction<CreatureFormState>>;

type SelectedSpellDetail = {
  spellId: string;
  librarySource: "user" | "standard";
  spellLevel: number;
  name: string;
  sourceKey: string;
  sourceLabel: string;
};

export function SelectedCreatureSpells({
  form,
  setForm,
  spells,
  spellcasting,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
  spells: Spell[];
  spellcasting?: CreatureSpellcastingProfile;
}) {
  const selected = selectedSpellDetails(form, spells, spellcasting);
  if (selected.length === 0 && !hasConfiguredSlots(form)) {
    return (
      <EmptyMini copy="No spells selected yet. Add spells from your library or the SRD lists." />
    );
  }

  const removeSpell = (spell: SelectedSpellDetail) =>
    setForm({
      ...form,
      spellRefs: form.spellRefs.filter(
        (ref) => ref.spellId !== spell.spellId || ref.librarySource !== spell.librarySource,
      ),
    });

  return (
    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
      {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
        const spellsAtLevel = selected.filter((spell) => spell.spellLevel === level);
        const slots = level === 0 ? 0 : Number(form[`spellSlots${level}`]) || 0;
        if (spellsAtLevel.length === 0 && slots === 0) return null;
        return (
          <section
            key={level}
            className="grid min-h-32 content-start rounded-md border border-border bg-background"
          >
            <div className="border-b border-border bg-muted/45 px-3 py-2">
              <h5 className="text-sm font-black leading-tight">{spellColumnTitle(level)}</h5>
              <p className="text-xs text-muted-foreground">
                {level === 0
                  ? `${spellsAtLevel.length} known`
                  : `${spellsAtLevel.length}/${slots} slots`}
              </p>
            </div>
            <div className="grid gap-1 p-2">
              {spellsAtLevel.map((spell) => (
                <div
                  key={`${spell.librarySource}-${spell.spellId}`}
                  className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-card"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{spell.name}</p>
                    <p className="truncate text-[0.68rem] font-medium text-muted-foreground">
                      {spellSourceLabel(spell)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={X}
                    className="h-7 w-7 shrink-0 p-0 opacity-70 group-hover:opacity-100"
                    aria-label={`Remove ${spell.name}`}
                    onClick={() => removeSpell(spell)}
                  />
                </div>
              ))}
              {spellsAtLevel.length === 0 && (
                <p className="text-xs text-muted-foreground">No spells selected.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function selectedSpellDetails(
  form: CreatureFormState,
  spells: Spell[],
  spellcasting?: CreatureSpellcastingProfile,
) {
  const savedSpells = spellcasting?.spells ?? [];
  return form.spellRefs.map<SelectedSpellDetail>((ref) => {
    const currentSpell = spells.find(
      (spell) => spell.id === ref.spellId && spell.librarySource === ref.librarySource,
    );
    const savedSpell = savedSpells.find(
      (spell) => spell.spellId === ref.spellId && spell.librarySource === ref.librarySource,
    );
    return {
      ...ref,
      name: currentSpell?.name ?? savedSpell?.spellName ?? "Unknown spell",
      sourceKey: currentSpell?.sourceKey ?? savedSpell?.sourceKey ?? "",
      sourceLabel: currentSpell?.sourceLabel ?? savedSpell?.sourceLabel ?? "",
    };
  });
}

function hasConfiguredSlots(form: CreatureFormState) {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).some(
    (level) => Number(form[`spellSlots${level}`]) > 0,
  );
}

function spellColumnTitle(level: number) {
  if (level === 0) return "Cantrips";
  return `${ordinal(level)} spells`;
}

function ordinal(level: number) {
  if (level === 1) return "1st";
  if (level === 2) return "2nd";
  if (level === 3) return "3rd";
  return `${level}th`;
}

function spellSourceLabel(spell: SelectedSpellDetail) {
  if (spell.librarySource !== "standard") return "My spell";
  return standardSourceDisplayName({ key: spell.sourceKey, label: spell.sourceLabel });
}
