import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { MutedPanel, Page, useToasts } from "../../components/ui";
import { api } from "../../lib/api";
import type { RollTableResolutionPayload } from "../../lib/api/encounterRuns";
import { isDownEnemy, rotateCombatantsFromActive } from "../../lib/domain/combat";
import { createId } from "../../lib/domain/ids";
import type {
  CreatureAction,
  CreatureSpellcastingProfile,
  Encounter,
  EncounterRun,
  EncounterRunCombatant,
  RollMode,
} from "../../types";
import { ActiveSpellAreas } from "./ActiveSpellAreas";
import type { HpMultiplier } from "./CombatContextPanel";
import { CombatTrackerOverlays } from "./CombatTrackerOverlays";
import { CombatWorkspace } from "./CombatWorkspace";
import { CombatStatusBar } from "./combatWidgets";
import type { CombatRollFlash } from "./combatTypes";
import { applyResolutionPayload, blankResolutionTarget } from "./resolutionModel";
import {
  combatStartTimestamp,
  combatTrackerBreadcrumbs,
  hasLivingEnemies,
  hpAdjustmentAmount,
  needsDeathSaves,
  rollModeFromEvent,
  spellLevelLabel,
  stringFromResult,
  stringValue,
  useCombatElapsed,
} from "./trackerPageHelpers";

export function CombatTrackerPage() {
  const { runID } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");
  const [selectedSheetID, setSelectedSheetID] = useState("");
  const [actingID, setActingID] = useState("");
  const [targetIDs, setTargetIDs] = useState<string[]>([]);
  const [hpAmount, setHpAmount] = useState("");
  const [hpMultiplier, setHpMultiplier] = useState<HpMultiplier>("full");
  const [damageType, setDamageType] = useState("slashing");
  const [actions, setActions] = useState<CreatureAction[]>([]);
  const [spellcasting, setSpellcasting] = useState<CreatureSpellcastingProfile | null>(null);
  const [pendingAction, setPendingAction] = useState<Record<string, unknown> | null>(null);
  const [selectedSpellID, setSelectedSpellID] = useState<string | null>(null);
  const [manualSlotsOpen, setManualSlotsOpen] = useState(false);
  const [showMeters, setShowMeters] = useState(false);
  const [editing, setEditing] = useState<EncounterRunCombatant | null>(null);
  const [addingTarget, setAddingTarget] = useState(false);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [navigationBypass, setNavigationBypass] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState("");
  const [rollFlash, setRollFlash] = useState<CombatRollFlash | null>(null);
  const toast = useToasts();
  const combatStartedAt = combatStartTimestamp(run);
  const elapsed = useCombatElapsed(combatStartedAt);

  async function load() {
    if (!runID) return;
    try {
      const payload = await api.encounterRun(runID);
      setRun(payload.run);
      void api
        .encounter(payload.run.encounterId)
        .then((encounterPayload) => setEncounter(encounterPayload.encounter))
        .catch(() => setEncounter(null));
      if (payload.run.status === "setup") void navigate(`/encounter-runs/${runID}/initiative`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load combat tracker");
    }
  }

  useEffect(() => void load(), [runID]);

  const combatants = run?.combatants ?? [];
  const active = combatants[run?.currentTurnIndex ?? 0];
  const selectedSheet = combatants.find((combatant) => combatant.id === selectedSheetID) ?? active;
  const acting = combatants.find((combatant) => combatant.id === actingID) ?? active;
  const targets = combatants.filter((combatant) => targetIDs.includes(combatant.id));
  const pendingActionTarget = combatants.find(
    (combatant) => combatant.id === stringValue(pendingAction?.targetId),
  );
  const enemiesAlive = hasLivingEnemies(combatants);
  const downEnemies = combatants.filter((combatant) => isDownEnemy(combatant));
  const orderedCombatants = rotateCombatantsFromActive(
    combatants.filter((combatant) => !isDownEnemy(combatant)),
    active?.id,
  );
  const actorNeedsDeathSaves = needsDeathSaves(acting);
  const shouldWarnLeaving = Boolean(run && run.status === "active" && !navigationBypass);

  useEffect(() => {
    if (!active) return;
    setSelectedSheetID((current) =>
      combatants.some((combatant) => combatant.id === current) ? current : active.id,
    );
    setActingID((current) =>
      combatants.some((combatant) => combatant.id === current) ? current : active.id,
    );
    setTargetIDs((current) =>
      current.filter((id) => combatants.some((combatant) => combatant.id === id)),
    );
  }, [active?.id, combatants]);

  useEffect(() => {
    if (!shouldWarnLeaving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [shouldWarnLeaving]);

  useEffect(() => {
    if (!shouldWarnLeaving) return;
    const handler = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || (target.target && target.target !== "_self"))
        return;
      const next = new URL(target.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      const nextPath = `${next.pathname}${next.search}${next.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextPath === currentPath || nextPath === `/encounter-runs/${run?.id}/summary`) return;
      event.preventDefault();
      setPendingNavigation(nextPath);
      setLeaveWarningOpen(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [shouldWarnLeaving, run?.id]);

  useEffect(() => {
    if (
      run?.status === "active" &&
      combatants.some((combatant) => combatant.side === "enemy") &&
      !enemiesAlive
    ) {
      setVictoryOpen(true);
    }
  }, [run?.id, run?.status, enemiesAlive, combatants.length]);

  useEffect(() => {
    if (!acting?.creatureId) {
      setActions([]);
      setSpellcasting(null);
      return;
    }
    void api
      .creatureActions(acting.creatureId)
      .then((payload) => setActions(payload.actions))
      .catch(() => setActions([]));
    void api
      .creatureSpellcasting(acting.creatureId)
      .then((payload) => setSpellcasting(payload.spellcasting))
      .catch(() => setSpellcasting(null));
  }, [acting?.creatureId]);

  async function refreshFrom(promise: Promise<{ run: EncounterRun }>) {
    try {
      const payload = await promise;
      setRun(payload.run);
      setError("");
      return payload.run;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Combat command failed");
      return null;
    }
  }

  async function move(direction: "next" | "previous") {
    if (!run) return;
    const nextRun = await refreshFrom(api.moveTurn(run.id, direction));
    const nextActive = nextRun?.combatants?.[nextRun.currentTurnIndex];
    if (nextActive) setActingID(nextActive.id);
  }

  async function applyManual(mode: "damage" | "healing" | "temporary") {
    if (!run || !acting || targets.length === 0) return;
    const amount = hpAdjustmentAmount(hpAmount, hpMultiplier);
    if (amount <= 0) return;
    try {
      let nextRun = run;
      if (mode === "temporary") {
        const payload = await api.applyResolution(
          run.id,
          applyResolutionPayload({
            actorId: acting.id,
            kind: "healing",
            sourceName: "Quick temporary HP",
            notes: "",
            targets: targets.map((target) => ({
              ...blankResolutionTarget(target.id),
              temporaryHitPoints: amount,
            })),
          }),
        );
        nextRun = payload.run;
      } else {
        for (const target of targets) {
          const payload = await api.manualHP(run.id, {
            actorId: acting.id,
            targetId: target.id,
            amount,
            mode,
            damageType: mode === "damage" ? damageType : undefined,
          });
          nextRun = payload.run;
        }
      }
      setRun(nextRun);
      setHpAmount("");
      setError("");
      toast.push(
        `Applied ${mode === "damage" ? "damage" : mode === "healing" ? "healing" : "temporary HP"} to ${targets.length} target${targets.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not adjust hit points");
    }
  }

  async function execute(action: CreatureAction, event?: React.MouseEvent) {
    if (!run || !acting || targets.length !== 1) return;
    const target = targets[0];
    try {
      const rollMode = rollModeFromEvent(event);
      const payload = await api.executeAction(run.id, {
        actorId: acting.id,
        targetId: target.id,
        actionId: action.id,
        rollMode,
      });
      setPendingAction({
        ...payload.result,
        actorId: acting.id,
        actorName: acting.displayName,
        targetId: target.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not execute action");
    }
  }

  async function resolve(override: string, damageOverride?: number) {
    if (!run || !pendingAction) return;
    const actorId = stringValue(pendingAction.actorId);
    const targetId = stringValue(pendingAction.targetId);
    if (!actorId || !targetId) return;
    const damage = damageOverride ?? (Number(pendingAction.adjustedDamage) || 0);
    const payload = await api.resolveActionDamage(run.id, {
      actorId,
      targetId,
      damage,
      override,
    });
    setRun(payload.run);
    setPendingAction(null);
  }

  async function castSpell(payload: {
    spellId: string;
    librarySource: "user" | "standard";
    targetIds: string[];
    castLevel: number;
    rollMode: RollMode;
    rollTableResolutions?: RollTableResolutionPayload[];
  }) {
    if (!run || !acting) return;
    try {
      const response = await api.castSpell(run.id, {
        actorId: acting.id,
        ...payload,
      });
      setRun(response.run);
      setSelectedSpellID(null);
      const spellName = stringFromResult(response.result.spell, "name") || "Spell";
      toast.push(`${acting.displayName} cast ${spellName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cast spell");
    }
  }

  async function resolveConcentration(alertID: string, action: string) {
    if (!run) return;
    await refreshFrom(api.resolveConcentration(run.id, alertID, action));
  }

  async function manualSpellSlot(spellLevel: number, mode: "consume" | "restore") {
    if (!run || !acting) return;
    try {
      const payload = await api.manualSpellSlot(run.id, {
        combatantId: acting.id,
        spellLevel,
        mode,
      });
      setRun(payload.run);
      toast.push(
        `${mode === "consume" ? "Consumed" : "Restored"} a ${spellLevelLabel(spellLevel)} slot for ${acting.displayName}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update spell slot");
    }
  }

  async function moveSpellArea(areaEffectId: string) {
    if (!run) return;
    await refreshFrom(api.moveSpellArea(run.id, { areaEffectId }));
    toast.push("Spell area moved.");
  }

  async function applySpellArea(areaEffectId: string, targetIds: string[], rollMode: RollMode) {
    if (!run) return;
    try {
      const response = await api.applySpellArea(run.id, { areaEffectId, targetIds, rollMode });
      setRun(response.run);
      const results = Array.isArray(response.result.results) ? response.result.results : [];
      toast.push(
        `Applied area effect to ${results.length} target${results.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply spell area");
    }
  }

  async function endSpellArea(areaEffectId: string) {
    if (!run) return;
    await refreshFrom(api.endSpellArea(run.id, { areaEffectId }));
    toast.push("Spell area ended.");
  }
  async function updateDeathSaveFor(
    combatant: EncounterRunCombatant,
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) {
    if (!run) return;
    await refreshFrom(api.deathSave(run.id, combatant.id, action));
  }
  if (!run || !active || !acting || !selectedSheet) {
    return <MutedPanel>{error || "Loading combat tracker..."}</MutedPanel>;
  }
  function goToSummary() {
    setNavigationBypass(true);
    setLeaveWarningOpen(false);
    window.setTimeout(() => void navigate(`/encounter-runs/${run!.id}/summary`), 0);
  }
  async function undoLastChange() {
    if (!runID) return;
    const nextRun = await refreshFrom(api.undoRun(runID));
    const nextActive = nextRun?.combatants?.[nextRun.currentTurnIndex];
    if (nextActive) setActingID(nextActive.id);
  }
  const breadcrumbs = combatTrackerBreadcrumbs(encounter?.name);

  return (
    <Page size="wide" className="combat-tracker-page gap-2 sm:gap-4">
      <BackButton to={`/encounter-runs/${run.id}/initiative`}>Back to initiative</BackButton>
      <Breadcrumbs items={breadcrumbs} />
      <div className="combat-stack grid gap-2 sm:gap-4">
        <CombatStatusBar
          combatantCount={combatants.length}
          elapsed={elapsed}
          run={run}
          showMeters={showMeters}
          onEnd={goToSummary}
          onMeters={() => setShowMeters((current) => !current)}
          onMove={move}
          onUndo={() => void undoLastChange()}
        />
        <ActiveSpellAreas
          combatants={combatants}
          effects={run.activeEffects ?? []}
          onApply={(area, targetIds, rollMode) => void applySpellArea(area.id, targetIds, rollMode)}
          onEnd={(area) => void endSpellArea(area.id)}
          onMove={(area) => void moveSpellArea(area.id)}
        />
        <CombatWorkspace
          actions={actions}
          active={active}
          acting={acting}
          actorNeedsDeathSaves={actorNeedsDeathSaves}
          combatStartedAt={combatStartedAt}
          damageType={damageType}
          downEnemies={downEnemies}
          hpAmount={hpAmount}
          hpMultiplier={hpMultiplier}
          orderedCombatants={orderedCombatants}
          run={run}
          selectedSheet={selectedSheet}
          selectedSheetID={selectedSheetID || selectedSheet.id}
          showMeters={showMeters}
          spells={spellcasting?.spells ?? []}
          spellSlotsTracked={Boolean(
            run.spellSlots?.some((slot) => slot.combatantId === acting.id),
          )}
          targetIDs={targetIDs}
          onAction={execute}
          onApplyResolution={(resolution) =>
            refreshFrom(api.applyResolution(run.id, resolution)).then((next) => {
              if (!next) throw new Error("Could not apply resolution");
            })
          }
          onActorChange={setActingID}
          onAddTarget={() => setAddingTarget(true)}
          onAmountChange={setHpAmount}
          onClearTargets={() => setTargetIDs([])}
          onConcentrationResolve={(alert, action) => resolveConcentration(alert.id, action)}
          onDamageTypeChange={setDamageType}
          onDeathSave={updateDeathSaveFor}
          onEdit={setEditing}
          onHpMultiplierChange={setHpMultiplier}
          onManual={applyManual}
          onOpenManualSlots={() => setManualSlotsOpen(true)}
          onOpenSpells={(spell) => setSelectedSpellID(spell?.spellId ?? "")}
          onRemoveTarget={(id) =>
            setTargetIDs((current) => current.filter((targetID) => targetID !== id))
          }
          onRoll={(message, flash) => {
            toast.push(message);
            setRollFlash({ ...flash, id: createId() });
          }}
          onSelectSheet={setSelectedSheetID}
          onToggleTarget={(id) =>
            setTargetIDs((current) =>
              current.includes(id)
                ? current.filter((targetID) => targetID !== id)
                : [...current, id],
            )
          }
        />
      </div>
      <CombatTrackerOverlays
        active={acting}
        addingTarget={addingTarget}
        editing={editing}
        leaveWarningOpen={leaveWarningOpen}
        manualSlotsOpen={manualSlotsOpen}
        pendingAction={pendingAction}
        pendingNavigation={pendingNavigation}
        rollFlash={rollFlash}
        run={run}
        selected={pendingActionTarget ?? null}
        selectedIDs={targetIDs}
        selectedSpellID={selectedSpellID ?? ""}
        spellDialogOpen={selectedSpellID !== null}
        spellcasting={spellcasting}
        toasts={toast.toasts}
        victoryOpen={victoryOpen}
        onAddedTarget={() => {
          setAddingTarget(false);
          toast.push("Target added to the fight.");
        }}
        onApplyNavigation={(next) => {
          setNavigationBypass(true);
          window.setTimeout(() => {
            void navigate(next);
          }, 0);
        }}
        onCastSpell={(payload) => void castSpell(payload)}
        onCloseAddingTarget={() => setAddingTarget(false)}
        onCloseEditing={() => setEditing(null)}
        onDismissToast={toast.dismiss}
        onManualSpellSlot={(spellLevel, mode) => void manualSpellSlot(spellLevel, mode)}
        onResolveAction={(override, damage) => void resolve(override, damage)}
        onRollFlashDone={() => setRollFlash(null)}
        onSaveEditing={(combatant) =>
          refreshFrom(api.updateRunCombatant(combatant)).then(() => setEditing(null))
        }
        onSaveSummary={goToSummary}
        onSetLeaveWarningOpen={setLeaveWarningOpen}
        onSetManualSlotsOpen={setManualSlotsOpen}
        onSetPendingAction={setPendingAction}
        onSetPendingNavigation={setPendingNavigation}
        onSetRun={setRun}
        onSetSpellDialogOpen={(open) => !open && setSelectedSpellID(null)}
        onSetVictoryOpen={setVictoryOpen}
      />
    </Page>
  );
}
