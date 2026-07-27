import { FlaskConical, Play, Plus, Skull, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { ResponsiveGrid } from "../../components/layout";
import { Button, Field, Input, Select, Textarea } from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { DraftCombatant, Player } from "../../types";
import { CombatantList } from "./editorComponents";
import type { EncounterMetaDraft } from "./domain";
import { playerClassLevel } from "./domain";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-border py-1 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function EncounterDetailsSection({
  meta,
  nested = false,
  onChange,
}: {
  meta: EncounterMetaDraft;
  nested?: boolean;
  onChange: (meta: EncounterMetaDraft) => void;
}) {
  return (
    <section
      className={[
        "rounded-md border border-border",
        nested ? "bg-surface px-2.5 py-[0.5625rem]" : "bg-card p-3",
      ].join(" ")}
      id="encounter-details"
    >
      <h3 className="border-b border-border pb-1 font-semibold">Details</h3>
      <div className="mt-1.5 grid gap-2 md:grid-cols-2">
        <Field className="!gap-1" label="Encounter name">
          <Input
            className="!h-[1.875rem] !min-h-[1.875rem] px-2 !py-0.5"
            value={meta.name}
            onChange={(event) => onChange({ ...meta, name: event.target.value })}
            required
          />
        </Field>
        <Field className="!gap-1" label="Location">
          <Input
            className="!h-[1.875rem] !min-h-[1.875rem] px-2 !py-0.5"
            value={meta.location}
            onChange={(event) => onChange({ ...meta, location: event.target.value })}
          />
        </Field>
      </div>
      <ResponsiveGrid className="mt-1.5 gap-2" variant="form2">
        <Field className="!gap-1" label="Room">
          <Input
            className="!h-[1.875rem] !min-h-[1.875rem] px-2 !py-0.5"
            value={meta.roomNumber}
            onChange={(event) => onChange({ ...meta, roomNumber: event.target.value })}
          />
        </Field>
        <Field className="!gap-1" label="Status">
          <Select
            className="!min-h-[1.875rem] !py-0.5"
            size="sm"
            value={meta.status}
            placeholder="Status"
            options={encounterStatusOptions}
            onValueChange={(status) => onChange({ ...meta, status })}
          />
        </Field>
      </ResponsiveGrid>
    </section>
  );
}

export function EncounterNotesSection({
  className = "",
  meta,
  nested = false,
  onChange,
}: {
  className?: string;
  meta: EncounterMetaDraft;
  nested?: boolean;
  onChange: (meta: EncounterMetaDraft) => void;
}) {
  return (
    <section
      className={[
        "rounded-md border border-border",
        nested ? "bg-surface px-3 pb-[0.3125rem] pt-1" : "bg-card p-3",
        className,
      ].join(" ")}
      id="encounter-notes"
    >
      <h3 className="border-b border-border pb-1 font-semibold">DM notes</h3>
      <Textarea
        aria-label="Notes for running this encounter"
        className="mt-2 w-full"
        rows={3}
        value={meta.description}
        onChange={(event) => onChange({ ...meta, description: event.target.value })}
      />
    </section>
  );
}

export function EncounterRunningSection({
  allyCount,
  enemyCount,
  partyCount,
  saving,
  nested = false,
  onSaveAndRun,
  onSaveAndTest,
}: {
  allyCount: number;
  enemyCount: number;
  partyCount: number;
  saving: boolean;
  nested?: boolean;
  onSaveAndRun: () => void;
  onSaveAndTest: () => void;
}) {
  return (
    <section
      className={[
        "rounded-md border border-border",
        nested ? "-mt-0.5 bg-surface px-3 pb-[0.5625rem] pt-1.5" : "bg-card p-3",
      ].join(" ")}
      id="encounter-running"
    >
      <h3 className="border-b border-border pb-1 font-semibold">Ready to run</h3>
      <dl className="grid gap-0 text-sm">
        <SummaryRow label="Party" value={`${partyCount} player${partyCount === 1 ? "" : "s"}`} />
        <SummaryRow label="Allies" value={String(allyCount)} />
        <SummaryRow label="Enemies" value={String(enemyCount)} />
        <SummaryRow label="Next" value="Set initiative" />
      </dl>
      <div className="mt-3 grid gap-3.5">
        <Button
          className="!py-[0.5625rem]"
          type="button"
          icon={Play}
          disabled={saving}
          onClick={onSaveAndRun}
        >
          <span className="grid gap-0.5">
            <span>{saving ? "Saving..." : "Run encounter"}</span>
            {!saving ? (
              <span className="text-xs font-normal">
                Creates a run, then opens initiative setup.
              </span>
            ) : null}
          </span>
        </Button>
        <Button
          className="border-primary !py-[0.4375rem] text-primary"
          type="button"
          icon={FlaskConical}
          variant="outline"
          disabled={saving}
          onClick={onSaveAndTest}
        >
          Test run
        </Button>
      </div>
    </section>
  );
}

export function EncounterRosterSections({
  availablePlayers,
  enemyCombatants,
  friendlyCombatants,
  playerCombatants,
  onAddAllPlayers,
  onAddAlly,
  onAddEnemy,
  onAddPlayer,
  onEdit,
  onRemove,
}: {
  availablePlayers: Player[];
  enemyCombatants: DraftCombatant[];
  friendlyCombatants: DraftCombatant[];
  playerCombatants: DraftCombatant[];
  onAddAllPlayers: () => void;
  onAddAlly: () => void;
  onAddEnemy: () => void;
  onAddPlayer: (player: Player) => void;
  onEdit: (combatant: DraftCombatant) => void;
  onRemove: (combatant: DraftCombatant) => void;
}) {
  return (
    <section className="grid gap-3 rounded-md border border-border bg-card p-3 pb-[0.9375rem]">
      <h2 className="font-semibold">Combatants</h2>
      <RosterCard
        action={
          <Button
            className="!h-7 !py-0.5"
            type="button"
            icon={Plus}
            size="sm"
            variant="outline"
            disabled={availablePlayers.length === 0}
            onClick={onAddAllPlayers}
          >
            Add player
          </Button>
        }
        icon={UsersRound}
        id="encounter-party"
        title={`Party (${playerCombatants.length})`}
      >
        {availablePlayers.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {availablePlayers.map((player) => (
              <button
                className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                key={player.id}
                type="button"
                onClick={() => onAddPlayer(player)}
              >
                <span className="block font-medium">{player.characterName}</span>
                <span className="text-xs text-muted-foreground">{playerClassLevel(player)}</span>
              </button>
            ))}
          </div>
        ) : null}
        <CombatantList
          combatants={playerCombatants}
          empty="No players added yet."
          sideTone="player"
          onRemove={onRemove}
        />
      </RosterCard>
      <RosterCard
        action={
          <Button
            className="!h-7 !py-0.5"
            type="button"
            icon={Plus}
            size="sm"
            variant="outline"
            onClick={onAddAlly}
          >
            Add ally
          </Button>
        }
        icon={UsersRound}
        id="encounter-allies"
        title={`Allies (${friendlyCombatants.length})`}
      >
        <CombatantList
          combatants={friendlyCombatants}
          empty="No allies or friendly creatures yet."
          sideTone="friendly"
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </RosterCard>
      <RosterCard
        action={
          <Button
            className="!h-7 px-1.5 !py-0.5"
            type="button"
            icon={Plus}
            size="sm"
            variant="outline"
            onClick={onAddEnemy}
          >
            Add enemy
          </Button>
        }
        icon={Skull}
        id="encounter-enemies"
        title={`Enemies (${enemyCombatants.length})`}
      >
        <CombatantList
          combatants={enemyCombatants}
          empty="No enemies yet."
          sideTone="enemy"
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </RosterCard>
    </section>
  );
}

function RosterCard({
  action,
  children,
  id,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  id: string;
  icon: typeof UsersRound;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface" id={id}>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-1">
        <div
          className={[
            "ml-1 flex items-center gap-3",
            Icon === Skull ? "text-destructive" : "text-primary",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-2">{children}</div>
    </section>
  );
}
