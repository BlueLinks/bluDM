import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { Creature, Encounter, Item } from "../../../types";
import { ChildLocationActions } from "./CampaignWorldChildLocationActions";
import { childPrepChipsFor, childPrepIssueSummariesFor } from "./CampaignWorldChildPrepChips";
import { CampaignWorldLocationEncounters } from "./CampaignWorldLocationEncounters";
import { connectedRoomsForLocation } from "./campaignWorldConnectedRooms";
import { ProfileScene } from "./CampaignWorldLocationScenes";
import {
  CampaignWorldLocationModeTabs,
  tabsForLocationProfile,
  type LocationDetailTab,
} from "./CampaignWorldLocationModeTabs";
import { CampaignWorldLocationLinks, type LinkFormInput } from "./CampaignWorldLocationLinks";
import { CampaignWorldLocationNpcs, type NpcLocationFormInput } from "./CampaignWorldLocationNpcs";
import {
  CampaignWorldLocationStock,
  type LocationStockFormInput,
} from "./CampaignWorldLocationStock";
import { LocationProfileHeader } from "./CampaignWorldLocationProfileHeader";
import { ParentContextCard, parentFor } from "./CampaignWorldLocationContextCards";
import {
  ChildLocationsCard,
  CompactTravelCard,
  LocationMapCard,
  LocationNotesCard,
} from "./CampaignWorldLocationProfileCards";
import { journeyInvolvesLocation, travelLikeLinks } from "./CampaignWorldLocationTravelUtils";
import { PrepOverviewCard } from "./CampaignWorldPrepOverviewCard";
import { explorationProfile, studioPathForLocation } from "./CampaignWorldLocationProfileUtils";
import { locationProfile, type LocationProfileInfo } from "./locationProfiles";
import type {
  CampaignJourney,
  CampaignLocation,
  CampaignLocationLink,
  CampaignLocationStock as CampaignLocationStockRecord,
  CampaignMap,
  CampaignNpcLocationLink,
} from "./travelTypes";

export function CampaignWorldLocationDetail({
  campaignId,
  childCount,
  childLocations,
  encounters,
  journeys,
  links,
  linksError,
  linksLoading,
  location,
  locations,
  maps,
  mapsMode,
  mapWorkspace,
  stock,
  stockItems,
  stockLoading,
  stockError,
  npcLinks,
  npcLinksError,
  npcLinksLoading,
  npcs,
  onAddChild,
  onCreateLink,
  onCreateNpcLink,
  onCreateNpc,
  onCreateStock,
  onCustomStockItemCreated,
  onClearNotes,
  onDeleteLocation,
  onDeleteLink,
  onDeleteNpcLink,
  onDeleteStock,
  onEdit,
  onGenerateEncounter,
  onCloneEncounter,
  onDeleteEncounter,
  onCloseMaps,
  onOpenMaps,
  onPlanTravel,
  onSelectLocation,
  onStartEncounter,
}: CampaignWorldLocationDetailProps) {
  const profile = locationProfile(location);
  const [stockOpen, setStockOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LocationDetailTab>("overview");
  const parentLocation = parentFor(location, locations);
  const selectedLinks = links.filter(
    (link) => link.sourceLocationId === location.id || link.targetLocationId === location.id,
  );
  const tabs = useMemo(() => tabsForLocationProfile(profile), [profile]);

  useEffect(() => {
    setActiveTab("overview");
  }, [location.id]);
  const relevantJourneys = useMemo(
    () => journeys.filter((journey) => journeyInvolvesLocation(journey, location, childLocations)),
    [childLocations, journeys, location],
  );
  const sections = buildProfileSections({
    allLinks: links,
    campaignId,
    childCount,
    childLocations,
    encounters,
    journeys: relevantJourneys,
    linkOpen,
    links: selectedLinks,
    linksError,
    linksLoading,
    location,
    locations,
    maps,
    mapsMode,
    mapWorkspace,
    npcLinks,
    npcLinksError,
    npcLinksLoading,
    npcs,
    parentLocation,
    profile,
    stock,
    stockError,
    stockItems,
    stockLoading,
    stockOpen,
    pricingOpen,
    setLinkOpen,
    setPricingOpen,
    setStockOpen,
    onAddChild,
    onCreateLink,
    onCreateNpc,
    onCreateNpcLink,
    onCreateStock,
    onCustomStockItemCreated,
    onClearNotes,
    onDeleteLink,
    onDeleteLocation,
    onDeleteNpcLink,
    onDeleteStock,
    onEdit,
    onGenerateEncounter,
    onCloneEncounter,
    onCloseMaps,
    onDeleteEncounter,
    onOpenMaps,
    onPlanTravel,
    onSelectLocation,
    onStartEncounter,
  });

  return (
    <article className="grid gap-4">
      <LocationProfileHeader
        childCount={childCount}
        location={location}
        parentLocation={parentLocation}
        profile={profile}
        onAddChild={onAddChild}
        onDeleteLocation={onDeleteLocation}
        onEdit={onEdit}
        onOpenMaps={onOpenMaps}
        onSelectLocation={onSelectLocation}
      />
      <ProfileScene
        activeTab={activeTab}
        profile={profile}
        sections={sections}
        tabBar={
          <CampaignWorldLocationModeTabs
            activeTab={activeTab}
            tabs={tabs}
            onChange={setActiveTab}
          />
        }
      />
    </article>
  );
}

function buildProfileSections(props: ProfileSectionProps) {
  const {
    allLinks,
    campaignId,
    childLocations,
    encounters,
    journeys,
    linkOpen,
    links,
    linksError,
    linksLoading,
    location,
    locations,
    maps,
    mapsMode,
    mapWorkspace,
    npcLinks,
    npcLinksError,
    npcLinksLoading,
    npcs,
    parentLocation,
    profile,
    stock,
    stockError,
    stockItems,
    stockLoading,
    stockOpen,
    pricingOpen,
    setLinkOpen,
    setPricingOpen,
    setStockOpen,
    onCreateLink,
    onCreateNpc,
    onCreateNpcLink,
    onCreateStock,
    onCustomStockItemCreated,
    onDeleteLink,
    onDeleteNpcLink,
    onDeleteStock,
    onClearNotes,
    onCloneEncounter,
    onCloseMaps,
    onDeleteEncounter,
    onOpenMaps,
    onPlanTravel,
    onSelectLocation,
  } = props;
  const showTravel =
    profile.travel === "always" ||
    (profile.travel === "relevant" && (journeys.length > 0 || travelLikeLinks(links)));
  const shouldShowChildren =
    profile.profile === "container" || childLocations.length > 0 || profile.variant === "town";
  const shouldShowNpcs =
    profile.variant === "town" ||
    profile.profile === "shop" ||
    profile.profile === "room" ||
    npcLinks.length > 0;
  const shouldShowEncounters = true;
  const shouldShowLinks = profile.profile !== "shop" || links.length > 0 || linkOpen;
  const inferredRoomConnections =
    profile.profile === "room" ? connectedRoomsForLocation({ location, locations, maps }) : [];
  const showChildPrep = profile.variant === "dungeon" || profile.variant === "floor";
  const prepChipsByLocationId = showChildPrep
    ? Object.fromEntries(
        childLocations.map((child) => [
          child.id,
          childPrepChipsFor({ child, encounters, links: allLinks, locations, maps, npcLinks }),
        ]),
      )
    : undefined;
  const prepSummaryChips = showChildPrep
    ? childPrepIssueSummariesFor({
        childLocations,
        encounters,
        links: allLinks,
        locations,
        maps,
        npcLinks,
      })
    : undefined;
  const nestedLocationsByParentId =
    profile.variant === "dungeon"
      ? Object.fromEntries(
          childLocations
            .filter((child) => child.locationType === "floor")
            .map((floor) => [
              floor.id,
              locations.filter(
                (candidate) =>
                  candidate.parentLocationId === floor.id && candidate.locationType === "room",
              ),
            ]),
        )
      : undefined;

  return {
    childCard: shouldShowChildren ? (
      <ChildLocationsCard
        childLocations={childLocations}
        emptyCopy={profile.childEmpty}
        nestedLocationsByParentId={nestedLocationsByParentId}
        prepChipsByLocationId={prepChipsByLocationId}
        prepSummaryChips={prepSummaryChips}
        title={profile.childTitle}
        action={<ChildLocationActions profile={profile} onAddChild={props.onAddChild} />}
        onSelectLocation={onSelectLocation}
      />
    ) : null,
    encountersCard: shouldShowEncounters ? (
      <CampaignWorldLocationEncounters
        campaignId={campaignId}
        encounters={encounters}
        onAddEncounter={props.onGenerateEncounter}
        onCloneEncounter={onCloneEncounter}
        onDeleteEncounter={onDeleteEncounter}
        onStartEncounter={props.onStartEncounter}
      />
    ) : null,
    linksCard: shouldShowLinks ? (
      <>
        {linksError ? <p className="text-sm font-semibold text-destructive">{linksError}</p> : null}
        <CampaignWorldLocationLinks
          actionLabel={
            profile.profile === "room"
              ? "Link room"
              : explorationProfile(profile)
                ? "Link exit"
                : undefined
          }
          defaultLinkType={profile.profile === "room" ? "door" : "passage"}
          emptyCopy={
            profile.profile === "room"
              ? "No connected rooms found on the map or in manual links yet."
              : explorationProfile(profile)
                ? "No connected routes or linked rooms yet."
                : undefined
          }
          inferredConnections={inferredRoomConnections}
          title={
            profile.profile === "room"
              ? "Connected rooms"
              : explorationProfile(profile)
                ? "Exits and linked locations"
                : undefined
          }
          links={links}
          loading={linksLoading}
          location={location}
          locations={locations}
          open={linkOpen}
          onCreate={onCreateLink}
          onDelete={onDeleteLink}
          onOpenChange={setLinkOpen}
          onSelectLocation={onSelectLocation}
        />
      </>
    ) : null,
    mapCard: (
      <LocationMapCard
        compact={profile.compactMap}
        location={location}
        maps={maps}
        toolsOpen={mapsMode}
        locations={locations}
        studioPath={studioPathForLocation(campaignId, location, parentLocation, profile)}
        onCloseMaps={onCloseMaps}
        onOpenMaps={onOpenMaps}
        onSelectLocation={onSelectLocation}
      >
        {mapWorkspace}
      </LocationMapCard>
    ),
    notesCard: (
      <LocationNotesCard
        location={location}
        title={profile.notesTitle}
        onClearNotes={onClearNotes}
        onEditNotes={props.onEdit}
      />
    ),
    npcsCard: shouldShowNpcs ? (
      <>
        {npcLinksError ? (
          <p className="text-sm font-semibold text-destructive">{npcLinksError}</p>
        ) : null}
        <CampaignWorldLocationNpcs
          links={npcLinks}
          loading={npcLinksLoading}
          location={location}
          npcs={npcs}
          commerceMode={profile.profile === "shop"}
          onCreateNpc={onCreateNpc}
          onCreate={onCreateNpcLink}
          onDelete={onDeleteNpcLink}
        />
      </>
    ) : null,
    prepCard: explorationProfile(profile) ? (
      <PrepOverviewCard
        childLocations={childLocations}
        connectedRoomCount={inferredRoomConnections.length}
        encounters={encounters}
        links={links}
        location={location}
        maps={maps}
        showRoomNextSteps={profile.profile === "room"}
        onEditNotes={profile.profile === "room" ? props.onEdit : undefined}
        onLinkExit={profile.profile === "room" ? () => setLinkOpen(true) : undefined}
        onOpenMaps={profile.profile === "room" ? onOpenMaps : undefined}
      />
    ) : null,
    parentCard:
      profile.profile === "shop" || profile.profile === "room" ? (
        <ParentContextCard parent={parentLocation} onSelectLocation={onSelectLocation} />
      ) : null,
    stockCard:
      profile.profile === "shop" ? (
        <>
          {stockError ? (
            <p className="text-sm font-semibold text-destructive">{stockError}</p>
          ) : null}
          <CampaignWorldLocationStock
            items={stockItems}
            loading={stockLoading}
            location={location}
            open={stockOpen}
            pricingOpen={pricingOpen}
            stock={stock}
            onCreate={onCreateStock}
            onCustomItemCreated={onCustomStockItemCreated}
            onDelete={onDeleteStock}
            onOpenChange={setStockOpen}
            dominant
            onPricingOpenChange={setPricingOpen}
          />
        </>
      ) : null,
    travelCard: showTravel ? (
      <CompactTravelCard
        journeys={journeys}
        links={links}
        location={location}
        profile={profile}
        onPlanTravel={onPlanTravel}
      />
    ) : null,
  };
}

type CampaignWorldLocationDetailProps = {
  campaignId: string;
  childCount: number;
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  journeys: CampaignJourney[];
  links: CampaignLocationLink[];
  linksError: string;
  linksLoading: boolean;
  location: CampaignLocation;
  locations: CampaignLocation[];
  maps: CampaignMap[];
  mapsMode: boolean;
  mapWorkspace?: React.ReactNode;
  stock: CampaignLocationStockRecord[];
  stockItems: Item[];
  stockLoading: boolean;
  stockError: string;
  npcLinks: CampaignNpcLocationLink[];
  npcLinksError: string;
  npcLinksLoading: boolean;
  npcs: Creature[];
  onAddChild: (locationType?: string) => void;
  onCreateLink: (input: LinkFormInput) => Promise<void>;
  onCreateNpc: () => void;
  onCreateNpcLink: (input: NpcLocationFormInput) => Promise<void>;
  onCreateStock: (input: LocationStockFormInput) => Promise<void>;
  onCustomStockItemCreated: (item: Item) => void;
  onDeleteLocation: () => void;
  onDeleteLink: (linkID: string) => Promise<void>;
  onDeleteNpcLink: (linkID: string) => Promise<void>;
  onDeleteStock: (stockID: string) => Promise<void>;
  onClearNotes: (location: CampaignLocation) => Promise<void>;
  onEdit: () => void;
  onGenerateEncounter: () => void;
  onCloneEncounter: (encounter: Encounter) => void;
  onDeleteEncounter: (encounter: Encounter) => void;
  onCloseMaps: () => void;
  onStartEncounter: (encounter: Encounter, test: boolean) => void;
  onOpenMaps: () => void;
  onPlanTravel?: () => void;
  onSelectLocation: (locationID: string) => void;
};

type ProfileSectionProps = CampaignWorldLocationDetailProps & {
  allLinks: CampaignLocationLink[];
  journeys: CampaignJourney[];
  linkOpen: boolean;
  parentLocation?: CampaignLocation;
  pricingOpen: boolean;
  profile: LocationProfileInfo;
  setLinkOpen: (open: boolean) => void;
  setPricingOpen: (open: boolean) => void;
  setStockOpen: (open: boolean) => void;
  stockOpen: boolean;
};
