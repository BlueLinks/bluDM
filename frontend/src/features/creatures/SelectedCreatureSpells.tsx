import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Badge, Button, EmptyMini } from "../../components/ui";
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
    <div className="mt-3 grid gap-3">
      {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
        const spellsAtLevel = selected.filter((spell) => spell.spellLevel === level);
        const slots = level === 0 ? 0 : Number(form[`spellSlots${level}`]) || 0;
        if (spellsAtLevel.length === 0 && slots === 0) return null;
        return (
          <section key={level} className="rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h5 className="text-sm font-semibold">{spellLevelLabel(level)}</h5>
              <span className="text-xs text-muted-foreground">
                {level === 0
                  ? `${spellsAtLevel.length} selected`
                  : `${spellsAtLevel.length} selected · ${slots} slots`}
              </span>
            </div>
            <div className="grid gap-2">
              {spellsAtLevel.map((spell) => (
                <div
                  key={`${spell.librarySource}-${spell.spellId}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{spell.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge>{spellLevelLabel(spell.spellLevel)}</Badge>
                      <Badge>
                        {spell.librarySource === "standard"
                          ? standardSourceDisplayName({
                              key: spell.sourceKey,
                              label: spell.sourceLabel,
                            })
                          : "My spell"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={X}
                    className="h-8 w-8 p-0"
                    aria-label={`Remove ${spell.name}`}
                    onClick={() => removeSpell(spell)}
                  />
                </div>
              ))}
              {spellsAtLevel.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No spells selected for this level yet.
                </p>
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

function spellLevelLabel(level: number) {
  if (level === 0) return "Cantrips";
  if (level === 1) return "1st level";
  if (level === 2) return "2nd level";
  if (level === 3) return "3rd level";
  return `${level}th level`;
}
