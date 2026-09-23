import type {
  EncounterBuilderCreatureDraft,
  EncounterBuilderMetaDraft,
  EncounterBuilderMode,
  EncounterBuilderPreview,
  EncounterBuilderStep,
} from "./encounterBuilderGenerator";

export function sameEnemyDrafts(
  left: EncounterBuilderCreatureDraft[],
  right: EncounterBuilderCreatureDraft[],
) {
  return (
    left.length === right.length &&
    left.every((enemy, index) => {
      const original = right[index];
      return (
        enemy.id === original.id &&
        enemy.creature.id === original.creature.id &&
        enemy.quantity === original.quantity &&
        enemy.rolledHp === original.rolledHp &&
        enemy.side === original.side
      );
    })
  );
}
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";

export function initialMeta(
  locations: CampaignLocation[],
  locationId: string,
): EncounterBuilderMetaDraft {
  const location = locations.find((candidate) => candidate.id === locationId);
  return {
    name: location ? `Encounter at ${location.name}` : "",
    description: "",
    dmNotes: "",
    environment: "",
    status: "planned",
    timeOfDay: "",
    location: location ? locationPathLabel(location) : "",
    locationId: location?.id ?? "",
    roomNumber: location?.locationType === "room" ? location.name : "",
  };
}

export function nextStep(step: EncounterBuilderStep): EncounterBuilderStep {
  if (step === "party") return "setup";
  if (step === "setup") return "review";
  return step;
}

export function previousStep(step: EncounterBuilderStep): EncounterBuilderStep {
  if (step === "setup") return "party";
  if (step === "review") return "setup";
  return "party";
}

export function furthestBuilderStep(current: EncounterBuilderStep, next: EncounterBuilderStep) {
  const steps = ["party", "setup", "review"] as const;
  const currentIndex = steps.findIndex((item) => item === current);
  const nextIndex = steps.findIndex((item) => item === next);
  if (nextIndex < 0) return current;
  if (currentIndex < 0 || nextIndex > currentIndex) return next;
  return current;
}

export function composedDescription(
  meta: EncounterBuilderMetaDraft,
  mode: EncounterBuilderMode | null,
) {
  return [
    meta.description.trim(),
    meta.dmNotes.trim() ? `DM Notes: ${meta.dmNotes.trim()}` : "",
    [
      mode === "random" && meta.environment ? `Environment: ${meta.environment}` : "",
      meta.timeOfDay ? `Time: ${meta.timeOfDay}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const emptyEncounterPreview: EncounterBuilderPreview = {
  title: "Generated encounter",
  difficulty: "Medium",
  estimatedXp: 0,
  targetNotice: "",
  summary: "Choose encounter settings to generate a preview.",
  enemies: [],
};
