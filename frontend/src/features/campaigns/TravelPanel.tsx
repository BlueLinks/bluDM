import { MapPin, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  Field,
  Input,
  SectionPanel,
  Textarea,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { CampaignLocation } from "./travelTypes";

export function TravelPanel({
  campaignId,
  locations,
  onChanged,
}: {
  campaignId: string;
  locations: CampaignLocation[];
  onChanged: () => Promise<void>;
}) {
  const [editingLocation, setEditingLocation] = useState<CampaignLocation | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<CampaignLocation | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function startEdit(location: CampaignLocation) {
    setEditingLocation(location);
    setName(location.name);
    setNotes(location.notes);
  }

  function resetForm() {
    setEditingLocation(null);
    setName("");
    setNotes("");
  }

  async function saveLocation() {
    setError("");
    try {
      if (editingLocation) {
        await api.updateCampaignLocation(campaignId, editingLocation.id, { name, notes });
      } else {
        await api.createCampaignLocation(campaignId, { name, notes });
      }
      resetForm();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save location");
    }
  }

  async function confirmDelete() {
    if (!deleteLocation) return;
    setError("");
    try {
      await api.deleteCampaignLocation(campaignId, deleteLocation.id);
      setDeleteLocation(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete location");
    }
  }

  return (
    <SectionPanel title="Travel" icon={Route}>
      {error && <Callout tone="danger">{error}</Callout>}
      <LocationForm
        editing={Boolean(editingLocation)}
        name={name}
        notes={notes}
        onCancel={resetForm}
        onNameChange={setName}
        onNotesChange={setNotes}
        onSave={() => void saveLocation()}
      />
      {locations.length === 0 ? (
        <EmptyMini copy="No saved locations yet. Add places the party travels between, then reference them in the calculator." />
      ) : (
        <div className="grid gap-2">
          {locations.map((location) => (
            <article
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-background p-3"
              key={location.id}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-accent" />
                  {location.name}
                </div>
                {location.notes && (
                  <p className="mt-1 text-sm text-muted-foreground">{location.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  icon={Pencil}
                  size="sm"
                  variant="secondary"
                  onClick={() => startEdit(location)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  icon={Trash2}
                  size="sm"
                  variant="danger"
                  onClick={() => setDeleteLocation(location)}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteLocation)}
        title="Delete location?"
        confirmLabel="Delete location"
        onCancel={() => setDeleteLocation(null)}
        onConfirm={() => void confirmDelete()}
      >
        This removes {deleteLocation?.name} from the campaign location list.
      </ConfirmDialog>
    </SectionPanel>
  );
}

function LocationForm({
  editing,
  name,
  notes,
  onCancel,
  onNameChange,
  onNotesChange,
  onSave,
}: {
  editing: boolean;
  name: string;
  notes: string;
  onCancel: () => void;
  onNameChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="mb-4 grid gap-3 rounded-md border border-border bg-background p-3">
      <Field label={editing ? "Edit location" : "New location"}>
        <Input
          value={name}
          placeholder="Ironford"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          rows={2}
          value={notes}
          placeholder="Optional campaign-facing detail"
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {editing && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" icon={Plus} disabled={!name.trim()} onClick={onSave}>
          {editing ? "Save location" : "Add location"}
        </Button>
      </div>
    </div>
  );
}
