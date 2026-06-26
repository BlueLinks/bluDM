import { FilePenLine, Trash2 } from "lucide-react";
import type React from "react";
import { ActionRow, CardSection } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { LocationIcon } from "./CampaignWorldLocationIcon";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { LocationProfileInfo } from "./locationProfiles";
import type { CampaignLocation } from "./travelTypes";

type LocationProfileHeaderProps = {
  childCount: number;
  location: CampaignLocation;
  parentLocation?: CampaignLocation;
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
  onDeleteLocation: () => void;
  onEdit: () => void;
  onGenerateEncounter: () => void;
  onLinkExit: () => void;
  onOpenMaps: () => void;
  onSelectLocation: (locationID: string) => void;
  onStockOpen: () => void;
};

export function LocationProfileHeader({
  childCount,
  location,
  parentLocation,
  profile,
  onDeleteLocation,
  onEdit,
  onSelectLocation,
}: LocationProfileHeaderProps) {
  return (
    <CardSection className="p-4" tone="background">
      <ActionRow align="start" gap="md" justify="between">
        <div className="min-w-0">
          <LocationPath location={location} onSelectLocation={onSelectLocation} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProfileBadge label={profile.label} />
            {(location.tags ?? []).slice(0, 3).map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
          <h4 className="mt-3 flex min-w-0 items-center gap-3 text-2xl font-semibold leading-tight">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <LocationIcon className="h-6 w-6 text-accent" locationType={location.locationType} />
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{location.name}</span>
          </h4>
          {location.summary ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
              {location.summary}
            </p>
          ) : null}
          {parentLocation ? (
            <button
              className="mt-2 text-left text-sm text-muted-foreground transition hover:text-accent hover:underline"
              type="button"
              onClick={() => onSelectLocation(parentLocation.id)}
            >
              Within {locationPathLabel(parentLocation)}
            </button>
          ) : null}
          <LocationChips childCount={childCount} location={location} />
        </div>
        <ActionRow className="w-full sm:w-auto sm:justify-end" justify="start">
          <Button type="button" icon={FilePenLine} size="sm" variant="secondary" onClick={onEdit}>
            Edit profile
          </Button>
          <Button type="button" icon={Trash2} size="sm" variant="danger" onClick={onDeleteLocation}>
            Delete
          </Button>
        </ActionRow>
      </ActionRow>
    </CardSection>
  );
}

function LocationPath({
  location,
  onSelectLocation,
}: {
  location: CampaignLocation;
  onSelectLocation: (locationID: string) => void;
}) {
  if (!location.path?.length)
    return <p className="text-xs font-bold uppercase text-accent">{location.name}</p>;
  return (
    <nav aria-label="Location path" className="flex flex-wrap gap-x-1 text-xs font-bold uppercase">
      {location.path.map((segment, index) => {
        const current = index === location.path!.length - 1;
        return (
          <span
            className="flex flex-wrap items-center gap-x-1"
            key={segment.id || `${segment.name}-${index}`}
          >
            {current ? (
              <span className="text-accent">{segment.name}</span>
            ) : (
              <button
                className="text-accent transition hover:text-accent/80 hover:underline"
                type="button"
                onClick={() => onSelectLocation(segment.id)}
              >
                {segment.name}
              </button>
            )}
            {!current ? <span className="text-muted-foreground">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

function ProfileBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-bold uppercase text-emerald-700 dark:text-emerald-200">
      {label}
    </span>
  );
}

function LocationChips({
  childCount,
  location,
}: {
  childCount: number;
  location: CampaignLocation;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {childCount ? <Chip>{childCount} connected places</Chip> : null}
      {Object.keys(location.mapAnchor ?? {}).length ? <Chip tone="map">Pinned on map</Chip> : null}
    </div>
  );
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "map";
}) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase",
        tone === "map"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : "border-border bg-muted text-muted-foreground",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
