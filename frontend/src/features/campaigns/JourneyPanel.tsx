import { Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  SectionPanel,
} from "../../components/ui";
import { api } from "../../lib/api";
import { JourneyModal } from "./JourneyModal";
import {
  distanceUnitOptions,
  labelFor,
  paceOptions,
  routeConditionOptions,
  terrainOptions,
} from "./journeyOptions";
import type { Journey } from "./journeyTypes";

export function JourneyPanel({
  campaignId,
  journeys,
  onChanged,
}: {
  campaignId: string;
  journeys: Journey[];
  onChanged: () => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [deleteJourney, setDeleteJourney] = useState<Journey | null>(null);
  const [error, setError] = useState("");

  function addJourney() {
    setEditingJourney(null);
    setModalOpen(true);
  }

  function editJourney(journey: Journey) {
    setEditingJourney(journey);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteJourney) return;
    setError("");
    try {
      await api.deleteJourney(campaignId, deleteJourney.id);
      setDeleteJourney(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete journey");
    }
  }

  return (
    <SectionPanel
      title="Journeys"
      icon={Route}
      action={
        <Button type="button" icon={Plus} size="sm" onClick={addJourney}>
          Add journey
        </Button>
      }
    >
      {error && <Callout tone="danger">{error}</Callout>}
      {journeys.length === 0 ? (
        <EmptyMini copy="No journeys yet. Add a route to calculate travel time, generate weather, and save DM notes." />
      ) : (
        <div className="grid gap-3">
          {journeys.map((journey) => (
            <JourneyCard
              key={journey.id}
              journey={journey}
              onEdit={() => editJourney(journey)}
              onDelete={() => setDeleteJourney(journey)}
            />
          ))}
        </div>
      )}
      <JourneyModal
        campaignId={campaignId}
        journey={editingJourney}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={async () => {
          setModalOpen(false);
          await onChanged();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteJourney)}
        title="Delete journey?"
        confirmLabel="Delete journey"
        onCancel={() => setDeleteJourney(null)}
        onConfirm={() => void confirmDelete()}
      >
        This removes {deleteJourney?.name} from this campaign. Encounters, notes, and map plans are
        not affected.
      </ConfirmDialog>
    </SectionPanel>
  );
}

function JourneyCard({
  journey,
  onEdit,
  onDelete,
}: {
  journey: Journey;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{journey.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {journeyRouteLabel(journey)} · {formatDistance(journey)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" icon={Pencil} size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" icon={Trash2} size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="friendly">{journey.durationLabel}</Badge>
        <Badge>{labelFor(terrainOptions, journey.terrain)}</Badge>
        <Badge>{labelFor(paceOptions, journey.pace)} pace</Badge>
        <Badge>{labelFor(routeConditionOptions, journey.routeCondition)}</Badge>
        {journey.weather.title && <Badge>{journey.weather.title}</Badge>}
      </div>
      {journey.notes && <p className="mt-3 text-sm text-muted-foreground">{journey.notes}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Updated {new Date(journey.updatedAt).toLocaleDateString()}
      </p>
    </article>
  );
}

function journeyRouteLabel(journey: Journey) {
  if (journey.origin && journey.destination) return `${journey.origin} -> ${journey.destination}`;
  return journey.origin || journey.destination || "Unspecified route";
}

function formatDistance(journey: Journey) {
  const value = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    journey.distance,
  );
  const unit = labelFor(distanceUnitOptions, journey.distanceUnit).toLowerCase();
  return `${value} ${unit}`;
}
