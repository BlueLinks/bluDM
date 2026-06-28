import {
  Boxes,
  DraftingCompass,
  FilePenLine,
  Footprints,
  Map as MapIcon,
  MapPin,
  Route,
} from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { ActionRow, CardSection, ResponsiveGrid, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Encounter } from "../../../types";
import { ChildPrepChips, type ChildPrepChip } from "./CampaignWorldChildPrepChips";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import { distanceUnitOptions, labelFor, paceOptions, terrainOptions } from "./travelOptions";
import type { LocationProfileInfo } from "./locationProfiles";
import type {
  CampaignJourney,
  CampaignLocation,
  CampaignLocationLink,
  CampaignMap,
} from "./travelTypes";

export function ChildLocationsCard({
  childLocations,
  emptyCopy,
  prepChipsByLocationId,
  prepSummaryChips,
  title,
  onSelectLocation,
  action,
}: {
  childLocations: CampaignLocation[];
  emptyCopy: string;
  prepChipsByLocationId?: Record<string, ChildPrepChip[]>;
  prepSummaryChips?: ChildPrepChip[];
  title: string;
  onSelectLocation: (locationID: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <CardSection>
      <SectionHeader
        action={action}
        icon={MapPin}
        meta={
          childLocations.length
            ? `${childLocations.length} ${childLocations.length === 1 ? "place" : "places"} ready to open`
            : undefined
        }
        title={title}
      />
      {prepSummaryChips?.length ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-background px-3 py-2">
          <div className="text-xs font-bold uppercase text-muted-foreground">Needs attention</div>
          <ChildPrepChips chips={prepSummaryChips} />
        </div>
      ) : null}
      {childLocations.length ? (
        <div className="mt-3 grid gap-2">
          {childLocations.map((child) => (
            <button
              className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-primary/60"
              key={child.id}
              type="button"
              onClick={() => onSelectLocation(child.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block [overflow-wrap:anywhere] font-semibold">{child.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {child.summary ||
                    child.path?.map((segment) => segment.name).join(" / ") ||
                    child.name}
                </span>
                <ChildPrepChips chips={prepChipsByLocationId?.[child.id]} />
              </span>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
                {child.customTypeLabel || child.locationType || "custom"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {emptyCopy}
        </p>
      )}
    </CardSection>
  );
}

export function LocationNotesCard({
  location,
  title,
}: {
  location: CampaignLocation;
  title: string;
}) {
  const hasNotes = location.publicNotes || location.notes || location.dmNotes;
  return (
    <CardSection>
      <SectionHeader
        icon={FilePenLine}
        title={title}
        meta={hasNotes ? "Prepared notes" : "No notes"}
      />
      {hasNotes ? (
        <div className="mt-3 grid gap-3">
          {(location.publicNotes || location.notes) && (
            <WorldNote label="Player-facing notes" value={location.publicNotes || location.notes} />
          )}
          {location.dmNotes && <WorldNote label="DM-only" value={location.dmNotes} secret />}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No notes have been added yet.
        </p>
      )}
    </CardSection>
  );
}

function WorldNote({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        secret ? "border-amber-500/30 bg-amber-500/10" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  );
}

export function LocationMapCard({
  children,
  compact,
  location,
  maps,
  toolsOpen,
  onCloseMaps,
  onOpenMaps,
  studioPath,
}: {
  children?: React.ReactNode;
  compact: boolean;
  location: CampaignLocation;
  maps: CampaignMap[];
  toolsOpen: boolean;
  onCloseMaps: () => void;
  onOpenMaps: () => void;
  studioPath?: string;
}) {
  const attachedMaps = maps.filter((map) => (map.parentLocationId ?? "") === location.id);
  const parentMaps = maps.filter(
    (map) => (map.parentLocationId ?? "") === (location.parentLocationId ?? ""),
  );
  const relevantMaps = compact ? parentMaps : attachedMaps;
  const preview = relevantMaps.find((map) => map.imageUrl) ?? relevantMaps[0];
  const hasAnchor = Object.keys(location.mapAnchor ?? {}).length > 0;
  return (
    <CardSection className="grid min-w-0 gap-3">
      <SectionHeader
        icon={MapIcon}
        meta={mapMeta(compact, hasAnchor, parentMaps.length, attachedMaps.length)}
        title={compact ? "Map position" : "Map"}
        action={
          <ActionRow justify="end">
            {studioPath ? (
              <Link to={studioPath}>
                <Button type="button" icon={DraftingCompass} size="sm" variant="secondary">
                  Open Dungeon Studio
                </Button>
              </Link>
            ) : null}
            <Button
              type="button"
              icon={MapIcon}
              size="sm"
              variant="secondary"
              aria-expanded={toolsOpen}
              onClick={toolsOpen ? onCloseMaps : onOpenMaps}
            >
              {toolsOpen ? "Hide map tools" : "Show map tools"}
            </Button>
          </ActionRow>
        }
      />
      {toolsOpen ? (
        <div className="grid min-w-0 gap-3">{children}</div>
      ) : preview?.imageUrl ? (
        <img
          className="max-h-64 w-full rounded-md border border-border object-cover"
          src={preview.imageUrl}
          alt={`${preview.name} preview`}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
          {mapEmptyCopy(compact, hasAnchor, relevantMaps.length)}
        </div>
      )}
    </CardSection>
  );
}

function mapMeta(
  compact: boolean,
  hasAnchor: boolean,
  parentMapCount: number,
  attachedMapCount: number,
) {
  if (!compact) {
    if (!attachedMapCount) return undefined;
    return attachedMapCount === 1 ? "Regional map available" : `${attachedMapCount} maps available`;
  }
  if (hasAnchor) return "Pinned on parent map";
  return parentMapCount ? "Not placed on parent map" : "No parent map";
}

function mapEmptyCopy(compact: boolean, hasAnchor: boolean, attachedMapCount: number) {
  if (compact) {
    return hasAnchor
      ? "Pinned on a parent map. Show map tools to review or move it."
      : "Not pinned yet. Show map tools to place it on a parent map.";
  }
  return attachedMapCount
    ? "Map ready. Show map tools to manage pins and distances."
    : "No map attached yet. Show map tools to create one.";
}

export function MapStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

export function CompactTravelCard({
  journeys,
  links,
  location,
  profile,
  onPlanTravel,
}: {
  journeys: CampaignJourney[];
  links: CampaignLocationLink[];
  location: CampaignLocation;
  profile: LocationProfileInfo;
  onPlanTravel?: () => void;
}) {
  const title = profile.variant === "town" ? "Travel from here" : "Travel summary";
  return (
    <CardSection>
      <SectionHeader
        action={
          onPlanTravel ? (
            <Button type="button" icon={Route} size="sm" variant="secondary" onClick={onPlanTravel}>
              {profile.variant === "town" ? "Plan Travel From Here" : "Plan Travel"}
            </Button>
          ) : undefined
        }
        icon={Footprints}
        meta={`${journeys.length} saved ${journeys.length === 1 ? "journey" : "journeys"}`}
        title={title}
      />
      {journeys.length || links.length ? (
        <div className="mt-3 grid gap-2">
          {journeys.slice(0, 3).map((journey) => (
            <div
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              key={journey.id}
            >
              <div className="font-semibold [overflow-wrap:anywhere]">{journey.name}</div>
              <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {journeyRouteSummary(journey, location)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {journeyDistanceSummary(journey)} · {labelFor(terrainOptions, journey.terrain)} ·{" "}
                {labelFor(paceOptions, journey.pace)} pace
              </p>
            </div>
          ))}
          {links.slice(0, 3).map((link) => (
            <div
              className="rounded-md border border-dashed border-border px-3 py-2 text-sm"
              key={link.id}
            >
              <div className="font-semibold capitalize">{link.linkType || "linked route"}</div>
              <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {[link.label, link.notes].filter(Boolean).join(" - ") || "Linked travel context"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No saved journeys are tied to this location yet. Use Plan Travel From Here to start a
          contextual route.
        </p>
      )}
    </CardSection>
  );
}

function journeyRouteSummary(journey: CampaignJourney, location: CampaignLocation) {
  if (journey.routeInputMode === "route") {
    return [journey.origin, journey.destination].filter(Boolean).join(" → ") || location.name;
  }
  return `Direct distance from ${location.name}`;
}

function journeyDistanceSummary(journey: CampaignJourney) {
  return `${journey.distance.toLocaleString()} ${labelFor(distanceUnitOptions, journey.distanceUnit)}`;
}

export function StructureSummaryCard({
  childLocations,
  encounters,
  links,
  onSelectLocation,
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  links: CampaignLocationLink[];
  onSelectLocation: (locationID: string) => void;
}) {
  return (
    <CardSection>
      <SectionHeader icon={Boxes} title="Structure" meta="Dungeon prep" />
      <ResponsiveGrid className="mt-3" variant="stats3">
        <MapStat label="Floors/rooms" value={childLocations.length} />
        <MapStat label="Encounters" value={encounters.length} />
        <MapStat label="Exits/links" value={links.length} />
      </ResponsiveGrid>
      {childLocations.length ? (
        <div className="mt-3 grid gap-2">
          {childLocations.slice(0, 5).map((child) => (
            <button
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left transition hover:border-primary/60"
              key={child.id}
              type="button"
              onClick={() => onSelectLocation(child.id)}
            >
              <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{child.name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
                {child.customTypeLabel || child.locationType || "area"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </CardSection>
  );
}

export function journeyInvolvesLocation(
  journey: CampaignJourney,
  location: CampaignLocation,
  childLocations: CampaignLocation[],
) {
  const labels = [
    location.name,
    locationPathLabel(location),
    ...childLocations.flatMap((child) => [child.name, locationPathLabel(child)]),
  ]
    .filter(Boolean)
    .map((label) => label.toLowerCase());
  const route = `${journey.origin} ${journey.destination} ${journey.name}`.toLowerCase();
  return labels.some((label) => label && route.includes(label));
}

export function travelLikeLinks(links: CampaignLocationLink[]) {
  return links.some((link) => ["road", "route", "trail", "path", "gate"].includes(link.linkType));
}
