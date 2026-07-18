import {
  ClipboardList,
  FileText,
  FlaskConical,
  ListChecks,
  Play,
  Plus,
  ScrollText,
  Swords,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button, Field, FloatingInput, Select, Textarea } from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { DraftCombatant, Player } from "../../types";
import { CombatantList } from "./editorComponents";
import type { EncounterMetaDraft } from "./domain";
import { playerClassLevel } from "./domain";

export function EncounterEditNav() {
  const items = [
    { label: "Overview", icon: ListChecks, href: "#encounter-overview" },
    { label: "Party", icon: UsersRound, href: "#encounter-party" },
    { label: "Allies", icon: UsersRound, href: "#encounter-allies" },
    { label: "Enemies", icon: Swords, href: "#encounter-enemies" },
    { label: "Details", icon: ClipboardList, href: "#encounter-details" },
    { label: "Notes", icon: FileText, href: "#encounter-notes" },
    { label: "Running", icon: Play, href: "#encounter-running" },
  ];
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Encounter sections">
      {items.map((item, index) => (
        <a
          className={[
            "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium",
            index === 0
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
          href={item.href}
          key={item.href}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function EncounterSummaryPanel({
  createdAt,
  enemyCount,
  meta,
  partyCount,
}: {
  createdAt: string;
  enemyCount: number;
  meta: EncounterMetaDraft;
  partyCount: number;
}) {
  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      id="encounter-overview"
      aria-label="Encounter overview"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Encounter summary</h3>
      </div>
      <dl className="mt-4 grid gap-0 text-sm">
        <SummaryRow label="Location" value={meta.location || "Unplaced"} />
        <SummaryRow label="Status" value={encounterStatusLabel(meta.status)} />
        <SummaryRow label="Party" value={`${partyCount} player${partyCount === 1 ? "" : "s"}`} />
        <SummaryRow label="Enemies" value={`${enemyCount} foe${enemyCount === 1 ? "" : "s"}`} />
        <SummaryRow
          label="Created"
          value={createdAt ? new Date(createdAt).toLocaleDateString() : "Unknown"}
        />
      </dl>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-border py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function EncounterDetailsSection({
  meta,
  onChange,
}: {
  meta: EncounterMetaDraft;
  onChange: (meta: EncounterMetaDraft) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-4" id="encounter-details">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Details</h3>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
        <FloatingInput
          label="Encounter name"
          value={meta.name}
          onChange={(name) => onChange({ ...meta, name })}
          required
        />
        <FloatingInput
          label="Location"
          value={meta.location}
          onChange={(location) => onChange({ ...meta, location })}
        />
        <FloatingInput
          label="Room"
          value={meta.roomNumber}
          onChange={(roomNumber) => onChange({ ...meta, roomNumber })}
        />
      </div>
      <div className="mt-3 max-w-xs">
        <Field label="Status">
          <Select
            value={meta.status}
            placeholder="Status"
            options={encounterStatusOptions}
            onValueChange={(status) => onChange({ ...meta, status })}
          />
        </Field>
      </div>
    </section>
  );
}

export function EncounterNotesSection({
  meta,
  onChange,
}: {
  meta: EncounterMetaDraft;
  onChange: (meta: EncounterMetaDraft) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-4" id="encounter-notes">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Notes</h3>
      </div>
      <Field className="mt-4" label="Description / notes">
        <Textarea
          rows={6}
          value={meta.description}
          onChange={(event) => onChange({ ...meta, description: event.target.value })}
        />
      </Field>
    </section>
  );
}

export function EncounterRunningSection({
  saving,
  onSaveAndRun,
  onSaveAndTest,
}: {
  saving: boolean;
  onSaveAndRun: () => void;
  onSaveAndTest: () => void;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-4" id="encounter-running">
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Running</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" icon={Play} disabled={saving} onClick={onSaveAndRun}>
          {saving ? "Saving..." : "Run encounter"}
        </Button>
        <Button
          type="button"
          icon={FlaskConical}
          variant="tertiary"
          disabled={saving}
          onClick={onSaveAndTest}
        >
          Test
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
    <div className="grid gap-4">
      <RosterCard
        action={
          <Button
            type="button"
            icon={Plus}
            size="sm"
            variant="secondary"
            disabled={availablePlayers.length === 0}
            onClick={onAddAllPlayers}
          >
            Add all players
          </Button>
        }
        id="encounter-party"
        title="Party"
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
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddAlly}>
            Add ally
          </Button>
        }
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
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddEnemy}>
            Add enemy
          </Button>
        }
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
    </div>
  );
}

function RosterCard({
  action,
  children,
  id,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-4" id={id}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-accent" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function encounterStatusLabel(status: string) {
  return encounterStatusOptions.find((option) => option.value === status)?.label ?? "Planned";
}
