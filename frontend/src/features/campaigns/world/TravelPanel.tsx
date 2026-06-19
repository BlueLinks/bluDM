import { CalendarClock, Copy, Pencil, Route, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Callout, ConfirmDialog, EmptyMini, SectionPanel } from "../../../components/ui";
import { api } from "../../../lib/api";
import { labelFor, distanceUnitOptions, paceOptions, terrainOptions } from "./travelOptions";
import type { CampaignJourney } from "./travelTypes";

export function TravelPanel({
  campaignId,
  journeys,
  onEditJourney,
  onChanged,
}: {
  campaignId: string;
  journeys: CampaignJourney[];
  onEditJourney: (journey: CampaignJourney) => void;
  onChanged: () => Promise<void>;
}) {
  const [deleteJourney, setDeleteJourney] = useState<CampaignJourney | null>(null);
  const [error, setError] = useState("");

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
    <SectionPanel title="Travel" icon={Route} className="h-full">
      {error && <Callout tone="danger">{error}</Callout>}
      <EmptyMini copy="World locations now live in the dedicated World workspace. The travel calculator and journey log stay here for route planning, revisit notes, and weather prep." />
      <div className="mt-5 grid gap-3" id="campaign-travel">
        <div>
          <h4 className="font-semibold">Journey log</h4>
          <p className="text-sm text-muted-foreground">
            Saved calculator inputs for routes you may revisit.
          </p>
        </div>
        {journeys.length === 0 ? (
          <EmptyMini copy="No saved journeys yet. Open the Travel calculator and save a route or direct distance." />
        ) : (
          <div className="grid gap-2 xl:grid-cols-2 2xl:grid-cols-3">
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
