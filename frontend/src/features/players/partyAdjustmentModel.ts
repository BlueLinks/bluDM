import type { EncounterRun, EncounterRunCombatant, Player } from "../../types";
import type {
  PartyAdjustmentKind,
  PartyAdjustmentRequest,
} from "../../lib/domain/partyAdjustments";

export type PartyWorkflow = "quick" | "source";
export type QuickAdjustmentKind = Extract<
  PartyAdjustmentKind,
  "damage" | "healing" | "temporary_hit_points" | "temporary_max_hit_points"
>;
export type PartySource = "aid" | "inspiring_leader";

export type PartyMember = {
  id: string;
  playerId: string;
  name: string;
  detail: string;
  avatarUrl: string;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  temporaryMaxHitPoints: number;
  level: number;
  charisma: number;
  spellSlots: Record<number, { maximum: number; remaining: number }>;
};

export type PartyAdjustmentDraft = {
  workflow: PartyWorkflow;
  quickKind: QuickAdjustmentKind;
  source: PartySource;
  amount: number;
  actorId: string;
  slotLevel: number;
  consumeSpellSlot: boolean;
  adjustCurrentHitPoints: boolean;
  damageType: string;
  reason: string;
  targetIds: string[];
};

export type ProjectedPartyVitals = {
  currentHitPoints: number;
  effectiveMaxHitPoints: number;
  temporaryHitPoints: number;
};

export function partyMembersFromPlayers(players: Player[], campaignId: string): PartyMember[] {
  return players
    .filter((player) => player.campaignId === campaignId)
    .map((player) => {
      const sheet = player.characterSheet;
      const className = textValue(sheet.className);
      const level = numberValue(sheet.level);
      return {
        id: player.id,
        playerId: player.id,
        name: player.characterName,
        detail: [className, level > 0 ? `level ${level}` : ""].filter(Boolean).join(" · "),
        avatarUrl: player.avatarAssetId ? `/api/assets/${player.avatarAssetId}` : player.avatarUrl,
        maxHitPoints: player.maxHitPoints,
        currentHitPoints: player.currentHitPoints,
        temporaryHitPoints: player.temporaryHitPoints,
        temporaryMaxHitPoints: player.temporaryMaxHitPoints,
        level,
        charisma: abilityScore(sheet, "cha"),
        spellSlots: playerSpellSlots(sheet),
      };
    });
}

export function partyMembersFromRun(run: EncounterRun): PartyMember[] {
  return (run.combatants ?? [])
    .filter((combatant) => combatant.sourceType === "player" && combatant.playerId)
    .map((combatant) => combatantPartyMember(combatant, run));
}

export function adjustmentKind(draft: PartyAdjustmentDraft): PartyAdjustmentKind {
  return draft.workflow === "quick" ? draft.quickKind : draft.source;
}

export function aidAmount(slotLevel: number) {
  return 5 * (Math.max(2, slotLevel) - 1);
}

export function inspiringLeaderAmount(member?: PartyMember) {
  if (!member) return 1;
  return Math.max(1, member.level + Math.floor((member.charisma - 10) / 2));
}

export function targetLimit(draft: PartyAdjustmentDraft) {
  if (draft.workflow !== "source") return Number.POSITIVE_INFINITY;
  return draft.source === "aid" ? 3 : 6;
}

export function projectPartyVitals(
  member: PartyMember,
  draft: PartyAdjustmentDraft,
): ProjectedPartyVitals {
  const kind = adjustmentKind(draft);
  const amount = kind === "aid" ? aidAmount(draft.slotLevel) : Math.max(0, draft.amount);
  let current = member.currentHitPoints;
  let temporary = member.temporaryHitPoints;
  let temporaryMax = member.temporaryMaxHitPoints;
  if (kind === "damage") {
    const temporaryDamage = Math.min(temporary, amount);
    temporary -= temporaryDamage;
    current = Math.max(0, current - (amount - temporaryDamage));
  } else if (kind === "healing") {
    current = Math.min(member.maxHitPoints + temporaryMax, current + amount);
  } else if (kind === "temporary_hit_points" || kind === "inspiring_leader") {
    temporary = Math.max(temporary, amount);
  } else if (kind === "temporary_max_hit_points") {
    temporaryMax += amount;
    if (draft.adjustCurrentHitPoints) current += amount;
  } else if (kind === "aid") {
    const before = temporaryMax;
    temporaryMax = Math.max(before, amount);
    current = Math.min(member.maxHitPoints + temporaryMax, current + temporaryMax - before);
  }
  return {
    currentHitPoints: current,
    effectiveMaxHitPoints: member.maxHitPoints + temporaryMax,
    temporaryHitPoints: temporary,
  };
}

export function campaignAdjustmentPayload(draft: PartyAdjustmentDraft): PartyAdjustmentRequest {
  return {
    targetIds: draft.targetIds,
    kind: adjustmentKind(draft),
    amount: draft.source === "aid" ? aidAmount(draft.slotLevel) : draft.amount,
    actorId: draft.workflow === "source" ? draft.actorId : undefined,
    slotLevel: draft.source === "aid" ? draft.slotLevel : undefined,
    consumeSpellSlot:
      draft.workflow === "source" && draft.source === "aid" && draft.consumeSpellSlot,
    adjustCurrentHitPoints: draft.adjustCurrentHitPoints,
    damageType: draft.quickKind === "damage" ? draft.damageType : undefined,
    reason: draft.reason,
  };
}

export function combatAdjustmentPayload(draft: PartyAdjustmentDraft) {
  const kind = adjustmentKind(draft);
  const amount = kind === "aid" ? aidAmount(draft.slotLevel) : draft.amount;
  return {
    actorId: draft.workflow === "source" ? draft.actorId : undefined,
    kind: kind === "aid" ? "spell" : kind.includes("hit_points") ? "healing" : "manual",
    sourceName: sourceName(draft),
    notes: draft.reason,
    resource:
      kind === "aid" && draft.consumeSpellSlot
        ? { kind: "spell_slot", spellLevel: draft.slotLevel }
        : undefined,
    targets: draft.targetIds.map((targetId) => ({
      targetId,
      outcome: "applied",
      damageMultiplier: 1,
      damageComponents:
        kind === "damage"
          ? [
              {
                amount,
                damageType: draft.damageType,
                mitigation: "ignore",
                source: draft.reason,
              },
            ]
          : [],
      healing: kind === "healing" ? amount : 0,
      temporaryHitPoints:
        kind === "temporary_hit_points" || kind === "inspiring_leader" ? amount : undefined,
      temporaryHitPointsMode: "max",
      temporaryMaxHitPoints:
        kind === "temporary_max_hit_points" || kind === "aid" ? amount : undefined,
      temporaryMaxHitPointsMode: kind === "aid" ? "max" : "increase",
      adjustCurrentHitPointsWithMaximum:
        kind === "aid" || (kind === "temporary_max_hit_points" && draft.adjustCurrentHitPoints),
      conditions: [],
    })),
  };
}

function combatantPartyMember(combatant: EncounterRunCombatant, run: EncounterRun): PartyMember {
  const sheet = sourceSheet(combatant);
  const className = textValue(sheet.className);
  const level = numberValue(sheet.level);
  const slots = Object.fromEntries(
    (run.spellSlots ?? [])
      .filter((slot) => slot.combatantId === combatant.id)
      .map((slot) => [slot.spellLevel, { maximum: slot.maxSlots, remaining: slot.remainingSlots }]),
  );
  return {
    id: combatant.id,
    playerId: combatant.playerId ?? "",
    name: combatant.displayName,
    detail: [className, level > 0 ? `level ${level}` : ""].filter(Boolean).join(" · "),
    avatarUrl: combatant.avatarUrl,
    maxHitPoints: combatant.maxHitPoints,
    currentHitPoints: combatant.currentHitPoints,
    temporaryHitPoints: combatant.temporaryHitPoints,
    temporaryMaxHitPoints: combatant.maxHitPointsModifier,
    level,
    charisma: abilityScore(sheet, "cha"),
    spellSlots: slots,
  };
}

function playerSpellSlots(sheet: Record<string, unknown>) {
  const maximum = recordValue(sheet.spellSlots);
  const remaining = recordValue(sheet.spellSlotsRemaining);
  const slots: PartyMember["spellSlots"] = {};
  for (let level = 1; level <= 9; level += 1) {
    const maxSlots = numberValue(maximum[String(level)]);
    if (maxSlots <= 0) continue;
    slots[level] = {
      maximum: maxSlots,
      remaining:
        remaining[String(level)] === undefined ? maxSlots : numberValue(remaining[String(level)]),
    };
  }
  return slots;
}

function sourceSheet(combatant: EncounterRunCombatant) {
  const player = recordValue(combatant.snapshot.player);
  return recordValue(player.characterSheet);
}

function abilityScore(sheet: Record<string, unknown>, ability: string) {
  return numberValue(recordValue(sheet.abilityScores)[ability]) || 10;
}

function sourceName(draft: PartyAdjustmentDraft) {
  if (draft.workflow === "source") {
    return draft.source === "aid" ? "Aid" : "Inspiring Leader";
  }
  return draft.reason.trim() || "Party adjustment";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
