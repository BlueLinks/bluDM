import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import type { RollTableResolutionPayload } from "../../lib/api/encounterRuns";
import type { CreatureSpell, EncounterRunCombatant, Spell } from "../../types";
import { SpellCastDialog } from "./SpellCastDialog";

vi.mock("../../lib/api", () => ({
  api: {
    spell: vi.fn(),
  },
}));

describe("SpellCastDialog", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.spell).mockResolvedValue({ spell: prismaticSpray() });
  });

  it("collects entered roll-table outcomes for Prismatic Spray", async () => {
    const onCast = vi.fn();
    render(
      <SpellCastDialog
        actor={combatant("caster", "Caster")}
        combatants={[combatant("caster", "Caster"), combatant("target", "Target")]}
        open
        selectedIDs={["target"]}
        slots={[
          {
            combatantId: "caster",
            encounterRunId: "run",
            id: "slot-7",
            maxSlots: 1,
            remainingSlots: 1,
            spellLevel: 7,
          },
        ]}
        spells={[creatureSpell()]}
        onCast={onCast}
        onOpenChange={() => undefined}
      />,
    );

    expect(await screen.findByText("Roll table outcomes")).toBeTruthy();
    fireEvent.click(screen.getByText("Auto roll"));
    fireEvent.click(await screen.findByText("Enter result"));
    fireEvent.click(screen.getByLabelText("d8 result"));
    fireEvent.click(await screen.findByText("8. Special"));
    fireEvent.click(screen.getByLabelText("Follow-up 2"));
    fireEvent.click(await screen.findByText("7. Violet"));
    fireEvent.click(screen.getByText("Resolve manually"));
    fireEvent.click(await screen.findByText("Failed save"));
    fireEvent.click(screen.getByRole("button", { name: "Cast spell" }));

    await waitFor(() => expect(onCast).toHaveBeenCalled());
    const [payload] = onCast.mock.calls[0] as [
      { rollTableResolutions?: RollTableResolutionPayload[] },
    ];
    expect(payload.rollTableResolutions).toEqual([
      {
        followUpRolls: [1, 7],
        mode: "entered",
        roll: 8,
        rollId: "roll-table-1",
        saveResult: "failed",
        targetId: "target",
      },
    ]);
  });
});

function combatant(id: string, displayName: string): EncounterRunCombatant {
  return {
    activeEffects: [],
    armorClass: 10,
    armorClassBonus: 0,
    armorClassOverride: 0,
    avatarUrl: "",
    colorLabel: "",
    conditions: [],
    creatureId: "",
    currentHitPoints: 10,
    currentHitPointsOverride: 0,
    damageDealt: 0,
    damageTaken: 0,
    deathSaveFailures: 0,
    deathSaveSuccesses: 0,
    defeated: false,
    displayName,
    encounterRunId: "run",
    healingDone: 0,
    healingReceived: 0,
    id,
    initiative: 0,
    initiativeSet: true,
    kills: 0,
    maxHitPoints: 10,
    maxHitPointsModifier: 0,
    maxHitPointsOverride: 0,
    side: "friendly",
    snapshot: {},
    sourceId: "",
    sourceType: "creature",
    stable: false,
    sortOrder: 0,
    temporaryHitPoints: 0,
  } as unknown as EncounterRunCombatant;
}

function creatureSpell(): CreatureSpell {
  return {
    creatureId: "caster",
    id: "creature-spell",
    innate: false,
    librarySource: "user",
    prepared: true,
    sortOrder: 0,
    sourceKey: "",
    sourceLabel: "",
    spellId: "spell-1",
    spellLevel: 7,
    spellName: "Prismatic Spray",
  };
}

function prismaticSpray(): Spell {
  return {
    actions: [
      {
        actionType: "save",
        attackAbilityOverride: "normal",
        attackModifier: 0,
        damageAbilityOverride: "normal",
        damageTypeChoice: "specific",
        damageTypeOptions: ["fire"],
        hitSpecialEvent: "none",
        id: "action-1",
        name: "Prismatic Spray",
        rolls: [
          {
            addPrimaryStatModifier: false,
            conditionName: "",
            damageType: "",
            diceCount: 0,
            dieSize: 6,
            effectConfig: {
              dice: "1d8",
              name: "Prismatic Rays",
              rows: [
                { name: "Red", roll: 1 },
                { name: "Orange", roll: 2 },
                { name: "Yellow", roll: 3 },
                { name: "Green", roll: 4 },
                { name: "Blue", roll: 5 },
                { name: "Indigo", roll: 6 },
                { name: "Violet", roll: 7 },
                {
                  effectText: "Roll twice more, rerolling any 8.",
                  name: "Special",
                  roll: 8,
                },
              ],
            },
            fixedValue: 0,
            id: "roll-table-1",
            magical: true,
            rollKind: "roll_table",
            scalingDiceCount: 0,
            scalingDieSize: 6,
            scalingFixedValue: 0,
            scalingFromLevel: 0,
            scalingStepSize: 1,
            scalingType: "none",
            sortOrder: 0,
            timing: "manual",
          },
        ],
        saveAbility: "dex",
        successfulSaveEffect: "half",
        weaponSource: "chosen_weapon",
      },
    ],
    id: "spell-1",
    level: 7,
    name: "Prismatic Spray",
  } as unknown as Spell;
}
