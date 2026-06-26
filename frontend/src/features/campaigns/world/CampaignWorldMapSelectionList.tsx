import { candidateLocationsForMap, type MapPinSummary } from "./campaignWorldMapUtils";
import type { CampaignLocation, CampaignMap } from "./travelTypes";

export function CampaignWorldMapSelectionList({
  activeMap,
  availableMaps,
  currentLocation,
  locations,
  pinSummaries,
  onMapChange,
}: {
  activeMap: CampaignMap;
  availableMaps: CampaignMap[];
  currentLocation: CampaignLocation;
  locations: CampaignLocation[];
  pinSummaries: Record<string, MapPinSummary>;
  onMapChange: (mapID: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Maps for this workspace</p>
          <p className="text-xs text-muted-foreground">
            Pick a map, then place child locations or open a pinned location from the map.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
          {availableMaps.length} {availableMaps.length === 1 ? "map" : "maps"} available
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {availableMaps.map((map) => {
          const selected = map.id === activeMap.id;
          const candidates = candidateLocationsForMap(map, locations);
          const summary = pinSummaries[map.id];
          const placedCount = summary
            ? summary.placedLocationIds.filter((id) =>
                candidates.some((location) => location.id === id),
              ).length
            : 0;
          return (
            <button
              key={map.id}
              type="button"
              className={[
                "grid min-w-0 gap-2 rounded-md border p-3 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30",
                selected ? "border-primary bg-primary/5" : "border-border bg-card",
              ].join(" ")}
              aria-current={selected ? "true" : undefined}
              aria-label={`${selected ? "Selected map" : "Select map"}: ${map.name}. ${mapScopeLabel(map, currentLocation)}. ${summaryLabel(summary, placedCount, candidates.length)}.`}
              onClick={() => onMapChange(map.id)}
            >
              <span className="truncate text-sm font-semibold">{map.name}</span>
              <span className="text-xs text-muted-foreground">
                {mapScopeLabel(map, currentLocation)} · {map.imageUrl ? "Image map" : "Blank grid"}
              </span>
              <span className="flex flex-wrap gap-1 text-xs font-semibold">
                <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                  {summaryLabel(summary, placedCount, candidates.length)}
                </span>
                {selected ? (
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">Selected</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function mapScopeLabel(map: CampaignMap, currentLocation: CampaignLocation) {
  if (map.parentLocationId === currentLocation.id) return "Attached here";
  if (map.parentLocationId) return "Context map";
  return "Campaign-level map";
}

function summaryLabel(
  summary: MapPinSummary | undefined,
  placedCount: number,
  candidateCount: number,
) {
  if (!summary) return "Checking placed locations";
  if (!candidateCount) return `${summary.totalPins} ${summary.totalPins === 1 ? "pin" : "pins"}`;
  return `${placedCount}/${candidateCount} placed · ${summary.totalPins} ${summary.totalPins === 1 ? "pin" : "pins"}`;
}
