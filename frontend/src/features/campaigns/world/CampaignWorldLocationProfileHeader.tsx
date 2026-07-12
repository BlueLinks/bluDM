import { FilePenLine, Map as MapIcon, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { ActionRow, CardSection } from "../../../components/layout";
import { StatChip } from "../../../components/shared/displayPrimitives";
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
  onOpenMaps: () => void;
  onSelectLocation: (locationID: string) => void;
};

export function LocationProfileHeader({
  childCount,
  location,
  parentLocation,
  profile,
  onAddChild,
  onDeleteLocation,
  onEdit,
  onOpenMaps,
  onSelectLocation,
}: LocationProfileHeaderProps) {
  const primaryAction = primaryHeaderAction({
    profile,
    onAddChild,
    onOpenMaps,
  });
  const visibleTags = locationTags(location, profile);
  const compactHero =
    profile.profile === "shop" ||
    profile.profile === "room" ||
    profile.variant === "dungeon" ||
    profile.variant === "floor";
  return (
    <CardSection className="campaign-world-profile-hero depth-hero overflow-hidden p-0">
      <div
        className={[
          "campaign-world-profile-hero__body relative grid min-w-0 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
          compactHero ? "campaign-world-profile-hero__body--compact" : "",
        ].join(" ")}
        data-compact={compactHero ? "true" : "false"}
        data-profile={profile.profile}
        data-variant={profile.variant ?? "default"}
      >
        <div className="min-w-0">
          <LocationPath location={location} onSelectLocation={onSelectLocation} />
          <div className="mt-2 flex min-w-0 items-start gap-3">
            <span className="campaign-world-profile-hero__icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <LocationIcon className="h-5 w-5 text-accent" locationType={location.locationType} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ProfileBadge label={location.customTypeLabel || profile.label} />
                {location.customTypeLabel ? <Chip>{profile.label}</Chip> : null}
                {visibleTags.slice(0, 3).map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
              <h4 className="mt-1 min-w-0 text-3xl font-semibold leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]">
                {location.name}
              </h4>
              {location.summary ? (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                  {location.summary}
                </p>
              ) : null}
              {parentLocation && !compactHero ? (
                <button
                  className="mt-1 text-left text-sm text-muted-foreground transition hover:text-accent hover:underline"
                  type="button"
                  onClick={() => onSelectLocation(parentLocation.id)}
                >
                  Within {locationPathLabel(parentLocation)}
                </button>
              ) : null}
            </div>
          </div>
          <LocationChips childCount={childCount} compact={compactHero} />
        </div>
        <ActionRow className="w-full md:w-auto md:justify-end" justify="start">
          {primaryAction}
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden">
              <MoreHorizontal className="h-4 w-4" />
              More
            </summary>
            <div className="absolute right-0 z-20 mt-1 grid min-w-36 gap-1 rounded-md border border-border bg-card p-1 shadow-md">
              <button
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                type="button"
                onClick={onEdit}
              >
                <FilePenLine className="h-4 w-4" />
                Edit location
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                type="button"
                onClick={onDeleteLocation}
              >
                <Trash2 className="h-4 w-4" />
                Delete location
              </button>
            </div>
          </details>
        </ActionRow>
      </div>
    </CardSection>
  );
}

function primaryHeaderAction({
  profile,
  onAddChild,
  onOpenMaps,
}: {
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
  onOpenMaps: () => void;
}) {
  if (profile.profile === "shop") return null;
  if (profile.variant === "dungeon" || profile.variant === "floor") {
    return (
      <Button type="button" icon={MapIcon} size="sm" onClick={onOpenMaps}>
        Map context
      </Button>
    );
  }
  if (profile.variant === "town") {
    return (
      <Button type="button" icon={Plus} size="sm" onClick={() => onAddChild("shop")}>
        Add place
      </Button>
    );
  }
  return (
    <Button type="button" icon={MapIcon} size="sm" onClick={onOpenMaps}>
      Map tools
    </Button>
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
    return <p className="text-xs font-semibold text-accent">{location.name}</p>;
  return (
    <nav aria-label="Location path" className="flex flex-wrap gap-x-1 text-xs font-semibold">
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
  return <StatChip className="py-0.5 text-[0.68rem]" label={label} tone="secondary" />;
}

function LocationChips({ childCount, compact }: { childCount: number; compact?: boolean }) {
  if (!childCount) return null;
  return (
    <div
      className={[
        "campaign-world-profile-hero__chips flex flex-wrap gap-2",
        compact ? "mt-2" : "mt-3",
      ].join(" ")}
    >
      <Chip tone="map">{childCount} connected places</Chip>
    </div>
  );
}

function locationTags(location: CampaignLocation, profile: LocationProfileInfo) {
  const typeLabels = new Set(
    [profile.label, location.locationType, location.customTypeLabel]
      .filter(Boolean)
      .map((label) => normalizeMetadataLabel(label!)),
  );
  return (location.tags ?? []).filter((tag) => !typeLabels.has(normalizeMetadataLabel(tag)));
}

function normalizeMetadataLabel(label: string) {
  return label.trim().toLowerCase().replaceAll("-", " ");
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "accent" | "count" | "default" | "map";
}) {
  const chipTone =
    tone === "map"
      ? "tertiary"
      : tone === "count"
        ? "secondary"
        : tone === "accent"
          ? "primary"
          : "metadata";
  return <StatChip className="py-0.5 text-[0.68rem]" label={children} tone={chipTone} />;
}
