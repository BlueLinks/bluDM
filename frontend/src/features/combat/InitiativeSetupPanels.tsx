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
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dices,
  GripVertical,
  Play,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { ActionRow } from "../../components/layout";
import { Button, EmptyMini, Input } from "../../components/ui";
import type { EncounterRunCombatant } from "../../types";
import { RunCombatantAvatar } from "./RunCombatantAvatar";

export type InitiativeDrafts = Record<string, string>;
export type InitiativeGroups = {
  player: EncounterRunCombatant[];
  friendly: EncounterRunCombatant[];
  enemy: EncounterRunCombatant[];
};

export function InitiativeEntryPanel({
  busy,
  drafts,
  groups,
  readyCount,
  onClear,
  onCommit,
  onDraftChange,
  onRoll,
}: {
  busy: boolean;
  drafts: InitiativeDrafts;
  groups: InitiativeGroups;
  readyCount: number;
  onClear: () => void;
  onCommit: (combatant: EncounterRunCombatant, value: string) => void;
  onDraftChange: (id: string, value: string) => void;
  onRoll: (sides: Array<"friendly" | "enemy">) => void;
}) {
  return (
    <section className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-card p-3">
      <ActionRow className="mb-1" justify="between">
        <Button
          className="relative top-px !h-[2.4375rem] px-[2.1875rem] !py-1"
          type="button"
          icon={Dices}
          disabled={busy}
          onClick={() => onRoll(["friendly", "enemy"])}
        >
          Roll NPCs &amp; allies
        </Button>
        <Button type="button" variant="ghost" disabled={busy || readyCount === 0} onClick={onClear}>
          Clear values
        </Button>
      </ActionRow>
      <InitiativeGroup
        title="Players"
        hint="Enter physical rolls"
        combatants={groups.player}
        drafts={drafts}
        onDraftChange={onDraftChange}
        onCommit={onCommit}
      />
      <InitiativeGroup
        title="Allies"
        combatants={groups.friendly}
        drafts={drafts}
        rollAction={
          <Button
            className="!h-[2.125rem] border-primary px-4 !py-0.5 text-primary"
            type="button"
            icon={RotateCcw}
            size="sm"
            variant="outline"
            disabled={busy || groups.friendly.length === 0}
            onClick={() => onRoll(["friendly"])}
          >
            Re-roll allies
          </Button>
        }
        onDraftChange={onDraftChange}
        onCommit={onCommit}
      />
      <InitiativeGroup
        title="Enemies"
        combatants={groups.enemy}
        drafts={drafts}
        rollAction={
          <Button
            className="!h-[2.125rem] border-primary px-4 !py-0.5 text-primary"
            type="button"
            icon={RotateCcw}
            size="sm"
            variant="outline"
            disabled={busy || groups.enemy.length === 0}
            onClick={() => onRoll(["enemy"])}
          >
            Re-roll enemies
          </Button>
        }
        onDraftChange={onDraftChange}
        onCommit={onCommit}
      />
    </section>
  );
}

export function InitiativePreviewPanel({
  busy,
  combatantCount,
  ordered,
  ready,
  readyCount,
  unresolvedCount,
  onBegin,
  onDragEnd,
}: {
  busy: boolean;
  combatantCount: number;
  ordered: EncounterRunCombatant[];
  ready: boolean;
  readyCount: number;
  unresolvedCount: number;
  onBegin: () => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <aside className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-card px-[1.125rem] py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Turn order preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag tied results into the order you want.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums text-success">
          {readyCount} of {combatantCount} ready
          {ready ? <CheckCircle2 className="h-5 w-5" /> : null}
        </div>
      </div>
      <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext
          items={ordered.map((combatant) => combatant.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 grid max-h-[60svh] min-h-0 gap-2 overflow-y-auto">
            {ordered.map((combatant, index) => (
              <SortablePreviewRow key={combatant.id} combatant={combatant} position={index + 1} />
            ))}
            {ordered.length === 0 ? <EmptyMini copy="No combatants in this run." /> : null}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mt-1 grid gap-[0.875rem] border-t border-border pt-3">
        <div
          className={[
            "flex items-center justify-center gap-2 text-sm font-medium",
            ready ? "text-success" : "text-muted-foreground",
          ].join(" ")}
        >
          {ready ? <CheckCircle2 className="h-5 w-5" /> : null}
          {ready
            ? "All initiative values are set"
            : `${unresolvedCount} value${unresolvedCount === 1 ? "" : "s"} still unresolved`}
        </div>
        <Button
          className="py-3"
          type="button"
          icon={Play}
          disabled={busy || !ready}
          onClick={onBegin}
        >
          Begin Combat
        </Button>
        {ready && ordered[0] ? (
          <p className="text-center text-xs text-muted-foreground">
            Starts round 1 with {ordered[0].displayName}.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function InitiativeGroup({
  title,
  hint,
  combatants,
  drafts,
  rollAction,
  onDraftChange,
  onCommit,
}: {
  title: string;
  hint?: string;
  combatants: EncounterRunCombatant[];
  drafts: InitiativeDrafts;
  rollAction?: ReactNode;
  onDraftChange: (id: string, value: string) => void;
  onCommit: (combatant: EncounterRunCombatant, value: string) => void;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-md border border-border bg-background",
        title === "Allies" ? "min-h-[6.6875rem]" : "",
        title === "Enemies" ? "-mt-px min-h-72" : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border px-3",
          hint ? "py-2" : "py-1.5",
        ].join(" ")}
      >
        <div className={["flex min-w-0 gap-2", hint ? "items-start" : "items-center"].join(" ")}>
          <UsersRound className="h-4 w-4 text-accent" />
          <div className="min-w-0">
            <h2 className="font-semibold">
              {title} ({combatants.length})
            </h2>
            {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
          </div>
        </div>
        {hint ? (
          <span className="text-xs font-medium text-muted-foreground">Initiative</span>
        ) : (
          rollAction
        )}
      </div>
      {combatants.length === 0 ? (
        <div className="p-3">
          <EmptyMini copy={`No ${title.toLowerCase()} in this run.`} />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {combatants.map((combatant) => (
            <InitiativeInputRow
              key={combatant.id}
              combatant={combatant}
              value={drafts[combatant.id] ?? ""}
              onChange={(value) => onDraftChange(combatant.id, value)}
              onCommit={(value) => onCommit(combatant, value)}
              onReset={() =>
                onDraftChange(
                  combatant.id,
                  combatant.initiativeSet ? String(combatant.initiative) : "",
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InitiativeInputRow({
  combatant,
  value,
  onChange,
  onCommit,
  onReset,
}: {
  combatant: EncounterRunCombatant;
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[1.5rem_auto_minmax(0,1fr)_7rem_4.5rem] items-center gap-2 px-3",
        combatant.side === "enemy" ? "border-l-2 border-l-destructive" : "",
        combatant.side === "player" ? "py-[0.4375rem]" : "py-2",
      ].join(" ")}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/70" aria-hidden="true" />
      <RunCombatantAvatar
        combatant={combatant}
        tone={combatant.side === "friendly" ? "personal" : "primary"}
      />
      <div className="min-w-0">
        <div className="truncate font-medium">{combatant.displayName}</div>
        <div className="text-xs text-muted-foreground">{initiativeMeta(combatant)}</div>
      </div>
      <div className="relative">
        <Input
          aria-label={`${combatant.displayName} initiative`}
          className="initiative-number-input text-center font-semibold tabular-nums"
          inputMode="numeric"
          placeholder="—"
          step={1}
          type="number"
          value={value}
          onBlur={(event) => onCommit(event.currentTarget.value)}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit(event.currentTarget.value);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onReset();
            }
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-1.5 top-1/2 grid -translate-y-1/2 text-muted-foreground"
        >
          <ChevronUp className="h-3 w-3" />
          <ChevronDown className="-mt-1 h-3 w-3" />
        </span>
      </div>
      <span className="text-right text-xs font-medium text-muted-foreground">
        {combatant.side === "player" ? "Manual" : "Generated"}
      </span>
    </div>
  );
}

function SortablePreviewRow({
  combatant,
  position,
}: {
  combatant: EncounterRunCombatant;
  position: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: combatant.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "grid min-w-0 grid-cols-[auto_2rem_2.5rem_auto_minmax(0,1fr)] items-center gap-2 rounded-md border border-border bg-background px-2 py-1",
        isDragging ? "opacity-70 shadow-md" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="grid h-9 w-8 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        aria-label={`Reorder ${combatant.displayName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="grid h-9 place-items-center rounded-md border border-border bg-card text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {position}
      </span>
      <span className="text-center text-lg font-semibold tabular-nums">
        {combatant.initiativeSet ? combatant.initiative : "—"}
      </span>
      <RunCombatantAvatar
        combatant={combatant}
        tone={combatant.side === "friendly" ? "personal" : "primary"}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{combatant.displayName}</div>
        {!combatant.initiativeSet ? <div className="text-xs text-warning">Unresolved</div> : null}
      </div>
    </div>
  );
}

export function orderInitiativePreview(combatants: EncounterRunCombatant[]) {
  return [...combatants].sort((left, right) => {
    if (left.initiativeSet !== right.initiativeSet) return left.initiativeSet ? -1 : 1;
    if (left.initiativeSet && right.initiativeSet && left.initiative !== right.initiative) {
      return right.initiative - left.initiative;
    }
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.displayName.localeCompare(right.displayName);
  });
}

export function reorderTiedInitiative(
  combatants: EncounterRunCombatant[],
  activeID: string,
  overID: string,
) {
  const oldIndex = combatants.findIndex((combatant) => combatant.id === activeID);
  const newIndex = combatants.findIndex((combatant) => combatant.id === overID);
  if (oldIndex < 0 || newIndex < 0) return null;
  const active = combatants[oldIndex];
  const over = combatants[newIndex];
  if (!active.initiativeSet || !over.initiativeSet || active.initiative !== over.initiative) {
    return null;
  }
  return arrayMove(combatants, oldIndex, newIndex);
}

function initiativeMeta(combatant: EncounterRunCombatant) {
  if (combatant.side === "player") return "Player";
  const creature = combatant.snapshot.creature;
  const record =
    creature && typeof creature === "object" ? (creature as Record<string, unknown>) : {};
  const size = combatant.side === "enemy" && typeof record.size === "string" ? record.size : "";
  const type = record.creatureType ?? record.creature_type;
  return [
    combatant.side === "friendly" ? "Ally" : "Enemy",
    size,
    typeof type === "string" ? type : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
