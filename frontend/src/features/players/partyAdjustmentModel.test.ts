import { describe, expect, it } from "vitest";
import type { EncounterRun, Player } from "../../types";
import {
  aidAmount,
  campaignAdjustmentPayload,
  combatAdjustmentPayload,
  partyMembersFromPlayers,
  partyMembersFromRun,
  projectPartyVitals,
  targetLimit,
  type PartyAdjustmentDraft,
  type PartyMember,
} from "./partyAdjustmentModel";

describe("party adjustment model", () => {
  it("only includes players from the selected campaign", () => {
    const members = partyMembersFromPlayers(
      [
        player({ id: "party-a", campaignId: "campaign-a", characterName: "Aster" }),
        player({ id: "party-b", campaignId: "campaign-b", characterName: "Bram" }),
        player({ id: "unassigned", campaignId: "", characterName: "Cora" }),
      ],
      "campaign-a",
    );

    expect(members.map((member) => member.name)).toEqual(["Aster"]);
  });

  it("only includes player combatants from the encounter", () => {
    const run = {
      combatants: [
        combatant({ id: "hero", sourceType: "player", playerId: "player-a", displayName: "Aster" }),
        combatant({ id: "npc", sourceType: "creature", side: "friendly", displayName: "Sildar" }),
        combatant({ id: "enemy", sourceType: "creature", side: "enemy", displayName: "Goblin" }),
      ],
      spellSlots: [],
    } as unknown as EncounterRun;

    expect(partyMembersFromRun(run).map((member) => member.name)).toEqual(["Aster"]);
  });

  it("previews damage through temporary HP and Aid as a non-stacking maximum increase", () => {
    const member = partyMember({
      currentHitPoints: 12,
      maxHitPoints: 20,
      temporaryHitPoints: 4,
      temporaryMaxHitPoints: 2,
    });
    expect(projectPartyVitals(member, draft({ amount: 7 }))).toEqual({
      currentHitPoints: 9,
      effectiveMaxHitPoints: 22,
      temporaryHitPoints: 0,
    });

    const aid = draft({ workflow: "source", source: "aid", slotLevel: 2 });
    expect(aidAmount(2)).toBe(5);
    expect(projectPartyVitals(member, aid)).toEqual({
      currentHitPoints: 15,
      effectiveMaxHitPoints: 25,
      temporaryHitPoints: 4,
    });
  });

  it("builds saved-party and combat payloads with optional spell-slot tracking", () => {
    const aid = draft({
      workflow: "source",
      source: "aid",
      actorId: "caster",
      slotLevel: 3,
      targetIds: ["one", "two", "three"],
    });
    expect(campaignAdjustmentPayload(aid)).toMatchObject({
      actorId: "caster",
      amount: 10,
      consumeSpellSlot: true,
      kind: "aid",
      slotLevel: 3,
      targetIds: ["one", "two", "three"],
    });
    expect(combatAdjustmentPayload(aid)).toMatchObject({
      actorId: "caster",
      resource: { kind: "spell_slot", spellLevel: 3 },
      sourceName: "Aid",
      targets: [
        {
          targetId: "one",
          temporaryMaxHitPoints: 10,
          temporaryMaxHitPointsMode: "max",
          adjustCurrentHitPointsWithMaximum: true,
        },
        {
          targetId: "two",
          temporaryMaxHitPoints: 10,
          temporaryMaxHitPointsMode: "max",
          adjustCurrentHitPointsWithMaximum: true,
        },
        {
          targetId: "three",
          temporaryMaxHitPoints: 10,
          temporaryMaxHitPointsMode: "max",
          adjustCurrentHitPointsWithMaximum: true,
        },
      ],
    });
  });

  it("limits rule-backed features to their allowed number of targets", () => {
    expect(targetLimit(draft())).toBe(Number.POSITIVE_INFINITY);
    expect(targetLimit(draft({ workflow: "source", source: "aid" }))).toBe(3);
    expect(targetLimit(draft({ workflow: "source", source: "inspiring_leader" }))).toBe(6);
  });
});

function draft(overrides: Partial<PartyAdjustmentDraft> = {}): PartyAdjustmentDraft {
  return {
    workflow: "quick",
    quickKind: "damage",
    source: "aid",
    amount: 5,
    actorId: "",
    slotLevel: 2,
    consumeSpellSlot: true,
    adjustCurrentHitPoints: true,
    damageType: "",
    reason: "",
    targetIds: ["target"],
    ...overrides,
  };
}

function partyMember(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    id: "target",
    playerId: "player",
    name: "Aster",
    detail: "Cleric · level 5",
    avatarUrl: "",
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    level: 5,
    charisma: 14,
    spellSlots: {},
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "player",
    campaignId: "campaign-a",
    characterName: "Aster",
    playerName: "Blue",
    avatarUrl: "",
    armorClass: 15,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    experiencePoints: 0,
    characterSheet: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function combatant(overrides: Record<string, unknown>) {
  return {
    id: "combatant",
    sourceType: "creature",
    side: "enemy",
    displayName: "Creature",
    avatarUrl: "",
    maxHitPoints: 10,
    currentHitPoints: 10,
    temporaryHitPoints: 0,
    maxHitPointsModifier: 0,
    snapshot: {},
    ...overrides,
  };
}
