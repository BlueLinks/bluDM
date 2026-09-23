import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Callout, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import { encounterRuleset2014, type EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Creature, Player } from "../../types";
import { EncounterAddCombatantDialog } from "../encounters/EncounterAddCombatantDialog";
import { BuilderProgress, PartyAlliesStep } from "./CampaignEncounterBuilderSteps";
import { FooterActions, ReviewCreateStep } from "./CampaignEncounterBuilderReviewSteps";
import {
  CampaignEncounterSetupPanel,
  RegenerationConfirmation,
} from "./CampaignEncounterSetupPanel";
import {
  composedDescription,
  furthestBuilderStep,
  initialMeta,
  nextStep,
  sameEnemyDrafts,
} from "./encounterBuilderDialogState";
import {
  defaultRandomOptionsForRuleset,
  type EncounterBuilderCreatureDraft,
  type EncounterBuilderMetaDraft,
  type EncounterBuilderMode,
  type EncounterBuilderPreview,
  type EncounterBuilderRandomOptions,
  type EncounterBuilderStep,
} from "./encounterBuilderGenerator";
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";
import { useGeneratedEncounterPreview } from "./useGeneratedEncounterPreview";

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
  const [mode, setMode] = useState<EncounterBuilderMode>("custom");
  const [meta, setMeta] = useState<EncounterBuilderMetaDraft>(() =>
    initialMeta(locations, initialLocationId),
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [allies, setAllies] = useState<EncounterBuilderCreatureDraft[]>([]);
  const [allyCatalog, setAllyCatalog] = useState<Creature[]>([]);
  const [customEnemies, setCustomEnemies] = useState<EncounterBuilderCreatureDraft[]>([]);
  const [generatedEnemyEdits, setGeneratedEnemyEdits] = useState<
    EncounterBuilderCreatureDraft[] | null
  >(null);
  const [generatedDetailsEdited, setGeneratedDetailsEdited] = useState(false);
  const [pendingRegeneration, setPendingRegeneration] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [randomOptions, setRandomOptions] = useState<EncounterBuilderRandomOptions>(() =>
    defaultRandomOptionsForRuleset(difficultyRuleset),
  );
  const [acceptedPreview, setAcceptedPreview] = useState<EncounterBuilderPreview | null>(null);
  const [acceptedPreviewFingerprint, setAcceptedPreviewFingerprint] = useState("");
  const {
    preview: generatedPreview,
    fingerprint: generatedPreviewFingerprint,
    loading: generatingPreview,
    error: generationError,
    reset: resetGeneratedPreview,
    clearError: clearGenerationError,
    regenerate: rerollGeneratedPreview,
  } = useGeneratedEncounterPreview({
    campaignId,
    locationId: meta.locationId,
    mode,
    open,
    options: randomOptions,
    playerIds: selectedPlayerIds,
  });
  const [addDialogMode, setAddDialogMode] = useState<"ally" | "enemy" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedPlayers = players.filter((player) => selectedPlayerIds.includes(player.id));
  const activeEnemies =
    mode === "random" ? (generatedEnemyEdits ?? generatedPreview.enemies) : customEnemies;
  const hasGeneratedEdits =
    mode === "random" &&
    (generatedDetailsEdited ||
      (generatedEnemyEdits !== null &&
        !sameEnemyDrafts(generatedEnemyEdits, generatedPreview.enemies)));
  const setupPreview = useMemo(
    () => ({
      ...generatedPreview,
      estimatedXp: activeEnemies.reduce(
        (total, enemy) => total + enemy.creature.xp * enemy.quantity,
        0,
      ),
      enemies: activeEnemies,
    }),
    [activeEnemies, generatedPreview],
  );
  const availablePlayers = players.filter((player) => !selectedPlayerIds.includes(player.id));
  const availableAllies = useMemo(() => {
    const chosen = new Set(allies.map((ally) => ally.creature.id));
    const seen = new Set<string>();
    return [...npcs, ...allyCatalog].filter((creature) => {
      if (chosen.has(creature.id) || seen.has(creature.id)) return false;
      seen.add(creature.id);
      return true;
    });
  }, [allies, allyCatalog, npcs]);
  const campaignCreatureIds = useMemo(() => new Set(npcs.map((npc) => npc.id)), [npcs]);

  useEffect(() => {
    if (!open) return;
    setStep("party");
    setFurthestStep("party");
    setMode("custom");
    setMeta(initialMeta(locations, initialLocationId));
    setSelectedPlayerIds([]);
    setAllies([]);
    setAllyCatalog([]);
    setCustomEnemies([]);
    setGeneratedEnemyEdits(null);
    setGeneratedDetailsEdited(false);
    setPendingRegeneration(null);
    setRandomOptions(defaultRandomOptionsForRuleset(difficultyRuleset));
    setAcceptedPreview(null);
    setAcceptedPreviewFingerprint("");
    resetGeneratedPreview();
    setAddDialogMode(null);
    setError("");
    api
      .creatures({ includeStandard: true })
      .then((payload) => setCreatures(payload.creatures))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load creatures"));
  }, [difficultyRuleset, initialLocationId, locations, open, players, resetGeneratedPreview]);

  function goToStep(next: EncounterBuilderStep) {
    if (next === "review" && mode === "random" && (generatingPreview || generationError)) return;
    if (next === "review") acceptCurrentPreview();
    setStep(next);
    setFurthestStep((current) => furthestBuilderStep(current, next));
  }

  function resetGeneratedSelection() {
    setGeneratedEnemyEdits(null);
    setGeneratedDetailsEdited(false);
    setAcceptedPreview(null);
    setAcceptedPreviewFingerprint("");
    if (mode === "random") {
      setMeta((current) => ({
        ...current,
        name: initialMeta(locations, current.locationId).name,
        description: "",
        environment: "",
      }));
    }
  }

  function requestRegeneration(
    action: () => void,
    message: string,
    title = "Regenerate encounter?",
  ) {
    if (hasGeneratedEdits) {
      setPendingRegeneration({ action, message, title });
    } else {
      action();
    }
  }

  function chooseMode(nextMode: EncounterBuilderMode) {
    if (nextMode === mode) return;
    requestRegeneration(
      () => {
        setMode(nextMode);
        setFurthestStep("setup");
        clearGenerationError();
        resetGeneratedSelection();
      },
      "Switching approaches will replace your edited generated encounter. Continue?",
      "Discard generated changes?",
    );
  }

  function updateOptions(options: EncounterBuilderRandomOptions) {
    if (JSON.stringify(options) === JSON.stringify(randomOptions)) return;
    requestRegeneration(() => {
      setRandomOptions(options);
      resetGeneratedSelection();
    }, "Changing this option will regenerate the encounter and replace your edits. Continue?");
  }

  function regenerate() {
    requestRegeneration(() => {
      resetGeneratedSelection();
      rerollGeneratedPreview();
    }, "Regenerating will replace your edited encounter. Continue?");
  }

  function updateSelectedPlayers(nextIds: string[]) {
    requestRegeneration(() => {
      setSelectedPlayerIds(nextIds);
      resetGeneratedSelection();
      if (mode === "random" && nextIds.length === 0) {
        setMode("custom");
        setFurthestStep("setup");
      }
    }, "Changing the party will regenerate the encounter and replace your edits. Continue?");
  }

  function updateLocation(locationId: string) {
    requestRegeneration(() => {
      const location = locations.find((candidate) => candidate.id === locationId);
      setMeta((current) => ({
        ...current,
        locationId,
        location: location ? locationPathLabel(location) : "",
        roomNumber: location?.locationType === "room" ? location.name : current.roomNumber,
      }));
      if (mode === "random") {
        resetGeneratedSelection();
        setStep("setup");
      }
    }, "Changing the location will regenerate the encounter and replace your edits. Continue?");
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
    if (side === "friendly") {
      setAllyCatalog((current) =>
        current.some((item) => item.id === creature.id) ? current : [...current, creature],
      );
      setAllies((current) => [...current, draft]);
    } else if (mode === "random") {
      setGeneratedEnemyEdits((current) => [...(current ?? generatedPreview.enemies), draft]);
    } else {
      setCustomEnemies((current) => [...current, draft]);
    }
  }

  function acceptCurrentPreview() {
    if (mode === "custom") {
      setAcceptedPreview(null);
      setAcceptedPreviewFingerprint("");
      return;
    }
    setAcceptedPreview(setupPreview);
    setAcceptedPreviewFingerprint(
      generatedEnemyEdits === null || sameEnemyDrafts(generatedEnemyEdits, generatedPreview.enemies)
        ? generatedPreviewFingerprint
        : "",
    );
    setMeta((current) => ({
      ...current,
      name: current.name.trim() ? current.name : setupPreview.title,
      description: current.description.trim() ? current.description : setupPreview.summary,
      environment: randomOptions.terrain,
    }));
  }

  function removeEnemy(id: string) {
    if (mode === "random") {
      setGeneratedEnemyEdits((current) =>
        (current ?? generatedPreview.enemies).filter((item) => item.id !== id),
      );
    } else {
      setCustomEnemies((current) => current.filter((item) => item.id !== id));
    }
  }

  function updateEnemy(draft: EncounterBuilderCreatureDraft) {
    if (mode === "random") {
      setGeneratedEnemyEdits((current) =>
        (current ?? generatedPreview.enemies).map((item) => (item.id === draft.id ? draft : item)),
      );
    } else {
      setCustomEnemies((current) => current.map((item) => (item.id === draft.id ? draft : item)));
    }
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
        ...[
          ...allies,
          ...(mode === "random" ? (acceptedPreview?.enemies ?? activeEnemies) : customEnemies),
        ].flatMap((draft) =>
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
        description: composedDescription(meta, mode),
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
          {step === "setup" && mode === "random" && generatingPreview ? (
            <p className="text-sm text-muted-foreground">Generating encounter preview…</p>
          ) : null}
          {step === "party" ? (
            <PartyAlliesStep
              allies={allies}
              availableAllies={availableAllies}
              availablePlayers={availablePlayers}
              players={selectedPlayers}
              onAddAllPlayers={() => updateSelectedPlayers(players.map((player) => player.id))}
              onAddAlly={() => setAddDialogMode("ally")}
              onAddAvailableAlly={(creature) => addCreature(creature, "friendly")}
              onAddPlayer={(player) => updateSelectedPlayers([...selectedPlayerIds, player.id])}
              onRemoveAlly={(id) =>
                setAllies((current) => current.filter((item) => item.id !== id))
              }
              onRemovePlayer={(id) =>
                updateSelectedPlayers(selectedPlayerIds.filter((playerId) => playerId !== id))
              }
            />
          ) : step === "setup" ? (
            <CampaignEncounterSetupPanel
              allies={allies}
              customEnemies={customEnemies}
              difficultyRuleset={difficultyRuleset}
              enemies={setupPreview.enemies}
              mode={mode}
              options={randomOptions}
              players={selectedPlayers}
              preview={setupPreview}
              onAddEnemy={() => setAddDialogMode("enemy")}
              onChooseMode={chooseMode}
              onOptionsChange={updateOptions}
              onRegenerate={regenerate}
              onRemoveEnemy={removeEnemy}
              onUpdateEnemy={updateEnemy}
            />
          ) : (
            <ReviewCreateStep
              allies={allies}
              difficultyRuleset={difficultyRuleset}
              enemies={
                mode === "random" ? (acceptedPreview?.enemies ?? activeEnemies) : customEnemies
              }
              locations={locations}
              meta={meta}
              mode={mode}
              players={selectedPlayers}
              onLocationChange={updateLocation}
              onMetaChange={(nextMeta) => {
                setMeta(nextMeta);
                if (mode === "random") setGeneratedDetailsEdited(true);
              }}
            />
          )}
        </div>
        <FooterActions
          canAdvance={
            step !== "setup" || mode === "custom" || (!generatingPreview && !generationError)
          }
          canSave={
            Boolean(meta.name.trim()) &&
            (mode !== "random" || (!generatingPreview && !generationError))
          }
          saving={saving}
          step={step}
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
        <RegenerationConfirmation
          pending={pendingRegeneration}
          onCancel={() => setPendingRegeneration(null)}
          onConfirm={() => {
            pendingRegeneration?.action();
            setPendingRegeneration(null);
          }}
        />
      </div>
    </Modal>
  );
}
