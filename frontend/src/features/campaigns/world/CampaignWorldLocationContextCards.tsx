import { MapPin } from "lucide-react";
import { CardSection, SectionHeader } from "../../../components/layout";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation } from "./travelTypes";

export function ParentContextCard({
  parent,
  onSelectLocation,
}: {
  parent?: CampaignLocation;
  onSelectLocation: (locationID: string) => void;
}) {
  return (
    <CardSection>
      <SectionHeader
        icon={MapPin}
        title="Parent context"
        meta={parent ? "In hierarchy" : "No parent"}
      />
      {parent ? (
        <button
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/60"
          type="button"
          onClick={() => onSelectLocation(parent.id)}
        >
          <span className="font-semibold text-accent">{locationPathLabel(parent)}</span>
          {parent.summary ? (
            <span className="mt-1 block text-xs text-muted-foreground">{parent.summary}</span>
          ) : null}
        </button>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          This location is at the top level of the world tree.
        </p>
      )}
    </CardSection>
  );
}

export function parentFor(location: CampaignLocation, locations: CampaignLocation[]) {
  if (location.parentLocationId)
    return locations.find((candidate) => candidate.id === location.parentLocationId);
  const previousSegment =
    location.path && location.path.length > 1 ? location.path[location.path.length - 2] : undefined;
  return previousSegment
    ? locations.find((candidate) => candidate.id === previousSegment.id)
    : undefined;
}
