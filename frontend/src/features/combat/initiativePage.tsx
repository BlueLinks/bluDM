import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Play, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import {
  Button,
  Callout,
  EmptyMini,
  Input,
  MutedPanel,
  Page,
  PageHeader,
  SectionPanel,
  StatPill,
} from "../../components/ui";
import { api } from "../../lib/api";
import { calculateRunEncounterDifficulty } from "../../lib/domain/combat";
import type { Encounter, EncounterRun, EncounterRunCombatant } from "../../types";
import { DifficultyPill } from "../encounters/DifficultyPill";
import { RunCombatantAvatar } from "./RunCombatantAvatar";

export function EncounterInitiativePage() {
  const { runID } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  async function command(fn: () => Promise<{ run: EncounterRun }>) {
    if (!runID) return;
    try {
      setRun((await fn()).run);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update initiative");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const combatants = run?.combatants ?? [];
    if (!event.over || event.active.id === event.over.id || !runID) return;
    const oldIndex = combatants.findIndex((combatant) => combatant.id === event.active.id);
    const newIndex = combatants.findIndex((combatant) => combatant.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(combatants, oldIndex, newIndex);
    setRun(run ? { ...run, combatants: reordered } : run);
    await command(() =>
      api.reorderInitiative(
        runID,
        reordered.map((combatant) => combatant.id),
      ),
    );
  }

  if (!run) {
    return <MutedPanel>{error || "Loading initiative..."}</MutedPanel>;
  }

  const combatants = run.combatants ?? [];
  const grouped = {
    player: combatants.filter((combatant) => combatant.side === "player"),
    friendly: combatants.filter((combatant) => combatant.side === "friendly"),
    enemy: combatants.filter((combatant) => combatant.side === "enemy"),
  };
  const difficulty = calculateRunEncounterDifficulty(combatants);

  return (
    <Page>
      <BackButton to={encounter ? `/campaigns/${encounter.campaignId}` : "/campaigns"}>
        Back to campaign
      </BackButton>
      <Breadcrumbs
        items={[
          { label: "Campaigns", to: "/campaigns" },
          ...(encounter ? [{ label: encounter.name }] : [{ label: "Encounter" }]),
          { label: "Initiative" },
        ]}
      />
      <PageHeader
        eyebrow={run.isTest ? "Test Run" : "Encounter Run"}
        title="Set initiative"
        copy="Roll the table into order before the first round begins. Players can stay manual while NPC groups are rolled together."
        action={
          <div className="flex flex-wrap gap-2">
            {encounter && (
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() =>
                  void navigate(
                    `/campaigns/${encounter.campaignId}/encounters/${encounter.id}/edit`,
                  )
                }
              >
                Edit Encounter
              </Button>
            )}
            <Button
              icon={Play}
              onClick={() => {
                void command(() => api.beginEncounterRun(run.id)).then(
                  () => void navigate(`/encounter-runs/${run.id}`),
                );
              }}
            >
              Begin Combat
            </Button>
          </div>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[180px_repeat(4,1fr)_auto] md:items-center">
        <DifficultyPill difficulty={difficulty} />
        <StatPill label="Enemy XP" value={difficulty.enemyXP} />
        <StatPill label="Adjusted XP" value={difficulty.adjustedXP} />
        <StatPill label="Multiplier" value={`${difficulty.multiplier}x`} />
        <StatPill label="Enemies" value={grouped.enemy.length} />
        <Button
          variant="secondary"
          onClick={() => command(() => api.rollInitiative(run.id, ["friendly", "enemy"]))}
        >
          Roll All Non-Players
        </Button>
      </div>
      <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={combatants.map((combatant) => combatant.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <InitiativeGroup
              title="Players"
              combatants={grouped.player}
              runID={run.id}
              onUpdate={setRun}
              onRoll={() => command(() => api.rollInitiative(run.id, ["player"]))}
            />
            <InitiativeGroup
              title="Friendlies"
              combatants={grouped.friendly}
              runID={run.id}
              onUpdate={setRun}
              onRoll={() => command(() => api.rollInitiative(run.id, ["friendly"]))}
            />
            <InitiativeGroup
              title="Enemies"
              combatants={grouped.enemy}
              runID={run.id}
              onUpdate={setRun}
              onRoll={() => command(() => api.rollInitiative(run.id, ["enemy"]))}
            />
          </div>
        </SortableContext>
      </DndContext>
    </Page>
  );
}

function InitiativeGroup({
  title,
  combatants,
  runID,
  onUpdate,
  onRoll,
}: {
  title: string;
  combatants: EncounterRunCombatant[];
  runID: string;
  onUpdate: (run: EncounterRun) => void;
  onRoll?: () => void;
}) {
  return (
    <SectionPanel title={title} icon={UsersRound}>
      <div className="grid gap-2">
        {onRoll && (
          <Button type="button" variant="secondary" size="sm" onClick={onRoll}>
            Roll {title}
          </Button>
        )}
        {combatants.length === 0 && <EmptyMini copy="No combatants in this group." />}
        {combatants.map((combatant) => (
          <SortableInitiativeRow
            key={combatant.id}
            combatant={combatant}
            runID={runID}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </SectionPanel>
  );
}

function SortableInitiativeRow({
  combatant,
  runID,
  onUpdate,
}: {
  combatant: EncounterRunCombatant;
  runID: string;
  onUpdate: (run: EncounterRun) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: combatant.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const tone =
    combatant.side === "enemy"
      ? "border-red-500/30 bg-red-500/10"
      : combatant.side === "friendly"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : "border-sky-500/25 bg-sky-500/10";
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "grid grid-cols-[auto_auto_1fr_88px] items-center gap-2 rounded-lg border p-2",
        tone,
      ].join(" ")}
    >
      <button
        type="button"
        className="cursor-grab rounded-md p-2 text-muted-foreground hover:bg-muted"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <RunCombatantAvatar combatant={combatant} />
      <div className="min-w-0">
        <div className="truncate font-semibold">{combatant.displayName}</div>
        <div className="text-xs capitalize text-muted-foreground">{combatant.side}</div>
      </div>
      <Input
        className="text-center font-semibold"
        type="number"
        value={combatant.initiativeSet ? combatant.initiative : ""}
        placeholder="Init"
        onChange={(event) => {
          const initiative = Number(event.target.value) || 0;
          void api
            .setInitiative(runID, combatant.id, initiative)
            .then((payload) => onUpdate(payload.run));
        }}
      />
    </div>
  );
}
