import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Coins,
  FilePenLine,
  Footprints,
  Map as MapIcon,
  MapPin,
  Route,
} from "lucide-react";
import type React from "react";
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
  CampaignLocationStock,
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
            <Button type="button" icon={MapIcon} size="sm" variant="secondary" onClick={onOpenMaps}>
              Open Map
            </Button>
            <Button type="button" icon={MapPin} size="sm" variant="secondary" onClick={onOpenMaps}>
              {placeLabel(compact, profile)}
            </Button>
          </ActionRow>
        }
      />
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {preview?.imageUrl ? (
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
        <div className="grid gap-2">
          <MapStatusPill
            ready={Boolean(preview)}
            readyText={compact ? "Parent map available" : "Map available"}
            emptyText={compact ? "Needs parent map" : "Needs map"}
          />
          <MapStatusPill
            ready={compact ? hasAnchor : attachedMaps.length > 0}
            readyText={compact ? "Pinned on map" : "Regional map available"}
            emptyText={compact ? "Not placed yet" : "No attached map yet"}
          />
          {!compact && childLocations.length ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {childLocations.length} relevant{" "}
              {childLocations.length === 1 ? "place can" : "places can"} be pinned from Maps.
            </p>
          ) : null}
        </div>
      </div>
      <details className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">Map details</summary>
        <ResponsiveGrid className="mt-3" variant="stats3">
          <MapStat
            label={compact ? "Parent maps" : "Attached maps"}
            value={compact ? parentMaps.length : attachedMaps.length}
          />
          <MapStat
            label={compact ? "Placement" : "Pin candidates"}
            value={compact ? (hasAnchor ? "Placed" : "Unplaced") : childLocations.length}
          />
          <MapStat label="Map record" value={preview ? "Ready" : "Missing"} />
        </ResponsiveGrid>
      </details>
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

function MapStatusPill({
  emptyText,
  ready,
  readyText,
}: {
  emptyText: string;
  ready: boolean;
  readyText: string;
}) {
  const Icon = ready ? CheckCircle2 : AlertTriangle;
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold",
        ready
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {ready ? readyText : emptyText}
    </span>
  );
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

export function PricingSummaryCard({ stock }: { stock: CampaignLocationStock[] }) {
  const priced = stock.filter((entry) => entry.priceAmount > 0);
  const market = stock.length - priced.length;
  const limited = stock.filter((entry) =>
    ["limited", "special-order", "hidden"].includes(entry.availability),
  );
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
        <MapStat label="Market price" value={market} />
      </ResponsiveGrid>
      {limited.length || market ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          {limited.length
            ? `${limited.length} limited, hidden, or special-order item${limited.length === 1 ? "" : "s"}. `
            : ""}
          {market ? `${market} item${market === 1 ? "" : "s"} still use market pricing.` : ""}
        </p>
      ) : null}
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
