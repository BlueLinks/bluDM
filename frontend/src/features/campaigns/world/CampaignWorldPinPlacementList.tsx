import { Crosshair, Grid2X2, MapPin, X } from "lucide-react";
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
  const placed = candidates.filter((location) => pinByLocationId.has(location.id));
  const placedCount = placed.length;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crosshair className="h-4 w-4 text-accent" /> Place pins
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Unplaced locations stay first. Select one, then click the map to set coordinates.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
          {placedCount}/{candidates.length} placed
        </span>
      </div>
      <PlacementGroup
        label="Needs placement"
        locations={unplaced}
        pinByLocationId={pinByLocationId}
        placementMode={placementMode}
        onStartPlacement={onStartPlacement}
      />
      <PlacementGroup
        label="Already placed"
        locations={placed}
        pinByLocationId={pinByLocationId}
        placementMode={placementMode}
        onStartPlacement={onStartPlacement}
      />
    </div>
  );
}

function PlacementGroup({
  label,
  locations,
  pinByLocationId,
  placementMode,
  onStartPlacement,
}: {
  label: string;
  locations: CampaignLocation[];
  pinByLocationId: Map<string, CampaignMapPin>;
  placementMode: PlacementMode;
  onStartPlacement: (mode: PlacementMode) => void;
}) {
  if (!locations.length) return null;
  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {locations.map((location) => {
        const pin = pinByLocationId.get(location.id);
        const pinned = Boolean(pin);
        const active = placementMode?.locationID === location.id;
        const action = pinned ? "move" : "place";
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
              <p className="text-xs text-muted-foreground">
                {pinned
                  ? `Placed at ${Math.round(pin?.x ?? 0)}, ${Math.round(pin?.y ?? 0)}`
                  : "Unplaced on this map"}
              </p>
            </div>
            <Button
              type="button"
              className="w-full justify-start text-left sm:w-auto"
              size="sm"
              icon={active ? X : pinned ? MapPin : Grid2X2}
              variant={active ? "primary" : "secondary"}
              aria-pressed={active}
              aria-label={`${active ? "Cancel placement for" : pinned ? "Move pin for" : "Place pin for"} ${location.name}`}
              onClick={() => onStartPlacement(active ? null : { locationID: location.id, action })}
            >
              {active ? "Cancel" : pinned ? "Move" : "Place"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
