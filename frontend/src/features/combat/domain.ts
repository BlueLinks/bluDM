import type { EncounterRunCombatant } from "../../types";

export function runCombatantAvatarSrc(combatant: EncounterRunCombatant) {
  if (combatant.avatarUrl) return combatant.avatarUrl;
  const source = combatantSnapshotSource(combatant);
  const assetId = stringFromRecord(source, "avatarAssetId") || stringFromRecord(source, "imageAssetId");
  if (assetId) return `/api/assets/${assetId}`;
  return stringFromRecord(source, "avatarUrl");
}

function combatantSnapshotSource(combatant: EncounterRunCombatant) {
  const snapshot = combatant.snapshot;
  if (!snapshot || typeof snapshot !== "object") return null;
  const key = combatant.sourceType === "player" ? "player" : "creature";
  const source = snapshot[key];
  return source && typeof source === "object" ? source as Record<string, unknown> : null;
}

function stringFromRecord(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}
