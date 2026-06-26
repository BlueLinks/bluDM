import { CalendarClock, Copy, MapPin, Pencil, Route, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Callout, ConfirmDialog, EmptyMini, SectionPanel } from "../../../components/ui";
import { api } from "../../../lib/api";
import { labelFor, distanceUnitOptions, paceOptions, terrainOptions } from "./travelOptions";
import { locationPathLabel } from "./campaignWorldLocationUtils";
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
  const [deleteJourney, setDeleteJourney] = useState<CampaignJourney | null>(null);
  const [error, setError] = useState("");
  const locationByLabel = useMemo(() => locationLookup(locations), [locations]);
  const linkedJourneyCount = journeys.filter((journey) =>
    journeyTouchesWorldLocation(journey, locationByLabel),
  ).length;
  const directDistanceCount = journeys.filter(
    (journey) => journey.routeInputMode === "distance",
  ).length;

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
      <EmptyMini copy="Use saved journeys for routes the party may travel again, weather assumptions, and quick revisits during prep." />
      <TravelContextSummary
        directDistanceCount={directDistanceCount}
        linkedJourneyCount={linkedJourneyCount}
        totalJourneys={journeys.length}
      />
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
                locationByLabel={locationByLabel}
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

function TravelContextSummary({
  directDistanceCount,
  linkedJourneyCount,
  totalJourneys,
}: {
  directDistanceCount: number;
  linkedJourneyCount: number;
  totalJourneys: number;
}) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-3">
      <TravelStat label="Use world places" value={linkedJourneyCount} />
      <TravelStat label="Point-to-point" value={directDistanceCount} />
      <TravelStat label="Saved journeys" value={totalJourneys} />
    </div>
  );
}

function TravelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function JourneyCard({
  journey,
  locationByLabel,
  onDelete,
  onDuplicate,
  onEdit,
}: {
  journey: CampaignJourney;
  locationByLabel: Map<string, CampaignLocation>;
  onDelete: (journey: CampaignJourney) => void;
  onDuplicate: (journey: CampaignJourney) => void;
  onEdit: (journey: CampaignJourney) => void;
}) {
  const originLocation = locationForJourneyEndpoint(journey.origin, locationByLabel);
  const destinationLocation = locationForJourneyEndpoint(journey.destination, locationByLabel);
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
          <JourneyContextBadges
            destinationLocation={destinationLocation}
            journey={journey}
            originLocation={originLocation}
          />
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

function JourneyContextBadges({
  destinationLocation,
  journey,
  originLocation,
}: {
  destinationLocation?: CampaignLocation;
  journey: CampaignJourney;
  originLocation?: CampaignLocation;
}) {
  const badges = [
    originLocation ? `Origin: ${originLocation.name}` : "",
    destinationLocation ? `Destination: ${destinationLocation.name}` : "",
    journey.routeInputMode === "distance" ? "Direct distance" : "",
  ].filter(Boolean);
  if (!badges.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"
          key={badge}
        >
          <MapPin className="h-3 w-3" />
          {badge}
        </span>
      ))}
    </div>
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

function journeyTouchesWorldLocation(
  journey: CampaignJourney,
  locationByLabel: Map<string, CampaignLocation>,
) {
  return Boolean(
    locationForJourneyEndpoint(journey.origin, locationByLabel) ||
    locationForJourneyEndpoint(journey.destination, locationByLabel),
  );
}

function locationForJourneyEndpoint(
  endpoint: string,
  locationByLabel: Map<string, CampaignLocation>,
) {
  return locationByLabel.get(endpoint.trim().toLowerCase());
}

function locationLookup(locations: CampaignLocation[]) {
  const lookup = new Map<string, CampaignLocation>();
  locations.forEach((location) => {
    [location.name, locationPathLabel(location)].filter(Boolean).forEach((label) => {
      lookup.set(label.toLowerCase(), location);
    });
  });
  return lookup;
}
