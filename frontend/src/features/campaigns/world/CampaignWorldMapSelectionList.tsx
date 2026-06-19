import type { CampaignLocation, CampaignMap } from "./travelTypes";

export function CampaignWorldMapSelectionList({
  activeMap,
  availableMaps,
  currentLocation,
  pinsCount,
  onMapChange,
}: {
  activeMap: CampaignMap;
  availableMaps: CampaignMap[];
  currentLocation: CampaignLocation;
  pinsCount: number;
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
          {pinsCount} {pinsCount === 1 ? "pin" : "pins"} on selected map
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {availableMaps.map((map) => {
          const selected = map.id === activeMap.id;
          return (
            <button
              key={map.id}
              type="button"
              className={[
                "grid min-w-0 gap-1 rounded-md border p-3 text-left transition hover:bg-muted",
                selected ? "border-primary bg-primary/5" : "border-border bg-card",
              ].join(" ")}
              onClick={() => onMapChange(map.id)}
            >
              <span className="truncate text-sm font-semibold">{map.name}</span>
              <span className="text-xs text-muted-foreground">
                {map.parentLocationId === currentLocation.id ? "Attached here" : "Campaign context"}{" "}
                · {map.imageUrl ? "Image map" : "Blank grid"}
              </span>
              {selected ? (
                <span className="text-xs font-semibold text-primary">Selected</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
