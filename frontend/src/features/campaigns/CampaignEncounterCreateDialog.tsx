import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Callout, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import { encounterRuleset2014, type EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Creature, Player } from "../../types";
import { EncounterAddCombatantDialog } from "../encounters/EncounterAddCombatantDialog";
import { BuilderProgress, PartyAlliesStep } from "./CampaignEncounterBuilderSteps";
import { FooterActions, ReviewCreateStep } from "./CampaignEncounterBuilderReviewSteps";
import { EncounterSetupStep } from "./CampaignEncounterRandomSetup";
import {
  defaultRandomOptionsForRuleset,
  type EncounterBuilderCreatureDraft,
  type EncounterBuilderMetaDraft,
  type EncounterBuilderPreview,
  type EncounterBuilderRandomOptions,
  type EncounterBuilderStep,
} from "./encounterBuilderGenerator";
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";

type AddDialogMode = "ally" | "enemy";

export function CampaignEncounterCreateDialog({
  campaignId,
  difficultyRuleset = encounterRuleset2014,
  locations,
  npcs = [],
  open,
  players,
  initialLocationId = "",
  trigger,
  onCreated,
  onOpenChange,
}: {
  campaignId: string;
  difficultyRuleset?: EncounterRuleset;
  locations: CampaignLocation[];
  npcs?: Creature[];
  open: boolean;
  players: Player[];
  initialLocationId?: string;
  trigger?: ReactNode;
  onCreated?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<EncounterBuilderStep>("party");
  const [furthestStep, setFurthestStep] = useState<EncounterBuilderStep>("party");
  const [meta, setMeta] = useState<EncounterBuilderMetaDraft>(() =>
    initialMeta(locations, initialLocationId),
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [allies, setAllies] = useState<EncounterBuilderCreatureDraft[]>([]);
  const [enemies, setEnemies] = useState<EncounterBuilderCreatureDraft[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [randomOptions, setRandomOptions] = useState<EncounterBuilderRandomOptions>(() =>
    defaultRandomOptionsForRuleset(difficultyRuleset),
  );
  const [previewRoll, setPreviewRoll] = useState(1);
  const [acceptedPreview, setAcceptedPreview] = useState<EncounterBuilderPreview | null>(null);
  const [acceptedPreviewFingerprint, setAcceptedPreviewFingerprint] = useState("");
  const [generatedPreview, setGeneratedPreview] =
    useState<EncounterBuilderPreview>(emptyEncounterPreview);
  const [generatedPreviewFingerprint, setGeneratedPreviewFingerprint] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [addDialogMode, setAddDialogMode] = useState<AddDialogMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedPlayers = players.filter((player) => selectedPlayerIds.includes(player.id));
  const setupPreview = useMemo(
    () =>
      enemies.length
        ? {
            ...generatedPreview,
            estimatedXp: enemies.reduce(
              (total, enemy) => total + enemy.creature.xp * enemy.quantity,
              0,
            ),
            enemies,
          }
        : generatedPreview,
    [enemies, generatedPreview],
  );
  const availablePlayers = players.filter((player) => !selectedPlayerIds.includes(player.id));
  const campaignCreatureIds = useMemo(() => new Set(npcs.map((npc) => npc.id)), [npcs]);

  useEffect(() => {
    if (!open) return;
    setStep("party");
    setFurthestStep("party");
    setMeta(initialMeta(locations, initialLocationId));
    setSelectedPlayerIds(players.map((player) => player.id));
    setAllies([]);
    setEnemies([]);
    setRandomOptions(defaultRandomOptionsForRuleset(difficultyRuleset));
    setPreviewRoll(1);
    setAcceptedPreview(null);
    setAcceptedPreviewFingerprint("");
    setGeneratedPreview(emptyEncounterPreview);
    setGeneratedPreviewFingerprint("");
    setGeneratingPreview(false);
    setGenerationError("");
    setAddDialogMode(null);
    setError("");
    api
      .creatures({ includeStandard: true })
      .then((payload) => setCreatures(payload.creatures))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load creatures"));
  }, [difficultyRuleset, initialLocationId, locations, open, players]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGeneratingPreview(true);
    setGenerationError("");
    api
      .previewGeneratedEncounter(campaignId, {
        options: randomOptions,
        playerIds: selectedPlayerIds,
        locationId: meta.locationId,
        roll: previewRoll,
      })
      .then(({ preview, previewFingerprint }) => {
        if (!cancelled) {
          setGeneratedPreview(preview);
          setGeneratedPreviewFingerprint(previewFingerprint);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGenerationError(
            err instanceof Error ? err.message : "Could not generate encounter preview",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setGeneratingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, meta.locationId, open, previewRoll, randomOptions, selectedPlayerIds]);

  function goToStep(next: EncounterBuilderStep) {
    if (next === "review" && (generatingPreview || generationError)) return;
    if (next === "review") acceptCurrentPreview();
    setStep(next);
    setFurthestStep((current) => furthestBuilderStep(current, next));
  }

  function updateOptions(options: EncounterBuilderRandomOptions) {
    setRandomOptions(options);
    setEnemies([]);
    setAcceptedPreview(null);
    setAcceptedPreviewFingerprint("");
  }

  function regenerate() {
    setEnemies([]);
    setAcceptedPreview(null);
    setAcceptedPreviewFingerprint("");
    setPreviewRoll((current) => current + 1);
  }

  function updateLocation(locationId: string) {
    const location = locations.find((candidate) => candidate.id === locationId);
    setMeta((current) => ({
      ...current,
      locationId,
      location: location ? locationPathLabel(location) : "",
      roomNumber: location?.locationType === "room" ? location.name : current.roomNumber,
    }));
  }

  function addCreature(
    creature: Creature,
    side: "friendly" | "enemy",
    quantity = 1,
    rolledHp = false,
  ) {
    const draft = {
      id: `${side}-${creature.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      creature,
      quantity,
      rolledHp,
      side,
    };
    if (side === "friendly") setAllies((current) => [...current, draft]);
    else setEnemies((current) => [...current, draft]);
  }

  function acceptCurrentPreview() {
    setAcceptedPreview(setupPreview);
    setAcceptedPreviewFingerprint(enemies.length === 0 ? generatedPreviewFingerprint : "");
    setEnemies(setupPreview.enemies);
    setMeta((current) => ({
      ...current,
      name: current.name.trim() ? current.name : setupPreview.title,
      description: current.description.trim() ? current.description : setupPreview.summary,
      environment: randomOptions.terrain,
    }));
  }

  async function saveEncounter() {
    if (!meta.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const combatants = [
        ...selectedPlayerIds.map((playerId) => ({
          sourceType: "player" as const,
          playerId,
          side: "ally" as const,
        })),
        ...[...allies, ...enemies].flatMap((draft) =>
          Array.from({ length: draft.quantity }, () => ({
            sourceType: "creature" as const,
            creatureId: draft.creature.id,
            side: draft.side === "enemy" ? ("enemy" as const) : ("ally" as const),
            rolledHp: draft.rolledHp,
          })),
        ),
      ];
      const payload = await api.createEncounter(campaignId, {
        idempotencyKey: crypto.randomUUID(),
        previewFingerprint: acceptedPreviewFingerprint || undefined,
        name: meta.name.trim(),
        description: composedDescription(meta),
        status: meta.status,
        location: meta.location,
        locationId: meta.locationId || undefined,
        roomNumber: meta.roomNumber,
        combatants,
      });
      await onCreated?.();
      onOpenChange(false);
      void navigate(`/campaigns/${campaignId}/encounters/${payload.encounter.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create encounter");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      className="encounter-builder-modal max-h-[calc(100vh-5rem)] max-w-[73.625rem] overflow-hidden p-0"
      open={open}
      onOpenChange={onOpenChange}
      title="Create encounter"
      trigger={trigger}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]">
        <div className="px-[1.5625rem]">
          <BuilderProgress furthestStep={furthestStep} step={step} onStepSelect={goToStep} />
        </div>
        <div className="encounter-builder-body min-h-0 overflow-y-auto px-[1.5625rem] py-3">
          {error ? <Callout tone="danger">{error}</Callout> : null}
          {generationError ? <Callout tone="danger">{generationError}</Callout> : null}
          {step === "setup" && generatingPreview ? (
            <p className="text-sm text-muted-foreground">Generating encounter preview…</p>
          ) : null}
          {step === "party" ? (
            <PartyAlliesStep
              allies={allies}
              availablePlayers={availablePlayers}
              difficultyRuleset={difficultyRuleset}
              players={selectedPlayers}
              onAddAllPlayers={() => setSelectedPlayerIds(players.map((player) => player.id))}
              onAddAlly={() => setAddDialogMode("ally")}
              onAddPlayer={(player) => setSelectedPlayerIds((current) => [...current, player.id])}
              onRemoveAlly={(id) =>
                setAllies((current) => current.filter((item) => item.id !== id))
              }
              onRemovePlayer={(id) =>
                setSelectedPlayerIds((current) => current.filter((playerId) => playerId !== id))
              }
            />
          ) : step === "setup" ? (
            <EncounterSetupStep
              allyCount={allies.length}
              difficultyRuleset={difficultyRuleset}
              enemies={setupPreview.enemies}
              options={randomOptions}
              players={selectedPlayers}
              preview={setupPreview}
              onAddEnemy={() => setAddDialogMode("enemy")}
              onOptionsChange={updateOptions}
              onRegenerate={regenerate}
              onRemoveEnemy={(id) =>
                setEnemies((current) =>
                  (current.length ? current : setupPreview.enemies).filter(
                    (item) => item.id !== id,
                  ),
                )
              }
              onUpdateEnemy={(draft) =>
                setEnemies((current) => {
                  const source = current.length ? current : setupPreview.enemies;
                  return source.map((item) => (item.id === draft.id ? draft : item));
                })
              }
            />
          ) : (
            <ReviewCreateStep
              allies={allies}
              difficultyRuleset={difficultyRuleset}
              enemies={acceptedPreview?.enemies ?? setupPreview.enemies}
              locations={locations}
              meta={meta}
              players={selectedPlayers}
              onLocationChange={updateLocation}
              onMetaChange={setMeta}
            />
          )}
        </div>
        <FooterActions
          canAdvance={step !== "setup" || (!generatingPreview && !generationError)}
          canSave={Boolean(meta.name.trim())}
          saving={saving}
          step={step}
          onBack={() => goToStep(previousStep(step))}
          onCancel={() => onOpenChange(false)}
          onNext={() => goToStep(nextStep(step))}
          onSave={() => void saveEncounter()}
        />
        <EncounterAddCombatantDialog
          campaignCreatureIds={campaignCreatureIds}
          creatures={creatures}
          mode={addDialogMode ?? "ally"}
          npcs={npcs}
          open={Boolean(addDialogMode)}
          onAddCreature={addCreature}
          onOpenChange={(isOpen) => {
            if (!isOpen) setAddDialogMode(null);
          }}
        />
      </div>
    </Modal>
  );
}

function initialMeta(locations: CampaignLocation[], locationId: string): EncounterBuilderMetaDraft {
  const location = locations.find((candidate) => candidate.id === locationId);
  return {
    name: location ? `Encounter at ${location.name}` : "",
    description: "",
    dmNotes: "",
    environment: "location-theme",
    status: "planned",
    timeOfDay: "",
    location: location ? locationPathLabel(location) : "",
    locationId: location?.id ?? "",
    roomNumber: location?.locationType === "room" ? location.name : "",
  };
}

function nextStep(step: EncounterBuilderStep): EncounterBuilderStep {
  if (step === "party") return "setup";
  if (step === "setup") return "review";
  return step;
}

function previousStep(step: EncounterBuilderStep) {
  if (step === "setup") return "party";
  if (step === "review") return "setup";
  return "party";
}

function furthestBuilderStep(current: EncounterBuilderStep, next: EncounterBuilderStep) {
  const steps = ["party", "setup", "review"] as const;
  const currentIndex = steps.findIndex((item) => item === current);
  const nextIndex = steps.findIndex((item) => item === next);
  if (nextIndex < 0) return current;
  if (currentIndex < 0 || nextIndex > currentIndex) return next;
  return current;
}

function composedDescription(meta: EncounterBuilderMetaDraft) {
  return [
    meta.description.trim(),
    meta.dmNotes.trim() ? `DM Notes: ${meta.dmNotes.trim()}` : "",
    [
      meta.environment ? `Environment: ${meta.environment}` : "",
      meta.timeOfDay ? `Time: ${meta.timeOfDay}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  ]
    .filter(Boolean)
    .join("\n\n");
}

const emptyEncounterPreview: EncounterBuilderPreview = {
  title: "Generated encounter",
  difficulty: "Medium",
  estimatedXp: 0,
  targetNotice: "",
  summary: "Choose encounter settings to generate a preview.",
  enemies: [],
};
