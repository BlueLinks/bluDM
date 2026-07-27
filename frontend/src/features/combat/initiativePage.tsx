import type { DragEndEvent } from "@dnd-kit/core";
import { Pencil, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { ActionRow, SidebarDetailLayout } from "../../components/layout";
import { Button, Callout, MutedPanel, Page } from "../../components/ui";
import { api } from "../../lib/api";
import { calculateRunEncounterDifficulty } from "../../lib/domain/combat";
import type { Encounter, EncounterRun, EncounterRunCombatant } from "../../types";
import {
  InitiativeEntryPanel,
  InitiativePreviewPanel,
  orderInitiativePreview,
  reorderTiedInitiative,
  type InitiativeDrafts,
  type InitiativeGroups,
} from "./InitiativeSetupPanels";

export { orderInitiativePreview, reorderTiedInitiative } from "./InitiativeSetupPanels";

export function EncounterInitiativePage() {
  const { runID } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [drafts, setDrafts] = useState<InitiativeDrafts>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!runID) return;
    try {
      const runPayload = await api.encounterRun(runID);
      setRun(runPayload.run);
      const encounterPayload = await api.encounter(runPayload.run.encounterId);
      setEncounter(encounterPayload.encounter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load encounter run");
    }
  }

  useEffect(() => {
    void load();
  }, [runID]);

  useEffect(() => {
    if (!run) return;
    setDrafts(
      Object.fromEntries(
        (run.combatants ?? []).map((combatant) => [
          combatant.id,
          combatant.initiativeSet ? String(combatant.initiative) : "",
        ]),
      ),
    );
  }, [run]);

  async function command(fn: () => Promise<{ run: EncounterRun }>) {
    if (!runID) return null;
    setBusy(true);
    try {
      const payload = await fn();
      setRun(payload.run);
      setError("");
      return payload.run;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update initiative");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function commitInitiative(combatant: EncounterRunCombatant) {
    if (!runID) return;
    const raw = (drafts[combatant.id] ?? "").trim();
    if (raw === "") {
      if (combatant.initiativeSet) {
        await command(() => api.setInitiative(runID, combatant.id, null));
      }
      return;
    }
    const initiative = Number(raw);
    if (!Number.isFinite(initiative) || !Number.isInteger(initiative)) {
      setError("Initiative must be a whole number, or empty when unresolved.");
      return;
    }
    if (combatant.initiativeSet && initiative === combatant.initiative) return;
    await command(() => api.setInitiative(runID, combatant.id, initiative));
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!runID || !run || !event.over || event.active.id === event.over.id) return;
    const reordered = reorderTiedInitiative(
      orderInitiativePreview(run.combatants ?? []),
      String(event.active.id),
      String(event.over.id),
    );
    if (!reordered) {
      setError("Only combatants with the same initiative can be reordered.");
      return;
    }
    const optimistic = reordered.map((combatant, index) => ({ ...combatant, sortOrder: index }));
    setRun({ ...run, combatants: optimistic });
    await command(() =>
      api.reorderInitiative(
        runID,
        optimistic.map((combatant) => combatant.id),
      ),
    );
  }

  async function beginCombat() {
    if (!run || !allInitiativeReady(run.combatants ?? [])) return;
    const next = await command(() => api.beginEncounterRun(run.id));
    if (next) void navigate(`/encounter-runs/${run.id}`);
  }

  if (!run) return <MutedPanel>{error || "Loading initiative..."}</MutedPanel>;

  const combatants = run.combatants ?? [];
  const groups = groupCombatants(combatants);
  const ordered = orderInitiativePreview(combatants);
  const readyCount = combatants.filter((combatant) => combatant.initiativeSet).length;
  const unresolvedCount = combatants.length - readyCount;
  const ready = allInitiativeReady(combatants);

  return (
    <Page size="wide" className="gap-3">
      <BackButton to={encounter ? `/campaigns/${encounter.campaignId}` : "/campaigns"}>
        Back to campaign
      </BackButton>
      <Breadcrumbs
        items={[
          { label: "Encounter runs", to: "/campaigns" },
          ...(encounter ? [{ label: encounter.name }] : [{ label: "Encounter" }]),
          { label: "Initiative" },
        ]}
      />
      <InitiativePageHeader
        combatants={combatants}
        encounter={encounter}
        groups={groups}
        onEdit={(path) => void navigate(path)}
      />
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <SidebarDetailLayout variant="initiative" className="-mt-1 min-h-0 items-stretch">
        <InitiativeEntryPanel
          busy={busy}
          drafts={drafts}
          groups={groups}
          readyCount={readyCount}
          onClear={() => void command(() => api.clearInitiative(run.id))}
          onCommit={commitInitiative}
          onDraftChange={(id, value) => setDrafts((current) => ({ ...current, [id]: value }))}
          onRoll={(sides) => void command(() => api.rollInitiative(run.id, sides))}
        />
        <InitiativePreviewPanel
          busy={busy}
          combatantCount={combatants.length}
          ordered={ordered}
          ready={ready}
          readyCount={readyCount}
          unresolvedCount={unresolvedCount}
          onBegin={() => void beginCombat()}
          onDragEnd={(event) => void handleDragEnd(event)}
        />
      </SidebarDetailLayout>
    </Page>
  );
}

function InitiativePageHeader({
  combatants,
  encounter,
  groups,
  onEdit,
}: {
  combatants: EncounterRunCombatant[];
  encounter: Encounter | null;
  groups: InitiativeGroups;
  onEdit: (path: string) => void;
}) {
  const difficulty = calculateRunEncounterDifficulty(combatants);
  return (
    <header className="relative top-[0.1875rem] flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Set initiative</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Enter the rolls your players call out. Roll NPCs and allies here, or override any
          generated result manually.
        </p>
        <ActionRow className="mt-2.5 text-sm text-muted-foreground">
          <Swords className="h-4 w-4 shrink-0 text-foreground" />
          <strong className="text-foreground">{encounter?.name ?? "Encounter run"}</strong>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-warning">{difficulty.label}</span>
          <span aria-hidden="true">·</span>
          <span>
            {groups.player.length} player{groups.player.length === 1 ? "" : "s"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {groups.friendly.length} all{groups.friendly.length === 1 ? "y" : "ies"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {groups.enemy.length} enem{groups.enemy.length === 1 ? "y" : "ies"}
          </span>
        </ActionRow>
      </div>
      {encounter ? (
        <Button
          className="mt-3.5 !h-[2.375rem] border-primary text-primary"
          type="button"
          variant="outline"
          icon={Pencil}
          onClick={() =>
            onEdit(`/campaigns/${encounter.campaignId}/encounters/${encounter.id}/edit`)
          }
        >
          Edit encounter
        </Button>
      ) : null}
    </header>
  );
}

function groupCombatants(combatants: EncounterRunCombatant[]): InitiativeGroups {
  const byName = (left: EncounterRunCombatant, right: EncounterRunCombatant) =>
    left.displayName.localeCompare(right.displayName, undefined, { numeric: true });
  return {
    player: combatants.filter((combatant) => combatant.side === "player").sort(byName),
    friendly: combatants.filter((combatant) => combatant.side === "friendly").sort(byName),
    enemy: combatants.filter((combatant) => combatant.side === "enemy").sort(byName),
  };
}

function allInitiativeReady(combatants: EncounterRunCombatant[]) {
  return combatants.length > 0 && combatants.every((combatant) => combatant.initiativeSet);
}
