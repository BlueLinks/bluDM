import { ChildPrepChips, type ChildPrepChip } from "./CampaignWorldChildPrepChips";
import { LocationIcon } from "./CampaignWorldLocationIcon";
import type { CampaignLocation } from "./travelTypes";

export function ChildLocationTile({
  child,
  prepChips,
  onSelectLocation,
}: {
  child: CampaignLocation;
  prepChips?: ChildPrepChip[];
  onSelectLocation: (locationID: string) => void;
}) {
  const summary = childLocationSummary(child);
  return (
    <button
      className="group flex min-w-0 items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left transition hover:border-primary/60 hover:bg-card"
      type="button"
      onClick={() => onSelectLocation(child.id)}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-card text-accent">
        <LocationIcon className="h-4 w-4" locationType={child.locationType} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-semibold [overflow-wrap:anywhere]">{child.name}</span>
          <span className="text-[0.68rem] font-semibold text-muted-foreground">
            {child.customTypeLabel || child.locationType || "custom"}
          </span>
        </span>
        {summary ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
            {summary}
          </span>
        ) : null}
        <ChildPrepChips chips={prepChips} />
      </span>
    </button>
  );
}

export function groupLocationsByType(locations: CampaignLocation[]) {
  const groups = new Map<string, CampaignLocation[]>();
  for (const location of locations) {
    const key = groupLabelForLocation(location);
    groups.set(key, [...(groups.get(key) ?? []), location]);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

function groupLabelForLocation(location: CampaignLocation) {
  const type = (location.locationType || "custom").toLowerCase();
  if (["shop", "market", "tavern", "inn"].includes(type)) return "Shops and businesses";
  if (["dungeon", "floor", "room", "cave"].includes(type)) return "Dungeon spaces";
  if (["settlement", "town", "city", "village"].includes(type)) return "Settlements";
  if (["landmark", "portal", "wilderness"].includes(type)) return "Points of interest";
  return "Other places";
}

function childLocationSummary(location: CampaignLocation) {
  if (location.summary && !isGeneratedCellSummary(location.summary)) return location.summary;
  const path = location.path
    ?.map((segment) => segment.name)
    .filter((name) => name && name !== location.name)
    .join(" / ");
  return path || "";
}

function isGeneratedCellSummary(summary: string) {
  return /^\d+\s+mapped Dungeon Studio cells?\.$/i.test(summary.trim());
}
