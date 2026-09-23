import { Check, HeartPulse, Plus, Shield, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { ClassNameText } from "../../components/shared/categoryText";
import { StatChip } from "../../components/shared/displayPrimitives";
import { Badge, Button } from "../../components/ui";
import type { Creature, Player } from "../../types";
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
      <ol className="flex flex-wrap gap-2 text-sm sm:grid sm:grid-cols-[10.75rem_10.9375rem_10.9375rem] sm:gap-2.5">
        {steps.map((item, index) => {
          const active = item === step;
          const completed = index < furthestIndex;
          const reachable = index <= furthestIndex;
          return (
            <li className="min-w-0" key={item}>
              <button
                aria-current={active ? "step" : undefined}
                className={[
                  "inline-flex w-full items-center gap-2 rounded-md border px-3 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50",
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
        className="h-4 w-4 accent-primary"
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
  availableAllies,
  availablePlayers,
  players,
  onAddAllPlayers,
  onAddAlly,
  onAddAvailableAlly,
  onAddPlayer,
  onRemoveAlly,
  onRemovePlayer,
}: {
  allies: EncounterBuilderCreatureDraft[];
  availableAllies: Creature[];
  availablePlayers: Player[];
  players: Player[];
  onAddAllPlayers: () => void;
  onAddAlly: () => void;
  onAddAvailableAlly: (creature: Creature) => void;
  onAddPlayer: (player: Player) => void;
  onRemoveAlly: (id: string) => void;
  onRemovePlayer: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RosterPanel
        icon={UsersRound}
        title={`Available · ${availablePlayers.length + availableAllies.length}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            icon={Plus}
            size="sm"
            disabled={!availablePlayers.length}
            onClick={onAddAllPlayers}
          >
            Add all party
          </Button>
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddAlly}>
            Browse allies
          </Button>
        </div>
        <RosterLabel icon={UsersRound} label="Party members" />
        <div className="grid gap-2">
          {availablePlayers.map((player) => (
            <button
              aria-label={`Add ${player.characterName}`}
              className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              key={player.id}
              type="button"
              onClick={() => onAddPlayer(player)}
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{player.characterName}</span>
                {typeof player.characterSheet.className === "string" ? (
                  <span className="ml-2 text-xs">
                    <ClassNameText>{player.characterSheet.className}</ClassNameText>
                  </span>
                ) : null}
              </span>
              <Plus className="h-4 w-4 shrink-0" />
            </button>
          ))}
          {!availablePlayers.length ? (
            <p className="text-sm text-muted-foreground">All party members are included.</p>
          ) : null}
        </div>
        <RosterLabel icon={Shield} label="Campaign NPCs as allies" />
        <div className="grid gap-2">
          {availableAllies.map((creature) => (
            <button
              aria-label={`Add ${creature.name} as ally`}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              key={creature.id}
              type="button"
              onClick={() => onAddAvailableAlly(creature)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{creature.name}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <StatChip icon={Shield} label="AC" tone="primary" value={creature.armorClass} />
                  <StatChip
                    icon={HeartPulse}
                    label="HP"
                    tone="tertiary"
                    value={creature.hitPoints}
                  />
                </span>
              </span>
              <Plus className="h-4 w-4 shrink-0" />
            </button>
          ))}
          {!availableAllies.length ? (
            <p className="text-sm text-muted-foreground">No other campaign NPCs available.</p>
          ) : null}
        </div>
      </RosterPanel>
      <RosterPanel icon={Check} title={`Included · ${players.length + allies.length}`}>
        {!players.length && !allies.length ? (
          <p className="text-sm text-muted-foreground">
            Nothing is included yet. Add party members or allies from the left.
          </p>
        ) : null}
        {players.length ? (
          <RosterLabel icon={UsersRound} label={`Party members · ${players.length}`} />
        ) : null}
        <PlayerDraftList players={players} onRemove={onRemovePlayer} />
        {allies.length ? <RosterLabel icon={Shield} label={`Allies · ${allies.length}`} /> : null}
        <AllyDraftList drafts={allies} onRemove={onRemoveAlly} />
      </RosterPanel>
    </div>
  );
}

function RosterPanel({
  children,
  icon: Icon,
  title,
}: {
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
      </div>
      {children}
    </section>
  );
}

function RosterLabel({ icon: Icon, label }: { icon: typeof UsersRound; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
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
  if (!players.length) return null;
  return (
    <div className="grid gap-2">
      {players.map((player) => (
        <PlayerCombatantCard
          compact
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
  if (!drafts.length) return null;
  return (
    <div className="grid gap-2">
      {drafts.map((draft) => (
        <CreatureCombatantCard
          compact
          key={draft.id}
          creature={draft.creature}
          badge={<Badge tone="shared">Friendly</Badge>}
          quantity={draft.quantity > 1 ? `Qty ${draft.quantity}` : undefined}
          tone="friendly"
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
