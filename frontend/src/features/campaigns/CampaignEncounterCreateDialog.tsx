import { Plus } from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Button, Field, FloatingInput, Modal, Select, Textarea } from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";

export function CampaignEncounterCreateDialog({
  description,
  location,
  locationID,
  locations,
  name,
  open,
  roomNumber,
  status,
  trigger,
  onCreate,
  onDescriptionChange,
  onLocationChange,
  onLocationIDChange,
  onNameChange,
  onOpenChange,
  onRoomNumberChange,
  onStatusChange,
}: {
  description: string;
  location: string;
  locationID: string;
  locations: CampaignLocation[];
  name: string;
  open: boolean;
  roomNumber: string;
  status: string;
  trigger?: ReactNode;
  onCreate: (event: FormEvent) => void;
  onDescriptionChange: (description: string) => void;
  onLocationChange: (location: string) => void;
  onLocationIDChange: (locationID: string) => void;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onRoomNumberChange: (roomNumber: string) => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add encounter" trigger={trigger}>
      <form className="grid gap-4" onSubmit={onCreate}>
        <FloatingInput label="Encounter name" value={name} onChange={onNameChange} required />
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Status">
            <Select
              value={status}
              placeholder="Status"
              options={encounterStatusOptions}
              onValueChange={onStatusChange}
            />
          </Field>
          <Field label="World location">
            <select
              className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
              value={locationID}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const nextID = event.target.value;
                onLocationIDChange(nextID);
                const selected = locations.find(
                  (candidate: CampaignLocation) => candidate.id === nextID,
                );
                if (selected) onLocationChange(locationPathLabel(selected));
              }}
            >
              <option value="">No structured location</option>
              {locations.map((option: CampaignLocation) => (
                <option key={option.id} value={option.id}>
                  {locationPathLabel(option)}
                </option>
              ))}
            </select>
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
  );
}
