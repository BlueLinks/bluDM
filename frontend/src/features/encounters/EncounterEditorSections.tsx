import { ClipboardList, Plus, Swords, UsersRound } from "lucide-react";
import { Button, Field, FloatingInput, SectionPanel, Select, Textarea } from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { DraftCombatant, Player } from "../../types";
import { CombatantList } from "./editorComponents";
import type { EncounterMetaDraft } from "./domain";
import { playerClassLevel } from "./domain";

export function EncounterDetailsSection({
  meta,
  onChange,
}: {
  meta: EncounterMetaDraft;
  onChange: (meta: EncounterMetaDraft) => void;
}) {
  return (
    <SectionPanel title="Encounter Details" icon={ClipboardList}>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
        <FloatingInput
          label="Name"
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
        <Field label="Status">
          <Select
            value={meta.status}
            placeholder="Status"
            options={encounterStatusOptions}
            onValueChange={(status) => onChange({ ...meta, status })}
          />
        </Field>
      </div>
      <Field className="mt-3" label="Description">
        <Textarea
          rows={3}
          value={meta.description}
          onChange={(event) => onChange({ ...meta, description: event.target.value })}
        />
      </Field>
    </SectionPanel>
  );
}

export function EncounterRosterSections({
  availablePlayers,
  enemyCombatants,
  friendlyCombatants,
  playerCombatants,
  onAddAllPlayers,
  onAddPlayer,
  onEdit,
  onRemove,
}: {
  availablePlayers: Player[];
  enemyCombatants: DraftCombatant[];
  friendlyCombatants: DraftCombatant[];
  playerCombatants: DraftCombatant[];
  onAddAllPlayers: () => void;
  onAddPlayer: (player: Player) => void;
  onEdit: (combatant: DraftCombatant) => void;
  onRemove: (combatant: DraftCombatant) => void;
}) {
  return (
    <div className="grid gap-4">
      <SectionPanel title="Players And Friendlies" icon={UsersRound}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Add or remove player characters here. Full player editing stays in the Players section.
          </p>
          <Button
            type="button"
            icon={Plus}
            size="sm"
            variant="success"
            disabled={availablePlayers.length === 0}
            onClick={onAddAllPlayers}
          >
            Add all players
          </Button>
        </div>
        {availablePlayers.length > 0 && (
          <div className="mb-4 grid gap-2">
            {availablePlayers.map((player) => (
              <div
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2"
                key={player.id}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{player.characterName}</div>
                  <div className="text-xs text-muted-foreground">{playerClassLevel(player)}</div>
                </div>
                <Button
                  type="button"
                  icon={Plus}
                  size="sm"
                  variant="secondary"
                  onClick={() => onAddPlayer(player)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Players
        </h4>
        <CombatantList
          combatants={playerCombatants}
          empty="No players added yet."
          sideTone="player"
          onRemove={onRemove}
        />
        <h4 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Friendlies
        </h4>
        <CombatantList
          combatants={friendlyCombatants}
          empty="No friendly NPCs or monsters yet."
          sideTone="friendly"
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </SectionPanel>
      <SectionPanel title="Enemies" icon={Swords}>
        <CombatantList
          combatants={enemyCombatants}
          empty="No enemies yet."
          sideTone="enemy"
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </SectionPanel>
    </div>
  );
}
