import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { ActionRow } from "../../../components/layout";
import { Button, ConfirmDialog, EmptyMini } from "../../../components/ui";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation } from "./travelTypes";

export function MissingLocationFallback({ campaignId }: { campaignId: string }) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-4">
      <p className="text-sm font-semibold">That world location could not be found.</p>
      <p className="text-sm text-muted-foreground">
        It may have been deleted or moved. Return to the World explorer to choose another location.
      </p>
      <ActionRow>
        <Link to={`/campaigns/${campaignId}/world`}>
          <Button type="button" variant="secondary">
            Back to World
          </Button>
        </Link>
      </ActionRow>
    </div>
  );
}

export function DeleteLocationConfirm({
  locationName,
  open,
  onCancel,
  onConfirm,
}: {
  locationName?: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Delete world location?"
      confirmLabel="Delete location"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      This removes {locationName} from the world tree. Linked records may be detached by the backend
      depending on their relationship type.
    </ConfirmDialog>
  );
}

export function FilterHiddenNotice({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-100">
      <span>The selected location is hidden by the active filters.</span>
      <Button type="button" size="sm" variant="secondary" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

export function EmptyWorldLocations({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid gap-3">
      <EmptyMini copy="No world locations yet. Add a region, town, shop, home, dungeon, or room to start building the campaign map." />
      <ActionRow justify="end">
        <Button type="button" icon={MapPin} size="sm" onClick={onCreate}>
          Add World Location
        </Button>
      </ActionRow>
    </div>
  );
}

export function locationMapMarker(location: CampaignLocation) {
  const marker = location.mapAnchor?.marker;
  if (typeof marker === "string") return marker;
  if (typeof marker === "number") return String(marker);
  return "";
}

export function compareLocations(a: CampaignLocation, b: CampaignLocation) {
  const aPath = locationPathLabel(a);
  const bPath = locationPathLabel(b);
  if (aPath !== bPath) return aPath.localeCompare(bPath);
  if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  return a.name.localeCompare(b.name);
}

export function descendantLocationIDs(locations: CampaignLocation[], parentID: string) {
  const childrenByParent = new Map<string, CampaignLocation[]>();
  for (const location of locations) {
    if (!location.parentLocationId) continue;
    const children = childrenByParent.get(location.parentLocationId) ?? [];
    children.push(location);
    childrenByParent.set(location.parentLocationId, children);
  }
  const ids: string[] = [];
  const queue = [...(childrenByParent.get(parentID) ?? [])];
  while (queue.length) {
    const child = queue.shift()!;
    ids.push(child.id);
    queue.push(...(childrenByParent.get(child.id) ?? []));
  }
  return ids;
}
