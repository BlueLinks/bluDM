import { CheckCircle2, Crosshair, Grid2X2, X } from "lucide-react";
import { Button, EmptyMini } from "../../../components/ui";
import type { PlacementMode } from "./CampaignWorldMaps";
import type { CampaignLocation, CampaignMapPin } from "./travelTypes";

export function PinPlacementList({
  candidates,
  placementMode,
  pins,
  onStartPlacement,
}: {
  candidates: CampaignLocation[];
  placementMode: PlacementMode;
  pins: CampaignMapPin[];
  onStartPlacement: (mode: PlacementMode) => void;
}) {
  if (!candidates.length)
    return <EmptyMini copy="No relevant locations available for this map level." />;
  const pinByLocationId = new globalThis.Map(pins.map((pin) => [pin.locationId, pin]));
  const unplaced = candidates.filter((location) => !pinByLocationId.has(location.id));
  const placedCount = candidates.length - unplaced.length;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="h-4 w-4 text-accent" /> Place pins
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a missing place, then click the map where it belongs.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
          {placedCount}/{candidates.length} placed
        </span>
      </div>
      {unplaced.length ? (
        <PlacementGroup
          locations={unplaced}
          placementMode={placementMode}
          onStartPlacement={onStartPlacement}
        />
      ) : (
        <p className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" /> All relevant places are pinned. Click pins on the map
          to manage them.
        </p>
      )}
    </div>
  );
}

function PlacementGroup({
  locations,
  placementMode,
  onStartPlacement,
}: {
  locations: CampaignLocation[];
  placementMode: PlacementMode;
  onStartPlacement: (mode: PlacementMode) => void;
}) {
  if (!locations.length) return null;
  return (
    <div className="grid gap-2">
      {locations.map((location) => {
        const active = placementMode?.locationID === location.id;
        return (
          <div
            key={location.id}
            className={[
              "flex flex-wrap items-center justify-between gap-2 rounded-md border p-2",
              active ? "border-primary bg-primary/5" : "border-border bg-background",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{location.name}</p>
              <p className="text-xs text-muted-foreground">Not placed on this map</p>
            </div>
            <Button
              type="button"
              className="w-full justify-start text-left sm:w-auto"
              size="sm"
              icon={active ? X : Grid2X2}
              variant={active ? "primary" : "secondary"}
              aria-pressed={active}
              aria-label={`${active ? "Cancel placement for" : "Place pin for"} ${location.name}`}
              onClick={() =>
                onStartPlacement(active ? null : { locationID: location.id, action: "place" })
              }
            >
              {active ? "Cancel" : "Place"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
