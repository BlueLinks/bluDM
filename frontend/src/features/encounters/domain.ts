import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { defaultCombatantColor } from "../../lib/domain/options";
import { rollHitDiceClient } from "../../lib/domain/combat";
import { createId } from "../../lib/domain/ids";
import type { Creature, DraftCombatant, Encounter, EncounterCombatant, Player } from "../../types";

export type EncounterMetaDraft = {
  name: string;
  description: string;
  status: string;
  location: string;
  roomNumber: string;
};

export function draftFromPlayer(encounterID: string, player: Player): DraftCombatant {
  return {
    id: `draft-player-${player.id}-${createId("draft")}`,
    encounterId: encounterID,
    sourceType: "player",
    playerId: player.id,
    creatureId: "",
    side: "player",
    displayName: player.characterName,
    colorLabel: "",
    avatarUrl: avatarImageSrc(player.avatarAssetId, player.avatarUrl),
    armorClass: player.armorClass,
    maxHitPoints: player.maxHitPoints,
    currentHitPoints: player.currentHitPoints,
    rolledHp: false,
    sortOrder: 0,
    snapshot: { player },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingAdd: { sourceType: "player", playerId: player.id, rolledHp: false },
  };
}

export function draftFromCreature(
  encounterID: string,
  creature: Creature,
  side: "friendly" | "enemy",
  rolledHp: boolean,
  index: number,
  count: number,
): DraftCombatant {
  const hp = rolledHp
    ? rollHitDiceClient(creature.hitDice, creature.hitPoints)
    : creature.hitPoints;
  const displayName = count > 1 ? `${creature.name} (${index + 1})` : creature.name;
  return {
    id: `draft-creature-${creature.id}-${createId("draft")}`,
    encounterId: encounterID,
    sourceType: "creature",
    playerId: "",
    creatureId: creature.id,
    side,
    displayName,
    colorLabel: defaultCombatantColor,
    avatarUrl: avatarImageSrc(creature.imageAssetId, creature.avatarUrl),
    armorClass: creature.armorClass,
    maxHitPoints: hp,
    currentHitPoints: hp,
    rolledHp,
    sortOrder: 0,
    snapshot: { creature },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pendingAdd: { sourceType: "creature", creatureId: creature.id, rolledHp },
  };
}

export function encounterDirty(saved: EncounterCombatant[], draft: DraftCombatant[]) {
  if (saved.length !== draft.length) return true;
  const savedByID = new Map(saved.map((combatant) => [combatant.id, combatant]));
  return draft.some(
    (combatant) => combatant.pendingAdd || combatantChanged(savedByID.get(combatant.id), combatant),
  );
}

export function encounterMetaChanged(encounter: Encounter | null, meta: EncounterMetaDraft) {
  if (!encounter) return false;
  return (
    encounter.name !== meta.name ||
    encounter.description !== meta.description ||
    encounter.status !== meta.status ||
    encounter.location !== meta.location ||
    encounter.roomNumber !== meta.roomNumber
  );
}

export function combatantChanged(saved: EncounterCombatant | undefined, draft: EncounterCombatant) {
  if (!saved) return true;
  return (
    saved.side !== draft.side ||
    saved.displayName !== draft.displayName ||
    saved.colorLabel !== draft.colorLabel ||
    saved.avatarUrl !== draft.avatarUrl ||
    saved.armorClass !== draft.armorClass ||
    saved.maxHitPoints !== draft.maxHitPoints ||
    saved.currentHitPoints !== draft.currentHitPoints
  );
}

export function creatureSummary(creature: Creature, campaignLinked: boolean) {
  const parts = [
    creature.size.trim(),
    creature.creatureType.trim(),
    creature.challengeRating.trim() ? `CR ${creature.challengeRating.trim()}` : "",
    `${creature.xp} XP`,
    campaignLinked ? "Campaign NPC" : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function playerClassLevel(player: Player) {
  const className =
    typeof player.characterSheet.className === "string" ? player.characterSheet.className : "";
  const level =
    typeof player.characterSheet.level === "number" ? player.characterSheet.level : undefined;
  return [level ? `Level ${level}` : "", className].filter(Boolean).join(" ") || "Character sheet";
}

export function combatantPlayerClassLevel(combatant: EncounterCombatant) {
  const player = combatant.snapshot?.player;
  if (
    player &&
    typeof player === "object" &&
    "characterSheet" in player &&
    player.characterSheet &&
    typeof player.characterSheet === "object"
  ) {
    const sheet = player.characterSheet as Record<string, unknown>;
    const className = typeof sheet.className === "string" ? sheet.className : "";
    const level = typeof sheet.level === "number" ? sheet.level : undefined;
    return (
      [level ? `Level ${level}` : "", className].filter(Boolean).join(" ") || "Player character"
    );
  }
  return "Player character";
}
