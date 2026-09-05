import { actionPayload, creaturePayload } from "../../lib/api/payloads";
import type {
  ActionFormState,
  Creature,
  CreatureFormState,
  CreatureSpellcastingProfile,
  Spell,
} from "../../types";
export function makeEditorPreview(
  form: CreatureFormState,
  actions: ActionFormState[],
  spells: Spell[],
  profile?: CreatureSpellcastingProfile,
  original?: Creature,
) {
  let payload: ReturnType<typeof creaturePayload>;
  try {
    payload = creaturePayload(form);
  } catch {
    payload = creaturePayload({ ...form, statBlock: "{}" });
  }
  return {
    creature: {
      ...original,
      ...payload,
      id: original?.id ?? "preview",
      librarySource: "user",
      readOnly: false,
      sourceKey: "",
      sourceLabel: "My creation",
      createdAt: "",
      updatedAt: "",
    } as Creature,
    actions: actions
      .filter((action) => action.name.trim())
      .map((action, index) => ({
        ...actionPayload(action),
        id: action.id,
        sortOrder: index,
        creatureId: "preview",
        createdAt: "",
        updatedAt: "",
      })),
    spellcasting: {
      creatureId: "preview",
      spellcastingAbility: form.spellcastingAbility,
      innateSpellcastingAbility: form.innateSpellcastingAbility,
      casterLevel: Number(form.casterLevel),
      spellSaveDC: Number(form.spellSaveDC),
      spellAttackBonus: Number(form.spellAttackBonus),
      slots: Object.fromEntries(
        ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => [
          level,
          Number(form[`spellSlots${level}`]),
        ]),
      ),
      spells: form.spellRefs.map((ref, index) => {
        const original = profile?.spells.find(
          (spell) => spell.spellId === ref.spellId && spell.librarySource === ref.librarySource,
        );
        return {
          ...ref,
          id: ref.spellId,
          creatureId: "preview",
          spellName:
            spells.find(
              (spell) => spell.id === ref.spellId && spell.librarySource === ref.librarySource,
            )?.name ??
            original?.spellName ??
            "Loading spell…",
          sourceKey: original?.sourceKey ?? "",
          sourceLabel: original?.sourceLabel ?? "",
          prepared: original?.prepared ?? true,
          innate: original?.innate ?? false,
          sortOrder: index,
        };
      }),
    },
  };
}
