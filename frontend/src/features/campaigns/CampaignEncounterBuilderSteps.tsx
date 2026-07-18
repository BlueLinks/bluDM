import { Check, Plus, Shield, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type { Player } from "../../types";
import {
  CreatureCombatantCard,
  IconRemoveButton,
  PlayerCombatantCard,
} from "../encounters/EncounterCombatantCard";
import {
  type EncounterBuilderCreatureDraft,
  type EncounterBuilderStep,
} from "./encounterBuilderGenerator";

export function BuilderProgress({
  step,
  furthestStep,
  onStepSelect,
}: {
  step: EncounterBuilderStep;
  furthestStep: EncounterBuilderStep;
  onStepSelect: (step: EncounterBuilderStep) => void;
}) {
  const steps = ["party", "setup", "review"] as const;
  const furthestIndex = Math.max(
    0,
    steps.findIndex((item) => item === furthestStep),
  );
  return (
    <nav className="border-b border-border pb-3" aria-label="Encounter builder progress">
      <ol className="flex flex-wrap gap-2 text-sm">
        {steps.map((item, index) => {
          const active = item === step;
          const completed = index < furthestIndex;
          const reachable = index <= furthestIndex;
          return (
            <li key={item}>
              <button
                aria-current={active ? "step" : undefined}
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : completed
                      ? "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
                      : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
                ].join(" ")}
                disabled={!reachable}
                type="button"
                onClick={() => onStepSelect(item)}
              >
                <span
                  className={[
                    "grid h-5 w-5 place-items-center rounded-md border text-xs",
                    active
                      ? "border-primary-foreground/30"
                      : completed
                        ? "border-primary/30 bg-primary text-primary-foreground"
                        : "border-border bg-surface text-surface-foreground",
                  ].join(" ")}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                {stepLabel(item)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function stepLabel(step: EncounterBuilderStep) {
  if (step === "party") return "Party & Allies";
  if (step === "setup") return "Encounter Setup";
  return "Review & Create";
}

export function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        className="h-4 w-4"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function PartyAlliesStep({
  allies,
  availablePlayers,
  players,
  onAddAllPlayers,
  onAddAlly,
  onAddPlayer,
  onRemoveAlly,
  onRemovePlayer,
}: {
  allies: EncounterBuilderCreatureDraft[];
  availablePlayers: Player[];
  players: Player[];
  onAddAllPlayers: () => void;
  onAddAlly: () => void;
  onAddPlayer: (player: Player) => void;
  onRemoveAlly: (id: string) => void;
  onRemovePlayer: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4 lg:grid-cols-2">
        <RosterPanel
          action={
            <Button
              type="button"
              icon={Plus}
              size="sm"
              disabled={!availablePlayers.length}
              onClick={onAddAllPlayers}
            >
              Add all party members
            </Button>
          }
          icon={UsersRound}
          title="Player Characters"
        >
          <PlayerDraftList players={players} onRemove={onRemovePlayer} />
          <AddList players={availablePlayers} onAddPlayer={onAddPlayer} />
        </RosterPanel>
        <RosterPanel
          action={
            <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddAlly}>
              Add ally
            </Button>
          }
          icon={Shield}
          title="Allies"
        >
          <AllyDraftList drafts={allies} onRemove={onRemoveAlly} />
        </RosterPanel>
      </div>
      <PartySummary allies={allies} players={players} />
    </div>
  );
}

function RosterPanel({
  action,
  children,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: typeof UsersRound;
  title: string;
}) {
  return (
    <section className="grid content-start gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-accent" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddList({
  players,
  onAddPlayer,
}: {
  players: Player[];
  onAddPlayer: (player: Player) => void;
}) {
  return (
    <div className="grid gap-2">
      {players.map((player) => (
        <button
          className="rounded-md border border-border bg-surface p-2 text-left text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          key={player.id}
          type="button"
          onClick={() => onAddPlayer(player)}
        >
          {player.characterName}
        </button>
      ))}
    </div>
  );
}

function PlayerDraftList({
  players,
  onRemove,
}: {
  players: Player[];
  onRemove: (id: string) => void;
}) {
  if (!players.length)
    return <p className="text-sm text-muted-foreground">No players added yet.</p>;
  return (
    <div className="grid gap-2">
      {players.map((player) => (
        <PlayerCombatantCard
          key={player.id}
          player={player}
          actions={
            <IconRemoveButton
              label={`Remove ${player.characterName}`}
              onClick={() => onRemove(player.id)}
            />
          }
        />
      ))}
    </div>
  );
}

function AllyDraftList({
  drafts,
  onRemove,
}: {
  drafts: EncounterBuilderCreatureDraft[];
  onRemove: (id: string) => void;
}) {
  if (!drafts.length) return <p className="text-sm text-muted-foreground">None added yet.</p>;
  return (
    <div className="grid gap-2">
      {drafts.map((draft) => (
        <CreatureCombatantCard
          key={draft.id}
          creature={draft.creature}
          badge={<Badge tone="shared">Friendly</Badge>}
          quantity={draft.quantity > 1 ? `Qty ${draft.quantity}` : undefined}
          actions={
            <IconRemoveButton
              label={`Remove ${draft.creature.name}`}
              onClick={() => onRemove(draft.id)}
            />
          }
        />
      ))}
    </div>
  );
}

function PartySummary({
  allies,
  players,
}: {
  allies: EncounterBuilderCreatureDraft[];
  players: Player[];
}) {
  const averageLevel = players.length
    ? Math.round(players.reduce((total, player) => total + playerLevel(player), 0) / players.length)
    : 0;
  const difficulty = calculateEncounterDifficulty(players, []);
  return (
    <aside className="grid content-start gap-3 rounded-md border border-border bg-card p-3">
      <div className="font-semibold">Party Summary</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <SummaryMetric label="Players" value={players.length} />
        <SummaryMetric label="Allies" value={allies.length} />
        <SummaryMetric label="Average Level" value={averageLevel || "-"} />
        <SummaryMetric label="Deadly Threshold" value={`${difficulty.thresholds.deadly} XP`} />
      </div>
      <p className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {players.length + allies.length
          ? `You have ${players.length + allies.length} participant${
              players.length + allies.length === 1 ? "" : "s"
            } in this encounter.`
          : "Add at least one player before tuning encounter difficulty."}
      </p>
    </aside>
  );
}

function SummaryMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function playerLevel(player: Player) {
  return typeof player.characterSheet.level === "number" ? player.characterSheet.level : 1;
}
