import { CalendarClock, Copy, MapPin, Pencil, Plus, Route, Trash2 } from "lucide-react";
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
import { labelFor, distanceUnitOptions, paceOptions, terrainOptions } from "./travelOptions";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";

export function TravelPanel({
  campaignId,
  journeys,
  locations,
  onEditJourney,
  onChanged,
}: {
  campaignId: string;
  journeys: CampaignJourney[];
  locations: CampaignLocation[];
  onEditJourney: (journey: CampaignJourney) => void;
  onChanged: () => Promise<void>;
}) {
  const [editingLocation, setEditingLocation] = useState<CampaignLocation | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<CampaignLocation | null>(null);
  const [deleteJourney, setDeleteJourney] = useState<CampaignJourney | null>(null);
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

  async function duplicateJourney(journey: CampaignJourney) {
    setError("");
    try {
      await api.cloneCampaignJourney(campaignId, journey.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate journey");
    }
  }

  async function confirmDeleteJourney() {
    if (!deleteJourney) return;
    setError("");
    try {
      await api.deleteCampaignJourney(campaignId, deleteJourney.id);
      setDeleteJourney(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete journey");
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
      <div className="mt-5 grid gap-3">
        <div>
          <h4 className="font-semibold">Journey log</h4>
          <p className="text-sm text-muted-foreground">
            Saved calculator inputs for routes you may revisit.
          </p>
        </div>
        {journeys.length === 0 ? (
          <EmptyMini copy="No saved journeys yet. Open the Travel calculator and save a route or direct distance." />
        ) : (
          <div className="grid gap-2">
            {journeys.map((journey) => (
              <JourneyCard
                journey={journey}
                key={journey.id}
                onDelete={setDeleteJourney}
                onDuplicate={(item) => void duplicateJourney(item)}
                onEdit={onEditJourney}
              />
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(deleteJourney)}
        title="Delete journey?"
        confirmLabel="Delete journey"
        onCancel={() => setDeleteJourney(null)}
        onConfirm={() => void confirmDeleteJourney()}
      >
        This removes {deleteJourney?.name} from the campaign journey log.
      </ConfirmDialog>
    </SectionPanel>
  );
}

function JourneyCard({
  journey,
  onDelete,
  onDuplicate,
  onEdit,
}: {
  journey: CampaignJourney;
  onDelete: (journey: CampaignJourney) => void;
  onDuplicate: (journey: CampaignJourney) => void;
  onEdit: (journey: CampaignJourney) => void;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold">
            <Route className="h-4 w-4 text-accent" />
            {journey.name}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{journeyRouteLabel(journey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {labelFor(terrainOptions, journey.terrain)} terrain,{" "}
            {labelFor(paceOptions, journey.pace)} pace
            {journey.goodRoads ? ", good roads" : ""}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Saved {new Date(journey.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            icon={Pencil}
            size="sm"
            variant="secondary"
            onClick={() => onEdit(journey)}
          >
            Edit
          </Button>
          <Button
            type="button"
            icon={Copy}
            size="sm"
            variant="secondary"
            onClick={() => onDuplicate(journey)}
          >
            Duplicate
          </Button>
          <Button
            type="button"
            icon={Trash2}
            size="sm"
            variant="danger"
            onClick={() => onDelete(journey)}
          >
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function journeyRouteLabel(journey: CampaignJourney) {
  const distance = `${journey.distance.toLocaleString()} ${labelFor(
    distanceUnitOptions,
    journey.distanceUnit,
  )}`;
  if (journey.routeInputMode === "route" && journey.origin && journey.destination) {
    return `${journey.origin} to ${journey.destination} · ${distance}`;
  }
  return distance;
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
