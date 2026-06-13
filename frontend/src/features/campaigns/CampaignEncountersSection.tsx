import { ClipboardList, Copy, FlaskConical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  EmptyMini,
  Field,
  FloatingInput,
  Modal,
  SectionPanel,
  Select,
  Textarea,
} from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { Encounter } from "../../types";

const encounterStatusLabel = (status: string) =>
  encounterStatusOptions.find((option) => option.value === status)?.label ?? "Planned";

export function CampaignEncountersSection({
  campaignID,
  description,
  encounterOpen,
  encounters,
  location,
  name,
  roomNumber,
  status,
  onClone,
  onCreate,
  onDescriptionChange,
  onLocationChange,
  onNameChange,
  onOpenChange,
  onRemove,
  onRoomNumberChange,
  onStart,
  onStatusChange,
}: {
  campaignID: string;
  description: string;
  encounterOpen: boolean;
  encounters: Encounter[];
  location: string;
  name: string;
  roomNumber: string;
  status: string;
  onClone: (encounter: Encounter) => void;
  onCreate: (event: FormEvent) => void;
  onDescriptionChange: (description: string) => void;
  onLocationChange: (location: string) => void;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onRemove: (encounter: Encounter) => void;
  onRoomNumberChange: (roomNumber: string) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <SectionPanel title="Encounters" icon={ClipboardList}>
      {encounters.length === 0 ? (
        <EmptyMini copy="No encounters yet. Create one here, then open the full builder to add players, allies, and enemies." />
      ) : (
        <div className="grid gap-3">
          {encounters.map((encounter) => (
            <EncounterCard
              campaignID={campaignID}
              encounter={encounter}
              key={encounter.id}
              onClone={onClone}
              onRemove={onRemove}
              onStart={onStart}
            />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Modal
          open={encounterOpen}
          onOpenChange={onOpenChange}
          title="Add encounter"
          trigger={
            <Button type="button" icon={Plus} variant="success">
              Add encounter
            </Button>
          }
        >
          <form className="grid gap-4" onSubmit={onCreate}>
            <FloatingInput label="Encounter name" value={name} onChange={onNameChange} required />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Status">
                <Select
                  value={status}
                  placeholder="Status"
                  options={encounterStatusOptions}
                  onValueChange={onStatusChange}
                />
              </Field>
              <FloatingInput label="Location" value={location} onChange={onLocationChange} />
              <FloatingInput label="Room number" value={roomNumber} onChange={onRoomNumberChange} />
            </div>
            <Field label="Description">
              <Textarea
                rows={4}
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Optional notes, setup, terrain, or goals"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" icon={Plus} variant="success">
                Create encounter
              </Button>
            </div>
          </form>
        </Modal>
        <Button type="button" variant="secondary" disabled>
          Import encounter
        </Button>
      </div>
    </SectionPanel>
  );
}

function EncounterCard({
  campaignID,
  encounter,
  onClone,
  onRemove,
  onStart,
}: {
  campaignID: string;
  encounter: Encounter;
  onClone: (encounter: Encounter) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{encounter.name}</div>
          {encounter.description && (
            <p className="mt-1 text-sm text-muted-foreground">{encounter.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{encounterStatusLabel(encounter.status)}</Badge>
            {encounter.location && <Badge>{encounter.location}</Badge>}
            {encounter.roomNumber && <Badge>Room {encounter.roomNumber}</Badge>}
            <Badge>{encounter.combatantCount} combatants</Badge>
            <Badge>{encounter.enemyCount} enemies</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" icon={Play} size="sm" onClick={() => onStart(encounter, false)}>
            Run
          </Button>
          <Button
            type="button"
            icon={FlaskConical}
            size="sm"
            variant="secondary"
            onClick={() => onStart(encounter, true)}
          >
            Test
          </Button>
          <Link to={`/campaigns/${campaignID}/encounters/${encounter.id}/edit`}>
            <Button type="button" icon={Pencil} size="sm" variant="secondary">
              Edit
            </Button>
          </Link>
          <Button
            type="button"
            icon={Copy}
            size="sm"
            variant="secondary"
            onClick={() => onClone(encounter)}
          >
            Clone
          </Button>
          <Button
            type="button"
            icon={Trash2}
            size="sm"
            variant="danger"
            onClick={() => onRemove(encounter)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
