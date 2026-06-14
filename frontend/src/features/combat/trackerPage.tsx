import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { MutedPanel, useToasts } from "../../components/ui";
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
import { CombatActiveTurnPanel } from "./CombatActiveTurnPanel";
import { CombatBoard } from "./CombatBoard";
import { CombatTrackerOverlays } from "./CombatTrackerOverlays";
import { ConcentrationAlerts } from "./ConcentrationAlerts";
import { CombatStatusBar } from "./combatWidgets";

export function CombatTrackerPage() {
  const { runID } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");
  const [selectedID, setSelectedID] = useState("");
  const [hpAmount, setHpAmount] = useState("");
  const [damageType, setDamageType] = useState("slashing");
  const [actions, setActions] = useState<CreatureAction[]>([]);
  const [spellcasting, setSpellcasting] = useState<CreatureSpellcastingProfile | null>(null);
  const [pendingAction, setPendingAction] = useState<Record<string, unknown> | null>(null);
  const [spellDialogOpen, setSpellDialogOpen] = useState(false);
  const [manualSlotsOpen, setManualSlotsOpen] = useState(false);
  const [showMeters, setShowMeters] = useState(false);
  const [editing, setEditing] = useState<EncounterRunCombatant | null>(null);
  const [addingTarget, setAddingTarget] = useState(false);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [navigationBypass, setNavigationBypass] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState("");
  const [rollFlash, setRollFlash] = useState<{
    id?: string;
    title: string;
    total: number;
    detail: string;
    subtitle?: string;
  } | null>(null);
  const [turnStartedAt, setTurnStartedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const toast = useToasts();

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

  useEffect(() => {
    void load();
  }, [runID]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - turnStartedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [turnStartedAt]);

  const combatants = run?.combatants ?? [];
  const active = combatants[run?.currentTurnIndex ?? 0];
  const selected = combatants.find((combatant) => combatant.id === selectedID) ?? null;
  const enemiesAlive = combatants.some(
    (combatant) =>
      combatant.side === "enemy" && combatant.currentHitPoints > 0 && !combatant.defeated,
  );
  const downEnemies = combatants.filter((combatant) => isDownEnemy(combatant));
  const orderedCombatants = rotateCombatantsFromActive(
    combatants.filter((combatant) => !isDownEnemy(combatant)),
    active?.id,
  );
  const activeNeedsDeathSaves = Boolean(
    active && active.sourceType === "player" && active.currentHitPoints <= 0 && !active.stable,
  );
  const shouldWarnLeaving = Boolean(run && run.status === "active" && !navigationBypass);

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
    if (!active?.creatureId) {
      setActions([]);
      setSpellcasting(null);
      return;
    }
    void api
      .creatureActions(active.creatureId)
      .then((payload) => setActions(payload.actions))
      .catch(() => setActions([]));
    void api
      .creatureSpellcasting(active.creatureId)
      .then((payload) => setSpellcasting(payload.spellcasting))
      .catch(() => setSpellcasting(null));
  }, [active?.creatureId]);

  async function refreshFrom(promise: Promise<{ run: EncounterRun }>) {
    try {
      const payload = await promise;
      setRun(payload.run);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Combat command failed");
    }
  }

  async function move(direction: "next" | "previous") {
    if (!run) return;
    await refreshFrom(api.moveTurn(run.id, direction));
    setTurnStartedAt(Date.now());
  }

  async function applyManual(mode: "damage" | "healing") {
    if (!run || !active || !selected) return;
    await refreshFrom(
      api.manualHP(run.id, {
        actorId: active.id,
        targetId: selected.id,
        amount: Number(hpAmount) || 0,
        mode,
        damageType,
      }),
    );
    setHpAmount("");
  }

  async function execute(action: CreatureAction, event?: React.MouseEvent) {
    if (!run || !active || !selected) return;
    try {
      const rollMode = rollModeFromEvent(event);
      const payload = await api.executeAction(run.id, {
        actorId: active.id,
        targetId: selected.id,
        actionId: action.id,
        rollMode,
      });
      setPendingAction(payload.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not execute action");
    }
  }

  async function resolve(override: string, damageOverride?: number) {
    if (!run || !active || !selected || !pendingAction) return;
    const damage = damageOverride ?? (Number(pendingAction.adjustedDamage) || 0);
    const payload = await api.resolveActionDamage(run.id, {
      actorId: active.id,
      targetId: selected.id,
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
    if (!run || !active) return;
    try {
      const response = await api.castSpell(run.id, {
        actorId: active.id,
        ...payload,
      });
      setRun(response.run);
      setSpellDialogOpen(false);
      const spellName = stringFromResult(response.result.spell, "name") || "Spell";
      toast.push(`${active.displayName} cast ${spellName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cast spell");
    }
  }

  async function resolveConcentration(alertID: string, action: string) {
    if (!run) return;
    await refreshFrom(api.resolveConcentration(run.id, alertID, action));
  }

  async function manualSpellSlot(spellLevel: number, mode: "consume" | "restore") {
    if (!run || !active) return;
    try {
      const payload = await api.manualSpellSlot(run.id, {
        combatantId: active.id,
        spellLevel,
        mode,
      });
      setRun(payload.run);
      toast.push(
        `${mode === "consume" ? "Consumed" : "Restored"} a ${spellLevelLabel(spellLevel)} slot for ${active.displayName}.`,
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

  if (!run || !active) {
    return <MutedPanel>{error || "Loading combat tracker..."}</MutedPanel>;
  }
  const currentRun = run;

  function goToSummary() {
    setNavigationBypass(true);
    setLeaveWarningOpen(false);
    window.setTimeout(() => void navigate(`/encounter-runs/${currentRun.id}/summary`), 0);
  }

  return (
    <div className="combat-tracker-page mx-auto grid w-full max-w-[1800px] gap-2 sm:gap-4">
      <BackButton to={`/encounter-runs/${run.id}/initiative`}>Back to initiative</BackButton>
      <Breadcrumbs
        items={[
          { label: "Campaigns", to: "/campaigns" },
          ...(encounter ? [{ label: encounter.name }] : [{ label: "Encounter" }]),
          { label: "Combat" },
        ]}
      />
      <div className="combat-stack grid gap-2 sm:gap-4">
        <CombatStatusBar
          combatantCount={combatants.length}
          elapsed={elapsed}
          run={run}
          showMeters={showMeters}
          onEnd={goToSummary}
          onMeters={() => setShowMeters((current) => !current)}
          onMove={move}
          onUndo={() => runID && refreshFrom(api.undoRun(runID))}
        />
        <ConcentrationAlerts
          alerts={run.alerts ?? []}
          combatants={combatants}
          onResolve={(alert, action) => void resolveConcentration(alert.id, action)}
        />
        <ActiveSpellAreas
          combatants={combatants}
          effects={run.activeEffects ?? []}
          onApply={(area, targetIds, rollMode) => void applySpellArea(area.id, targetIds, rollMode)}
          onEnd={(area) => void endSpellArea(area.id)}
          onMove={(area) => void moveSpellArea(area.id)}
        />
        <div className="combat-panel rounded-lg border border-border bg-card p-2 sm:p-3">
          <CombatActiveTurnPanel
            actions={actions}
            active={active}
            activeNeedsDeathSaves={activeNeedsDeathSaves}
            damageType={damageType}
            hpAmount={hpAmount}
            selected={selected}
            spellSlotsTracked={Boolean(
              run.spellSlots?.some((slot) => slot.combatantId === active.id),
            )}
            spells={spellcasting?.spells ?? []}
            onAction={execute}
            onAmountChange={setHpAmount}
            onDamageTypeChange={setDamageType}
            onDeathSave={(action) => void updateDeathSaveFor(active, action)}
            onManual={applyManual}
            onOpenManualSlots={() => setManualSlotsOpen(true)}
            onOpenSpells={() => setSpellDialogOpen(true)}
          />
        </div>

        <CombatBoard
          active={active}
          activeEffects={run.activeEffects ?? []}
          combatants={combatants}
          downEnemies={downEnemies}
          orderedCombatants={orderedCombatants}
          runID={run.id}
          selected={selected}
          selectedID={selectedID}
          showMeters={showMeters}
          onAddTarget={() => setAddingTarget(true)}
          onDeathSave={updateDeathSaveFor}
          onEdit={setEditing}
          onRoll={(message, flash) => {
            toast.push(message);
            setRollFlash({ ...flash, id: createId() });
          }}
          onSelect={setSelectedID}
        />
      </div>
      <CombatTrackerOverlays
        active={active}
        addingTarget={addingTarget}
        editing={editing}
        leaveWarningOpen={leaveWarningOpen}
        manualSlotsOpen={manualSlotsOpen}
        pendingAction={pendingAction}
        pendingNavigation={pendingNavigation}
        rollFlash={rollFlash}
        run={run}
        selected={selected}
        selectedID={selectedID}
        spellDialogOpen={spellDialogOpen}
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
        onSetSpellDialogOpen={setSpellDialogOpen}
        onSetVictoryOpen={setVictoryOpen}
      />
    </div>
  );
}

function rollModeFromEvent(event?: React.MouseEvent): RollMode {
  if (event?.shiftKey) return "advantage";
  if (event?.ctrlKey) return "disadvantage";
  return "normal";
}

function stringFromResult(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : "";
}

function spellLevelLabel(level: number) {
  if (level === 1) return "1st-level";
  if (level === 2) return "2nd-level";
  if (level === 3) return "3rd-level";
  return `${level}th-level`;
}
