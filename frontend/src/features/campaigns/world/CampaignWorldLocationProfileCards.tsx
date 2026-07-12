import { DraftingCompass, Footprints, Map as MapIcon, MapPin, Route } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { ChildPrepChips, type ChildPrepChip } from "./CampaignWorldChildPrepChips";
import { ChildLocationTile, groupLocationsByType } from "./CampaignWorldChildLocationTiles";
import { CampaignWorldEmptyState } from "./CampaignWorldEmptyState";
import { MapPlaceholderPanel } from "./CampaignWorldMapPlaceholder";
import { distanceUnitOptions, labelFor, paceOptions, terrainOptions } from "./travelOptions";
import { DungeonStudioMapThumbnail } from "./DungeonStudioMapThumbnail";
import { parseDungeonStudioDocument, isDungeonStudioMap } from "./dungeonStudioDocument";
import { dungeonStudioThemeLabel } from "./dungeonStudioThemes";
import { locationProfile, type LocationProfileInfo } from "./locationProfiles";
import type {
  CampaignJourney,
  CampaignLocation,
  CampaignLocationLink,
  CampaignMap,
} from "./travelTypes";

export { LocationNotesCard } from "./CampaignWorldLocationNotesCard";

export function ChildLocationsCard({
  childLocations,
  emptyCopy,
  prepChipsByLocationId,
  prepSummaryChips,
  nestedLocationsByParentId,
  title,
  onSelectLocation,
  action,
}: {
  childLocations: CampaignLocation[];
  emptyCopy: string;
  prepChipsByLocationId?: Record<string, ChildPrepChip[]>;
  prepSummaryChips?: ChildPrepChip[];
  nestedLocationsByParentId?: Record<string, CampaignLocation[]>;
  title: string;
  onSelectLocation: (locationID: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <CardSection>
      <SectionHeader action={action} icon={MapPin} title={title} />
      {prepSummaryChips?.length ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-background px-3 py-2">
          <div className="text-xs font-bold uppercase text-muted-foreground">At a glance</div>
          <ChildPrepChips chips={prepSummaryChips} />
        </div>
      ) : null}
      {childLocations.length ? (
        <div className="mt-3 grid gap-4">
          {groupLocationsByType(childLocations).map((group) => (
            <div className="grid gap-2" key={group.label}>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {group.label} · {group.items.length}
              </div>
              <div className="campaign-world-child-tile-grid grid gap-2">
                {group.items.map((child) => (
                  <div className="grid min-w-0 gap-2" key={child.id}>
                    <ChildLocationTile
                      child={child}
                      prepChips={prepChipsByLocationId?.[child.id]}
                      onSelectLocation={onSelectLocation}
                    />
                    <NestedChildLocations
                      locations={nestedLocationsByParentId?.[child.id]}
                      onSelectLocation={onSelectLocation}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <CampaignWorldEmptyState icon={MapPin} title="No connected places yet" copy={emptyCopy} />
        </div>
      )}
    </CardSection>
  );
}

function NestedChildLocations({
  locations,
  onSelectLocation,
}: {
  locations?: CampaignLocation[];
  onSelectLocation: (locationID: string) => void;
}) {
  if (!locations?.length) return null;
  return (
    <div className="ml-11 flex min-w-0 flex-wrap gap-2">
      {locations.slice(0, 8).map((location) => (
        <button
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
          key={location.id}
          type="button"
          onClick={() => onSelectLocation(location.id)}
        >
          {location.name}
        </button>
      ))}
      {locations.length > 8 ? (
        <span className="px-2 py-1 text-xs font-semibold text-muted-foreground">
          +{locations.length - 8} more
        </span>
      ) : null}
    </div>
  );
}

export function LocationMapCard({
  children,
  compact,
  location,
  locations = [],
  maps,
  toolsOpen,
  onCloseMaps,
  onOpenMaps,
  onSelectLocation,
  studioPath,
}: {
  children?: React.ReactNode;
  compact: boolean;
  location: CampaignLocation;
  locations?: CampaignLocation[];
  maps: CampaignMap[];
  toolsOpen: boolean;
  onCloseMaps: () => void;
  onOpenMaps: () => void;
  onSelectLocation?: (locationID: string) => void;
  studioPath?: string;
}) {
  const profile = locationProfile(location);
  const attachedMaps = maps.filter((map) => (map.parentLocationId ?? "") === location.id);
  const parentMaps = maps.filter(
    (map) => (map.parentLocationId ?? "") === (location.parentLocationId ?? ""),
  );
  const ancestorIds = ancestorLocationIds(location, locations);
  const ancestorStudioMaps = maps.filter(
    (map) => ancestorIds.has(map.parentLocationId ?? "") && isDungeonStudioMap(map),
  );
  const childLocationIds = new Set(
    locations.filter((item) => item.parentLocationId === location.id).map((item) => item.id),
  );
  const childStudioMaps =
    profile.variant === "dungeon"
      ? maps.filter(
          (map) => childLocationIds.has(map.parentLocationId ?? "") && isDungeonStudioMap(map),
        )
      : [];
  const relevantMaps =
    profile.profile === "room"
      ? ancestorStudioMaps.length
        ? ancestorStudioMaps
        : parentMaps
      : compact
        ? parentMaps
        : attachedMaps.length
          ? attachedMaps
          : ancestorStudioMaps.length && profile.variant === "floor"
            ? ancestorStudioMaps
            : childStudioMaps;
  const preview = relevantMaps.find((map) => map.imageUrl) ?? relevantMaps[0];
  const studioMap = relevantMaps.find(isDungeonStudioMap);
  const studioDocument = studioMap
    ? parseDungeonStudioDocument(studioMap.metadata, {
        scope: studioMap.mapType === "floor" ? "floor" : "dungeon",
      })
    : null;
  const hasAnchor = Object.keys(location.mapAnchor ?? {}).length > 0;
  const showMapTools = !studioPath && !studioDocument;
  const previewHeightClass = compact && profile.profile !== "room" ? "h-56" : "h-80 xl:h-96";
  const mapTitle = studioDocument
    ? profile.profile === "room"
      ? "Room map"
      : profile.variant === "floor"
        ? "Floor map"
        : "Dungeon map"
    : compact
      ? "Map position"
      : "Map";
  return (
    <CardSection className="campaign-world-map-card grid min-w-0 gap-0 overflow-hidden p-0">
      <SectionHeader
        className="border-b border-border/70 p-3"
        icon={MapIcon}
        meta={mapMeta(compact, hasAnchor, parentMaps.length, attachedMaps.length)}
        title={mapTitle}
        action={
          <ActionRow justify="end">
            {studioPath ? (
              <Link to={studioPath}>
                <Button type="button" icon={DraftingCompass} size="sm" variant="secondary">
                  Open Dungeon Studio
                </Button>
              </Link>
            ) : null}
            {showMapTools ? (
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
            ) : null}
          </ActionRow>
        }
      />
      {toolsOpen && showMapTools ? (
        <div className="grid min-w-0 gap-3 p-3 pt-0">{children}</div>
      ) : studioDocument ? (
        <div className="grid gap-2 px-3 pb-3">
          <div
            className={`campaign-world-map-preview ${previewHeightClass} min-w-0 overflow-hidden rounded-md border border-border bg-background`}
          >
            <DungeonStudioMapThumbnail
              document={studioDocument}
              focusRoomLocationId={location.locationType === "room" ? location.id : undefined}
              label={`${location.name} dungeon map preview`}
              onRoomSelect={onSelectLocation}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span>{dungeonStudioThemeLabel(studioDocument.tileset)} theme</span>
            <span>{studioDocument.rooms.length} rooms</span>
            <span>
              {studioDocument.entities.filter((entity) => entity.kind === "stairs").length} stairs
            </span>
            <span>{studioDocument.entities.length} objects</span>
          </div>
        </div>
      ) : preview?.imageUrl ? (
        <div className="px-3 pb-3">
          <img
            className={`campaign-world-map-preview ${previewHeightClass} w-full rounded-md border border-border object-cover`}
            src={preview.imageUrl}
            alt={`${preview.name} preview`}
          />
        </div>
      ) : (
        <div className="px-3 pb-3">
          <MapPlaceholderPanel
            compact={compact}
            copy={mapEmptyCopy(compact, hasAnchor, relevantMaps.length)}
            showAction={showMapTools}
            title={compact && hasAnchor ? "Map position set" : undefined}
            onOpenMaps={onOpenMaps}
          />
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

function ancestorLocationIds(location: CampaignLocation, locations: CampaignLocation[]) {
  const ids = new Set<string>();
  let parentId = location.parentLocationId;
  while (parentId) {
    ids.add(parentId);
    parentId = locations.find((item) => item.id === parentId)?.parentLocationId;
  }
  return ids;
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
        <div className="mt-3">
          <CampaignWorldEmptyState
            icon={Footprints}
            title="No routes from here yet"
            copy="Plan travel from this place when distance, pace, or route notes matter at the table."
            action={
              onPlanTravel ? (
                <Button
                  type="button"
                  icon={Route}
                  size="sm"
                  variant="secondary"
                  onClick={onPlanTravel}
                >
                  Plan travel
                </Button>
              ) : undefined
            }
          />
        </div>
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
