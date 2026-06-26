import { Plus } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Creature, Encounter, Item } from "../../../types";
import { childPrepChipsFor, childPrepIssueSummariesFor } from "./CampaignWorldChildPrepChips";
import { CampaignWorldLocationEncounters } from "./CampaignWorldLocationEncounters";
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
  journeyInvolvesLocation,
  LocationMapCard,
  LocationNotesCard,
  PricingSummaryCard,
  StructureSummaryCard,
  travelLikeLinks,
} from "./CampaignWorldLocationProfileCards";
import { PrepOverviewCard } from "./CampaignWorldPrepOverviewCard";
import { sectionOrder } from "./CampaignWorldLocationSectionOrder";
import {
  defaultTypeForProfileAction,
  labelForProfileAction,
  locationProfile,
  type LocationProfileInfo,
} from "./locationProfiles";
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
  onDeleteLocation,
  onDeleteLink,
  onDeleteNpcLink,
  onDeleteStock,
  onEdit,
  onGenerateEncounter,
  onOpenMaps,
  onPlanTravel,
  onSelectLocation,
}: CampaignWorldLocationDetailProps) {
  const profile = locationProfile(location);
  const [stockOpen, setStockOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const parentLocation = parentFor(location, locations);
  const selectedLinks = links.filter(
    (link) => link.sourceLocationId === location.id || link.targetLocationId === location.id,
  );
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
    onDeleteLink,
    onDeleteLocation,
    onDeleteNpcLink,
    onDeleteStock,
    onEdit,
    onGenerateEncounter,
    onOpenMaps,
    onPlanTravel,
    onSelectLocation,
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
        onGenerateEncounter={onGenerateEncounter}
        onLinkExit={() => setLinkOpen(true)}
        onOpenMaps={onOpenMaps}
        onSelectLocation={onSelectLocation}
        onStockOpen={() => setStockOpen(true)}
      />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">{sectionOrder(profile, sections)}</div>
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
  const shouldShowEncounters =
    profile.variant === "dungeon" ||
    profile.variant === "floor" ||
    profile.profile === "room" ||
    encounters.length > 0;
  const shouldShowLinks = profile.profile !== "shop" || links.length > 0 || linkOpen;
  const showChildPrep = profile.variant === "dungeon" || profile.variant === "floor";
  const prepChipsByLocationId = showChildPrep
    ? Object.fromEntries(
        childLocations.map((child) => [
          child.id,
          childPrepChipsFor({ child, encounters, links: allLinks, locations, maps }),
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
      })
    : undefined;

  return {
    childCard: shouldShowChildren ? (
      <ChildLocationsCard
        childLocations={childLocations}
        emptyCopy={profile.childEmpty}
        prepChipsByLocationId={prepChipsByLocationId}
        prepSummaryChips={prepSummaryChips}
        title={profile.childTitle}
        action={<ChildLocationActions profile={profile} onAddChild={props.onAddChild} />}
        onSelectLocation={onSelectLocation}
      />
    ) : null,
    encountersCard: shouldShowEncounters ? (
      <CampaignWorldLocationEncounters
        actionLabel={explorationProfile(profile) ? "Add encounter" : undefined}
        campaignId={campaignId}
        encounters={encounters}
        onAddEncounter={
          explorationProfile(profile) && profile.profile !== "room"
            ? props.onGenerateEncounter
            : undefined
        }
      />
    ) : null,
    linksCard: shouldShowLinks ? (
      <>
        {linksError ? <p className="text-sm font-semibold text-destructive">{linksError}</p> : null}
        <CampaignWorldLocationLinks
          actionLabel={explorationProfile(profile) ? "Link exit" : undefined}
          defaultLinkType={explorationProfile(profile) ? "passage" : undefined}
          emptyCopy={
            explorationProfile(profile)
              ? "No exits, doors, stairs, or linked rooms yet."
              : undefined
          }
          links={links}
          loading={linksLoading}
          location={location}
          locations={locations}
          open={linkOpen}
          title={explorationProfile(profile) ? "Exits and linked locations" : undefined}
          onCreate={onCreateLink}
          onDelete={onDeleteLink}
          onOpenChange={setLinkOpen}
          onSelectLocation={onSelectLocation}
        />
      </>
    ) : null,
    mapCard: (
      <LocationMapCard
        childLocations={childLocations}
        compact={profile.compactMap}
        location={location}
        maps={maps}
        profile={profile}
        onOpenMaps={onOpenMaps}
      />
    ),
    notesCard: <LocationNotesCard location={location} title={profile.notesTitle} />,
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
        encounters={encounters}
        links={links}
        location={location}
        maps={maps}
        showEncounterAction={profile.profile !== "room"}
        showRoomNextSteps={profile.profile === "room"}
        onAddEncounter={props.onGenerateEncounter}
        onEditNotes={profile.profile === "room" ? props.onEdit : undefined}
        onLinkExit={profile.profile === "room" ? () => setLinkOpen(true) : undefined}
        onOpenMaps={profile.profile === "room" ? onOpenMaps : undefined}
      />
    ) : null,
    parentCard:
      profile.profile === "shop" || profile.profile === "room" ? (
        <ParentContextCard parent={parentLocation} onSelectLocation={onSelectLocation} />
      ) : null,
    pricingCard: profile.profile === "shop" ? <PricingSummaryCard stock={stock} /> : null,
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
    structureCard:
      profile.variant === "dungeon" ? (
        <StructureSummaryCard
          childLocations={childLocations}
          encounters={encounters}
          links={links}
          onSelectLocation={onSelectLocation}
        />
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

function ChildLocationActions({
  profile,
  onAddChild,
}: {
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
}) {
  const childActions = profile.primaryActions.filter((action) =>
    ["add-town", "add-landmark", "add-building", "add-shop", "add-floor", "add-room"].includes(
      action,
    ),
  );
  if (!childActions.length) return null;
  return (
    <ActionRow justify="end">
      {childActions.map((action) => (
        <Button
          key={action}
          type="button"
          icon={Plus}
          size="sm"
          variant="secondary"
          onClick={() => onAddChild(defaultTypeForProfileAction(action))}
        >
          {labelForProfileAction(action)}
        </Button>
      ))}
    </ActionRow>
  );
}

function explorationProfile(profile: LocationProfileInfo) {
  return profile.profile === "room" || profile.variant === "dungeon" || profile.variant === "floor";
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
  onEdit: () => void;
  onGenerateEncounter: () => void;
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
