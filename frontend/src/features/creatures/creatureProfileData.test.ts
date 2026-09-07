import { describe, expect, it } from "vitest";
import { creaturePayload } from "../../lib/api/payloads";
import { creatureToForm } from "../../lib/domain/forms";
import { parseDiceFormula } from "../../components/shared/CharacterFormControls";
import { copyEditorData, standardEditorData } from "./creatureCopy";
import { applySpellcastingToForm, emptyCreatureForm } from "./creatureEditorModel";
import {
  actionRollText,
  profileAbilities,
  profileFacts,
  profileFeatures,
  profileSpells,
} from "./creatureProfileData";
import { actionFixture, creatureFixture, spellcastingFixture } from "./creatureTestFixtures";

describe("creature profile and editor round trips", () => {
  it("reads authored abilities, adjusted skill totals, and fixed-only action rolls", () => {
    const creature = creatureFixture();
    expect(profileAbilities(creature)[0]).toMatchObject({ score: 17, modifier: "+3" });
    expect(Object.fromEntries(profileFacts(creature)).Skills).toBe("Perception +5");
    expect(actionRollText(actionFixture())).toBe("7 fire (magical)");
    const action = profileFeatures(creature, [actionFixture()]).find(
      (group) => group.title === "Actions",
    )?.items[0];
    expect(action?.name).toBe("Ember Bite");
    expect(action?.detail).toContain("7 fire");
    expect(profileFeatures(creature).some((group) => group.title === "Legendary actions")).toBe(
      false,
    );
  });
  it("persists skill adjustments, imported fields, and spell flags without flattening them", () => {
    const source = creatureFixture();
    source.statBlock.customMetadata = { habitat: "Ashwood" };
    const form = applySpellcastingToForm(
      creatureToForm(source, emptyCreatureForm),
      spellcastingFixture(),
    );
    expect(form.spellRefs[0]).toMatchObject({ prepared: false, innate: true });
    const payload = creaturePayload(form);
    expect(payload.statBlock).toMatchObject({
      skillAdjustments: { Perception: 2 },
      customMetadata: { habitat: "Ashwood" },
    });
    expect(creatureToForm({ ...source, ...payload }, emptyCreatureForm).skillAdjustments).toEqual({
      Perception: 2,
    });
    expect(profileSpells(source, spellcastingFixture())).toContain("Faerie Fire (level 1, innate)");
  });
  it("copies SRD scores, skills, senses, defenses and actions into an editable draft", () => {
    const source = creatureFixture({
      librarySource: "standard",
      readOnly: true,
      sourceKey: "srd-2014",
      sourceLabel: "SRD 2014",
      statBlock: {
        abilities: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 },
        speed: { walk: "50 ft." },
        skills: { perception: 3, stealth: 4 },
        senses: { darkvision: "60 ft.", passive_perception: 13 },
        defenses: { immunities: ["Fire"], conditionImmunities: ["Poisoned"] },
        specialAbilities: [{ name: "Pack tactics", description: "Hunt together." }],
        actions: [
          {
            name: "Bite",
            description: "Melee Weapon Attack: +5 to hit, reach 5 ft.",
            attackBonus: 5,
            damage: [{ damageType: "Piercing", damageDice: "2d6 + 3" }],
          },
        ],
      },
    });
    const draft = copyEditorData(standardEditorData(source));
    const form = creatureToForm(draft.creature, emptyCreatureForm);
    expect(draft.creature).toMatchObject({ id: "", readOnly: false, librarySource: "user" });
    expect(form).toMatchObject({
      walkSpeed: "50",
      passivePerception: "13",
      abilityScores: { str: "17" },
      skillProficiencies: ["Perception", "Stealth"],
      damageImmunities: ["fire"],
      conditionImmunities: ["Poisoned"],
      senses: { Darkvision: { enabled: true, range: "60" } },
    });
    expect(draft.actions[0]).toMatchObject({
      name: "Bite",
      attackModifier: 5,
      reach: 5,
      rolls: [{ diceCount: 2, dieSize: 6, fixedValue: 3 }],
    });
    expect(draft.creature.statBlock.actions).toBeUndefined();
    expect(draft.creature.statBlock.importedStatBlock).toEqual(source.statBlock);
    expect(source.readOnly).toBe(true);
  });
  it("accepts spaced hit-dice formulas without resetting the dice", () => {
    expect(parseDiceFormula("5d10 + 15")).toEqual({
      diceCount: "5",
      dieSize: "10",
      fixedValue: "+15",
    });
  });
});
