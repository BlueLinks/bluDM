import { EmptyMini } from "../../../components/ui";
import type { Creature, Encounter, Item } from "../../../types";
import { CampaignWorldLocationDetail } from "./CampaignWorldLocationDetail";
import type { LinkFormInput } from "./CampaignWorldLocationLinks";
import { CampaignWorldMaps } from "./CampaignWorldMaps";
import type { NpcLocationFormInput } from "./CampaignWorldLocationNpcs";
import type { LocationStockFormInput } from "./CampaignWorldLocationStock";
import type {
  CampaignJourney,
  CampaignLocation,
  CampaignLocationLink,
  CampaignLocationStock,
  CampaignMap,
  CampaignNpcLocationLink,
} from "./travelTypes";

export function CampaignWorldLocationWorkspace({
  campaignId,
  childCount,
  childLocations,
  encounters,
  focusedLocationID,
  focusedMapID,
  journeys,
  links,
  linksError,
  linksLoading,
  location,
  locations,
  maps,
  mapsError,
  mapsLoading,
  mapsMode,
  npcLinks,
  npcLinksError,
  npcLinksLoading,
  npcs,
  stock,
  stockError,
  stockItems,
  stockLoading,
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
  onCloseMaps,
  onGenerateEncounter,
  onMapsChanged,
  onNavigateFromPin,
  onOpenMaps,
  onPlanTravel,
  onSelectLocation,
}: CampaignWorldLocationWorkspaceProps) {
  const mapWorkspace = mapsMode ? (
    <LocationMapWorkspace
      campaignId={campaignId}
      childLocations={childLocations}
      focusedLocationID={focusedLocationID}
      focusedMapID={focusedMapID}
      location={location}
      locations={locations}
      maps={maps}
      mapsError={mapsError}
      mapsLoading={mapsLoading}
      onMapsChanged={onMapsChanged}
      onNavigateFromPin={onNavigateFromPin}
      onSelectLocation={onSelectLocation}
    />
  ) : null;

  return (
    <div className="grid min-w-0 gap-4">
      <CampaignWorldLocationDetail
        campaignId={campaignId}
        childCount={childCount}
        childLocations={childLocations}
        links={links}
        linksError={linksError}
        linksLoading={linksLoading}
        location={location}
        locations={locations}
        maps={maps}
        mapsMode={mapsMode}
        mapWorkspace={mapWorkspace}
        journeys={journeys}
        encounters={encounters}
        npcs={npcs}
        npcLinks={npcLinks}
        npcLinksError={npcLinksError}
        npcLinksLoading={npcLinksLoading}
        stock={stock}
        stockItems={stockItems}
        stockError={stockError}
        stockLoading={stockLoading}
        onAddChild={onAddChild}
        onCreateNpc={onCreateNpc}
        onCreateLink={onCreateLink}
        onCreateNpcLink={onCreateNpcLink}
        onCreateStock={onCreateStock}
        onCustomStockItemCreated={onCustomStockItemCreated}
        onDeleteLocation={onDeleteLocation}
        onDeleteLink={onDeleteLink}
        onDeleteNpcLink={onDeleteNpcLink}
        onDeleteStock={onDeleteStock}
        onEdit={onEdit}
        onGenerateEncounter={onGenerateEncounter}
        onCloseMaps={onCloseMaps}
        onOpenMaps={onOpenMaps}
        onPlanTravel={onPlanTravel}
        onSelectLocation={onSelectLocation}
      />
    </div>
  );
}

function LocationMapWorkspace({
  campaignId,
  childLocations,
  focusedLocationID,
  focusedMapID,
  location,
  locations,
  maps,
  mapsError,
  mapsLoading,
  onMapsChanged,
  onNavigateFromPin,
  onSelectLocation,
}: LocationMapWorkspaceProps) {
  return (
    <div className="grid min-w-0 gap-3">
      {mapsError ? <p className="text-sm font-semibold text-destructive">{mapsError}</p> : null}
      {mapsLoading ? (
        <EmptyMini copy="Loading maps…" />
      ) : (
        <CampaignWorldMaps
          campaignId={campaignId}
          childLocations={childLocations}
          currentLocation={location}
          focusedLocationID={focusedLocationID}
          focusedMapID={focusedMapID}
          locations={locations}
          maps={maps}
          onMapsChanged={onMapsChanged}
          onNavigateFromPin={onNavigateFromPin}
          onSelectLocation={onSelectLocation}
        />
      )}
    </div>
  );
}

type CampaignWorldLocationWorkspaceProps = {
  campaignId: string;
  childCount: number;
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  focusedLocationID: string;
  focusedMapID: string;
  journeys: CampaignJourney[];
  links: CampaignLocationLink[];
  linksError: string;
  linksLoading: boolean;
  location: CampaignLocation;
  locations: CampaignLocation[];
  maps: CampaignMap[];
  mapsError: string;
  mapsLoading: boolean;
  mapsMode: boolean;
  npcLinks: CampaignNpcLocationLink[];
  npcLinksError: string;
  npcLinksLoading: boolean;
  npcs: Creature[];
  stock: CampaignLocationStock[];
  stockError: string;
  stockItems: Item[];
  stockLoading: boolean;
  onAddChild: (locationType?: string) => void;
  onCreateLink: (input: LinkFormInput) => Promise<void>;
  onCreateNpc: () => void;
  onCreateNpcLink: (input: NpcLocationFormInput) => Promise<void>;
  onCreateStock: (input: LocationStockFormInput) => Promise<void>;
  onCustomStockItemCreated: (item: Item) => void;
  onDeleteLink: (linkID: string) => Promise<void>;
  onDeleteLocation: () => void;
  onDeleteNpcLink: (linkID: string) => Promise<void>;
  onDeleteStock: (stockID: string) => Promise<void>;
  onEdit: () => void;
  onGenerateEncounter: () => void;
  onMapsChanged: () => Promise<void>;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onCloseMaps: () => void;
  onOpenMaps: () => void;
  onPlanTravel?: () => void;
  onSelectLocation: (locationID: string) => void;
};

type LocationMapWorkspaceProps = {
  campaignId: string;
  childLocations: CampaignLocation[];
  focusedLocationID: string;
  focusedMapID: string;
  location: CampaignLocation;
  locations: CampaignLocation[];
  maps: CampaignMap[];
  mapsError: string;
  mapsLoading: boolean;
  onMapsChanged: () => Promise<void>;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onSelectLocation: (locationID: string) => void;
};
