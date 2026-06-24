import {
  Boxes,
  CheckCircle2,
  Coins,
  FilePenLine,
  Footprints,
  Map as MapIcon,
  MapPin,
  Route,
  Swords,
} from "lucide-react";
import type React from "react";
import { ActionRow, CardSection, ResponsiveGrid, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Encounter } from "../../../types";
import { ChildPrepChips, type ChildPrepChip } from "./CampaignWorldChildPrepChips";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { LocationProfileInfo } from "./locationProfiles";
import type {
  CampaignJourney,
  CampaignLocation,
  CampaignLocationLink,
  CampaignLocationStock,
  CampaignMap,
} from "./travelTypes";

export function ChildLocationsCard({
  childLocations,
  emptyCopy,
  prepChipsByLocationId,
  title,
  onSelectLocation,
}: {
  childLocations: CampaignLocation[];
  emptyCopy: string;
  prepChipsByLocationId?: Record<string, ChildPrepChip[]>;
  title: string;
  onSelectLocation: (locationID: string) => void;
}) {
  return (
    <CardSection>
      <SectionHeader
        icon={MapPin}
        meta={`${childLocations.length} child ${childLocations.length === 1 ? "location" : "locations"}`}
        title={title}
      />
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
  const hasNotes = location.summary || location.publicNotes || location.notes || location.dmNotes;
  return (
    <CardSection>
      <SectionHeader
        icon={FilePenLine}
        title={title}
        meta={hasNotes ? "Prepared notes" : "No notes"}
      />
      {hasNotes ? (
        <div className="mt-3 grid gap-3">
          {location.summary && <WorldNote label="Summary" value={location.summary} />}
          {(location.publicNotes || location.notes) && (
            <WorldNote label="Notes" value={location.publicNotes || location.notes} />
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
  childLocations,
  compact,
  location,
  maps,
  profile,
  onOpenMaps,
}: {
  childLocations: CampaignLocation[];
  compact: boolean;
  location: CampaignLocation;
  maps: CampaignMap[];
  profile: LocationProfileInfo;
  onOpenMaps: () => void;
}) {
  const attachedMaps = maps.filter((map) => (map.parentLocationId ?? "") === location.id);
  const parentMaps = maps.filter(
    (map) => (map.parentLocationId ?? "") === (location.parentLocationId ?? ""),
  );
  const preview = attachedMaps.find((map) => map.imageUrl) ?? attachedMaps[0];
  const hasAnchor = Object.keys(location.mapAnchor ?? {}).length > 0;
  return (
    <CardSection className="grid min-w-0 gap-3">
      <SectionHeader
        icon={MapIcon}
        meta={mapMeta(compact, hasAnchor, parentMaps.length, attachedMaps.length)}
        title={compact ? "Map position" : "Map"}
        action={
          <ActionRow justify="end">
            <Button type="button" icon={MapIcon} size="sm" variant="secondary" onClick={onOpenMaps}>
              Open Map
            </Button>
            <Button type="button" icon={MapPin} size="sm" variant="secondary" onClick={onOpenMaps}>
              {placeLabel(compact, profile)}
            </Button>
          </ActionRow>
        }
      />
      {preview?.imageUrl ? (
        <img
          className="max-h-64 w-full rounded-md border border-border object-cover"
          src={preview.imageUrl}
          alt={`${preview.name} preview`}
        />
      ) : (
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
          {mapEmptyCopy(compact, hasAnchor, attachedMaps.length)}
        </div>
      )}
      <ResponsiveGrid variant="stats3">
        <MapStat
          label={compact ? "Parent maps" : "Attached maps"}
          value={compact ? parentMaps.length : attachedMaps.length}
        />
        <MapStat
          label={compact ? "Placement" : "Relevant children"}
          value={compact ? (hasAnchor ? "Placed" : "Unplaced") : childLocations.length}
        />
        <MapStat label="Map status" value={preview ? "Ready" : "Needs map"} />
      </ResponsiveGrid>
    </CardSection>
  );
}

function mapMeta(
  compact: boolean,
  hasAnchor: boolean,
  parentMapCount: number,
  attachedMapCount: number,
) {
  if (!compact) return `${attachedMapCount} attached ${attachedMapCount === 1 ? "map" : "maps"}`;
  if (hasAnchor) return "Pinned on parent map";
  return parentMapCount ? "Not placed on parent map" : "No parent map";
}

function mapEmptyCopy(compact: boolean, hasAnchor: boolean, attachedMapCount: number) {
  if (compact) {
    return hasAnchor
      ? "This location has map placement data. Open Maps to review or move the pin."
      : "This location is not placed yet. Open Maps to place it on a parent map.";
  }
  return attachedMapCount
    ? "Map records are attached. Open Maps to edit pins, placement, and distances."
    : "No map is attached yet. Open Maps to create a map and place relevant locations.";
}

function placeLabel(compact: boolean, profile: LocationProfileInfo) {
  if (compact) return "Place Location";
  if (profile.variant === "town") return "Place Buildings";
  if (profile.variant === "dungeon" || profile.variant === "floor") return "Place Rooms";
  return "Place Locations";
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
                {[journey.origin, journey.destination].filter(Boolean).join(" → ") || location.name}
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
          No saved journeys are tied to this location yet. Use the Travel tool when route planning
          is needed.
        </p>
      )}
    </CardSection>
  );
}

export function PricingSummaryCard({ stock }: { stock: CampaignLocationStock[] }) {
  const priced = stock.filter((entry) => entry.priceAmount > 0);
  return (
    <CardSection>
      <SectionHeader
        icon={Coins}
        title="Pricing summary"
        meta={`${priced.length} priced ${priced.length === 1 ? "item" : "items"}`}
      />
      <ResponsiveGrid className="mt-3" variant="stats3">
        <MapStat label="Stocked" value={stock.length} />
        <MapStat label="Priced" value={priced.length} />
        <MapStat label="Market price" value={stock.length - priced.length} />
      </ResponsiveGrid>
    </CardSection>
  );
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

export function PrepOverviewCard({
  childLocations,
  encounters,
  links,
  location,
  maps,
  onAddEncounter,
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  links: CampaignLocationLink[];
  location: CampaignLocation;
  maps: CampaignMap[];
  onAddEncounter: () => void;
}) {
  const hasNotes = Boolean(
    location.summary || location.publicNotes || location.notes || location.dmNotes,
  );
  const hasMap = maps.some((map) => (map.parentLocationId ?? "") === location.id);
  const hasPlacement = Object.keys(location.mapAnchor ?? {}).length > 0;
  return (
    <CardSection>
      <SectionHeader
        action={
          <Button
            type="button"
            icon={Swords}
            size="sm"
            variant="secondary"
            onClick={onAddEncounter}
          >
            Add encounter
          </Button>
        }
        icon={CheckCircle2}
        title="Prep overview"
        meta="Ready-to-run signals"
      />
      <ResponsiveGrid className="mt-3" variant="stats3">
        <MapStat label="Encounters" value={encounters.length} />
        <MapStat label="Exits/links" value={links.length} />
        <MapStat label="Child spaces" value={childLocations.length} />
      </ResponsiveGrid>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        <PrepSignal label="Notes" ready={hasNotes} readyText="Prepared" emptyText="Needs notes" />
        <PrepSignal
          label="Map"
          ready={hasMap || hasPlacement}
          readyText={hasMap ? "Map attached" : "Position placed"}
          emptyText="No map context yet"
        />
      </div>
    </CardSection>
  );
}

function PrepSignal({
  emptyText,
  label,
  ready,
  readyText,
}: {
  emptyText: string;
  label: string;
  ready: boolean;
  readyText: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <span className="font-semibold text-foreground">{label}</span>
      <span className={ready ? "text-emerald-700 dark:text-emerald-200" : "text-muted-foreground"}>
        {ready ? readyText : emptyText}
      </span>
    </div>
  );
}

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
