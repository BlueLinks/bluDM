import { ClipboardList, Plus, Skull, Swords } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import {
  Button,
  Callout,
  Checkbox,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  MutedPanel,
  SectionPanel,
  Select,
  Sheet,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import { isDownEnemy, rotateCombatantsFromActive } from "../../lib/domain/combat";
import { creatureDefaultDisposition } from "../../lib/domain/forms";
import { createId } from "../../lib/domain/ids";
import { conditionImmunities } from "../../lib/domain/options";
import type {
  Creature,
  CreatureAction,
  Encounter,
  EncounterRun,
  EncounterRunCombatant,
  RollMode,
} from "../../types";
import { ActionResult } from "./actionResult";
import {
  ActiveTurnHeader,
  CombatControls,
  CombatSheet,
  CombatStatusBar,
  DamageMeters,
  DeathSaveControls,
  RollFlash,
  TargetRow,
  TopOfRoundMarker,
} from "./combatWidgets";

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
  const [pendingAction, setPendingAction] = useState<Record<string, unknown> | null>(null);
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
      return;
    }
    void api
      .creatureActions(active.creatureId)
      .then((payload) => setActions(payload.actions))
      .catch(() => setActions([]));
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
    <div className="mx-auto grid w-full max-w-[1800px] gap-4">
      <BackButton to={`/encounter-runs/${run.id}/initiative`}>Back to initiative</BackButton>
      <Breadcrumbs
        items={[
          { label: "Campaigns", to: "/campaigns" },
          ...(encounter ? [{ label: encounter.name }] : [{ label: "Encounter" }]),
          { label: "Combat" },
        ]}
      />
      <div className="grid gap-4">
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
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 xl:grid-cols-[minmax(520px,1fr)_minmax(220px,auto)] xl:items-center">
          <ActiveTurnHeader combatant={active} selected={selected}>
            {active.currentHitPoints <= 0 && active.sourceType !== "player" ? (
              <MutedPanel>Entity is dead</MutedPanel>
            ) : activeNeedsDeathSaves ? (
              <DeathSaveControls
                combatant={active}
                onDeathSave={(action) => void updateDeathSaveFor(active, action)}
              />
            ) : (
              <CombatControls
                actions={actions}
                damageType={damageType}
                disabled={!selected}
                hpAmount={hpAmount}
                onAction={execute}
                onAmountChange={setHpAmount}
                onDamageTypeChange={setDamageType}
                onManual={applyManual}
              />
            )}
          </ActiveTurnHeader>
        </div>

        <div
          className={
            showMeters
              ? "grid gap-4 2xl:grid-cols-[360px_420px_minmax(520px,1fr)_300px]"
              : "grid gap-4 2xl:grid-cols-[360px_430px_minmax(560px,1fr)]"
          }
        >
          <CombatSheet
            combatant={active}
            runID={run.id}
            onRoll={(message, flash) => {
              toast.push(message);
              setRollFlash({ ...flash, id: createId() });
            }}
          />
          <SectionPanel
            title="Initiative & Targets"
            icon={Swords}
            action={
              <Button size="sm" icon={Plus} onClick={() => setAddingTarget(true)}>
                Add target
              </Button>
            }
          >
            <div className="grid gap-2">
              {orderedCombatants.map((combatant) => (
                <React.Fragment key={combatant.id}>
                  {combatant.originalIndex === 0 && <TopOfRoundMarker />}
                  <TargetRow
                    active={combatant.id === active.id}
                    combatant={combatant}
                    selected={selectedID === combatant.id}
                    onSelect={() => setSelectedID(combatant.id)}
                    onEdit={() => setEditing(combatant)}
                    onDeathSave={updateDeathSaveFor}
                  />
                </React.Fragment>
              ))}
              {downEnemies.length > 0 && (
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                    <Skull className="h-4 w-4" /> Down ({downEnemies.length})
                  </div>
                  {downEnemies.map((combatant) => (
                    <TargetRow
                      key={combatant.id}
                      down
                      combatant={combatant}
                      selected={selectedID === combatant.id}
                      onSelect={() => setSelectedID(combatant.id)}
                      onEdit={() => setEditing(combatant)}
                      onDeathSave={updateDeathSaveFor}
                    />
                  ))}
                </div>
              )}
            </div>
          </SectionPanel>
          {selected ? (
            <CombatSheet
              combatant={selected}
              runID={run.id}
              compact
              onRoll={(message, flash) => {
                toast.push(message);
                setRollFlash({ ...flash, id: createId() });
              }}
            />
          ) : (
            <SectionPanel title="Target Detail" icon={ClipboardList}>
              {active.currentHitPoints <= 0 || active.defeated ? (
                <MutedPanel>Entity is dead</MutedPanel>
              ) : (
                <Callout>Select a target to enable damage, healing, and action controls.</Callout>
              )}
              <div className="mt-4">
                <MutedPanel>
                  Click a target to inspect its sheet. Combat controls live beside the active
                  combatant at the top left.
                </MutedPanel>
              </div>
            </SectionPanel>
          )}
          {showMeters && <DamageMeters combatants={combatants} />}
        </div>
      </div>
      <RunCombatantEditSheet
        combatant={editing}
        onClose={() => setEditing(null)}
        onSave={(combatant) =>
          refreshFrom(api.updateRunCombatant(combatant)).then(() => setEditing(null))
        }
      />
      <AddRunTargetDialog
        open={addingTarget}
        runID={run.id}
        onClose={() => setAddingTarget(false)}
        onAdded={(nextRun) => {
          setRun(nextRun);
          setAddingTarget(false);
          toast.push("Target added to the fight.");
        }}
      />
      <Modal
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Resolve action"
        trigger={<span />}
      >
        {pendingAction && selected && (
          <ActionResult
            result={pendingAction}
            target={selected}
            onCancel={() => setPendingAction(null)}
            onResolve={(override, damage) => void resolve(override, damage)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={victoryOpen}
        title="Enemies defeated"
        confirmLabel="End encounter"
        onCancel={() => setVictoryOpen(false)}
        onConfirm={goToSummary}
      >
        All enemies are at 0 HP or marked defeated. Move to XP and loot assignment?
      </ConfirmDialog>
      <ConfirmDialog
        open={leaveWarningOpen}
        title="Encounter still running"
        confirmLabel="Leave without finishing"
        onCancel={() => {
          setLeaveWarningOpen(false);
          setPendingNavigation("");
        }}
        onConfirm={() => {
          const next = pendingNavigation || "/campaigns";
          setNavigationBypass(true);
          setLeaveWarningOpen(false);
          setPendingNavigation("");
          window.setTimeout(() => {
            void navigate(next);
          }, 0);
        }}
      >
        This encounter has not been finished. Save the encounter from the summary screen to award XP
        and mark it completed, or cancel leaving to continue combat.
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="success" onClick={goToSummary}>
            Save encounter
          </Button>
        </div>
      </ConfirmDialog>
      <RollFlash flash={rollFlash} onDone={() => setRollFlash(null)} />
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}

function RunCombatantEditSheet({
  combatant,
  onClose,
  onSave,
}: {
  combatant: EncounterRunCombatant | null;
  onClose: () => void;
  onSave: (combatant: EncounterRunCombatant) => void;
}) {
  const [draft, setDraft] = useState<EncounterRunCombatant | null>(combatant);
  useEffect(() => setDraft(combatant), [combatant]);
  if (!draft) {
    return (
      <Sheet title="Edit combatant" open={false} onOpenChange={onClose} trigger={<span />}>
        {" "}
      </Sheet>
    );
  }
  function updateNumber(key: keyof EncounterRunCombatant, value: string) {
    setDraft((current) => (current ? { ...current, [key]: Number(value) || 0 } : current));
  }
  return (
    <Sheet
      title={`Edit ${draft.displayName}`}
      open={Boolean(combatant)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Initiative">
            <Input
              type="number"
              value={draft.initiative}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  initiative: Number(event.target.value) || 0,
                  initiativeSet: true,
                })
              }
            />
          </Field>
          <Field label="AC Bonus">
            <Input
              type="number"
              value={draft.armorClassBonus}
              onChange={(event) => updateNumber("armorClassBonus", event.target.value)}
            />
          </Field>
          <Field label="Temp HP">
            <Input
              type="number"
              value={draft.temporaryHitPoints}
              onChange={(event) => updateNumber("temporaryHitPoints", event.target.value)}
            />
          </Field>
          <Field label="Max HP Mod">
            <Input
              type="number"
              value={draft.maxHitPointsModifier}
              onChange={(event) => updateNumber("maxHitPointsModifier", event.target.value)}
            />
          </Field>
          <Field label="AC Override">
            <Input
              type="number"
              value={draft.armorClassOverride}
              onChange={(event) => updateNumber("armorClassOverride", event.target.value)}
            />
          </Field>
          <Field label="Max HP Override">
            <Input
              type="number"
              value={draft.maxHitPointsOverride}
              onChange={(event) => updateNumber("maxHitPointsOverride", event.target.value)}
            />
          </Field>
          <Field label="Current HP Override">
            <Input
              type="number"
              value={draft.currentHitPointsOverride}
              onChange={(event) => updateNumber("currentHitPointsOverride", event.target.value)}
            />
          </Field>
          <Field label="Current HP">
            <Input
              type="number"
              value={draft.currentHitPoints}
              onChange={(event) => updateNumber("currentHitPoints", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Conditions</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {conditionImmunities.map((condition) => (
              <Checkbox
                key={condition}
                label={condition}
                checked={draft.conditions.includes(condition)}
                onChange={(checked) =>
                  setDraft({
                    ...draft,
                    conditions: checked
                      ? [...draft.conditions, condition]
                      : draft.conditions.filter((item) => item !== condition),
                  })
                }
              />
            ))}
          </div>
        </div>
        <Checkbox
          label="Defeated / dead"
          checked={draft.defeated}
          onChange={(checked) => setDraft({ ...draft, defeated: checked })}
        />
        <Button onClick={() => onSave(draft)}>Save combatant</Button>
      </div>
    </Sheet>
  );
}

function AddRunTargetDialog({
  open,
  runID,
  onClose,
  onAdded,
}: {
  open: boolean;
  runID: string;
  onClose: () => void;
  onAdded: (run: EncounterRun) => void;
}) {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [query, setQuery] = useState("");
  const [creatureID, setCreatureID] = useState("");
  const [side, setSide] = useState<"friendly" | "enemy">("enemy");
  const [quantity, setQuantity] = useState(1);
  const [rolledHp, setRolledHp] = useState(false);
  const [initiative, setInitiative] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = creatures
    .filter((creature) =>
      [creature.name, creature.size, creature.creatureType, creature.challengeRating]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 20);

  useEffect(() => {
    if (!open) return;
    void api.creatures().then((payload) => {
      setCreatures(payload.creatures);
      setCreatureID((current) => current || payload.creatures[0]?.id || "");
      const first = payload.creatures[0];
      setSide(first && creatureDefaultDisposition(first) === "friendly" ? "friendly" : "enemy");
    });
  }, [open]);

  useEffect(() => {
    const selected = creatures.find((creature) => creature.id === creatureID);
    if (selected) {
      setSide(creatureDefaultDisposition(selected) === "friendly" ? "friendly" : "enemy");
    }
  }, [creatureID, creatures]);

  async function add() {
    if (!creatureID) return;
    setSaving(true);
    try {
      const payload = await api.addRunCombatants(runID, {
        creatureId: creatureID,
        side,
        quantity,
        rolledHp,
        initiative: Number(initiative) || 0,
        initiativeSet: initiative.trim() !== "",
      });
      onAdded(payload.run);
      setQuery("");
      setQuantity(1);
      setRolledHp(false);
      setInitiative("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add target to fight"
      open={open}
      onOpenChange={(next) => !next && onClose()}
      trigger={<span />}
    >
      <div className="grid gap-4">
        <Input
          placeholder="Search creatures"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {filtered.map((creature) => (
            <button
              key={creature.id}
              type="button"
              className={[
                "flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted",
                creature.id === creatureID ? "bg-primary/10" : "",
              ].join(" ")}
              onClick={() => setCreatureID(creature.id)}
            >
              <span>
                <span className="block font-semibold">{creature.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[creature.size, creature.creatureType].filter(Boolean).join(" · ")}
                  {creature.challengeRating ? ` · CR ${creature.challengeRating}` : ""}
                </span>
              </span>
              <span className="text-sm font-bold">{creature.xp} XP</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No matching creatures.</div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Side">
            <Select
              value={side}
              placeholder="Side"
              options={[
                { label: "Enemy", value: "enemy" },
                { label: "Friendly", value: "friendly" },
              ]}
              onValueChange={(value) => setSide(value as "friendly" | "enemy")}
            />
          </Field>
          <Field label="Starting initiative">
            <Input
              type="number"
              placeholder="Next slot"
              value={initiative}
              onChange={(event) => setInitiative(event.target.value)}
            />
          </Field>
          <Field label="Quantity">
            <div className="flex w-fit items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                -
              </Button>
              <Input
                className="w-20 text-center"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setQuantity((current) => current + 1)}
              >
                +
              </Button>
            </div>
          </Field>
          <div className="flex items-end">
            <Checkbox label="Roll HP from hit dice" checked={rolledHp} onChange={setRolledHp} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            icon={Plus}
            disabled={!creatureID || saving}
            onClick={() => void add()}
          >
            {saving ? "Adding..." : "Add target"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function rollModeFromEvent(event?: React.MouseEvent): RollMode {
  if (event?.shiftKey) return "advantage";
  if (event?.ctrlKey) return "disadvantage";
  return "normal";
}
