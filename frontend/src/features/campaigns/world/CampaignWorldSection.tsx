import { Map } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarDetailLayout } from "../../../components/layout";
import { SectionPanel } from "../../../components/ui";
import { api } from "../../../lib/api";
import type { Creature, Encounter, Item } from "../../../types";
import { CampaignWorldLocationEditor, worldLocationPayload } from "./CampaignWorldLocationEditor";
import { CampaignWorldLocationWorkspace } from "./CampaignWorldLocationWorkspace";
import { WorldLocationList } from "./CampaignWorldLocationList";
import { CampaignWorldSearchEmptyState } from "./CampaignWorldSearchEmptyState";
import type { LinkFormInput } from "./CampaignWorldLocationLinks";
import type { NpcLocationFormInput } from "./CampaignWorldLocationNpcs";
import type { LocationStockFormInput } from "./CampaignWorldLocationStock";
import {
  compareLocations,
  DeleteLocationConfirm,
  descendantLocationIDs,
  EmptyWorldLocations,
  FilterHiddenNotice,
  locationMapMarker,
  MissingLocationFallback,
} from "./CampaignWorldSectionHelpers";
import { filterWorldLocations } from "./campaignWorldSearch";
import type {
  CampaignLocation,
  CampaignLocationLink,
  CampaignLocationStock,
  CampaignMap,
  CampaignNpcLocationLink,
} from "./travelTypes";
export function CampaignWorldSection({
  campaignId,
  encounters,
  locations,
  npcs,
  onManageNpcs,
  journeys = [],
  mapsMode = false,
  routeLocationID,
  onChanged,
  onGenerateEncounter,
  onPlanTravel,
}: {
  campaignId: string;
  encounters: Encounter[];
  locations: CampaignLocation[];
  npcs: Creature[];
  journeys?: import("./travelTypes").CampaignJourney[];
  mapsMode?: boolean;
  routeLocationID?: string;
  onManageNpcs: () => void;
  onChanged: () => Promise<void>;
  onGenerateEncounter: (location: CampaignLocation) => void;
  onPlanTravel?: (location: CampaignLocation) => void;
}) {
  const navigate = useNavigate();
  const sortedLocations = useMemo(() => [...locations].sort(compareLocations), [locations]);
  const [selectedID, setSelectedID] = useState(sortedLocations[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampaignLocation | null>(null);
  const [parentID, setParentID] = useState("");
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("settlement");
  const [summary, setSummary] = useState("");
  const [publicNotes, setPublicNotes] = useState("");
  const [dmNotes, setDmNotes] = useState("");
  const [tags, setTags] = useState("");
  const [mapMarker, setMapMarker] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [deleteLocation, setDeleteLocation] = useState<CampaignLocation | null>(null);
  const [links, setLinks] = useState<CampaignLocationLink[]>([]);
  const [npcLinks, setNpcLinks] = useState<CampaignNpcLocationLink[]>([]);
  const [stock, setStock] = useState<CampaignLocationStock[]>([]);
  const [stockItems, setStockItems] = useState<Item[]>([]);
  const [maps, setMaps] = useState<CampaignMap[]>([]);
  const [focusedMapID, setFocusedMapID] = useState("");
  const [focusedLocationID, setFocusedLocationID] = useState("");
  const [linksLoading, setLinksLoading] = useState(false);
  const [npcLinksLoading, setNpcLinksLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [linksError, setLinksError] = useState("");
  const [npcLinksError, setNpcLinksError] = useState("");
  const [stockError, setStockError] = useState("");
  const [mapsError, setMapsError] = useState("");
  const filteredLocations = useMemo(
    () =>
      filterWorldLocations(
        sortedLocations,
        {
          query: searchQuery,
          relationship: "",
          tag: "",
          type: "",
        },
        { encounters, npcLinks, npcs, stock, stockItems },
      ),
    [encounters, npcLinks, npcs, searchQuery, sortedLocations, stock, stockItems],
  );
  const hasActiveFilters = Boolean(searchQuery);
  const effectiveSelectedID = routeLocationID ?? selectedID;
  const selected = routeLocationID
    ? sortedLocations.find((location) => location.id === routeLocationID)
    : (filteredLocations.find((location) => location.id === effectiveSelectedID) ??
      filteredLocations[0]);
  const selectedHiddenByFilters = Boolean(
    selected &&
    hasActiveFilters &&
    !filteredLocations.some((location) => location.id === selected.id),
  );
  const missingRouteLocation = Boolean(routeLocationID && !selected);

  useEffect(() => {
    let active = true;
    setLinksLoading(true);
    setLinksError("");
    api
      .campaignLocationLinks(campaignId)
      .then(({ links: nextLinks }) => {
        if (active) setLinks(nextLinks);
      })
      .catch((err: unknown) => {
        if (active) setLinksError(err instanceof Error ? err.message : "Could not load links");
      })
      .finally(() => {
        if (active) setLinksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);
  useEffect(() => {
    let active = true;
    setStockLoading(true);
    setStockError("");
    Promise.all([
      api.campaignLocationStock(campaignId),
      api.items({ includeStandard: true, includeUser: true }),
    ])
      .then(([stockPayload, itemPayload]) => {
        if (!active) return;
        setStock(stockPayload.stock);
        setStockItems(itemPayload.items);
      })
      .catch((err: unknown) => {
        if (active) setStockError(err instanceof Error ? err.message : "Could not load shop stock");
      })
      .finally(() => {
        if (active) setStockLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);
  useEffect(() => {
    let active = true;
    setNpcLinksLoading(true);
    setNpcLinksError("");
    api
      .campaignNpcLocationLinks(campaignId)
      .then(({ links: nextLinks }) => {
        if (active) setNpcLinks(nextLinks);
      })
      .catch((err: unknown) => {
        if (active)
          setNpcLinksError(err instanceof Error ? err.message : "Could not load NPC links");
      })
      .finally(() => {
        if (active) setNpcLinksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  useEffect(() => {
    void loadMaps();
  }, [campaignId]);

  useEffect(() => {
    if (!routeLocationID && !mapsMode && selected?.id)
      void navigate(`/campaigns/${campaignId}/world/location/${selected.id}`, { replace: true });
  }, [campaignId, mapsMode, navigate, routeLocationID, selected?.id]);
  useEffect(() => {
    if (routeLocationID) return;
    if (!filteredLocations.length) {
      setSelectedID("");
      return;
    }
    if (!filteredLocations.some((location) => location.id === selectedID)) {
      setSelectedID(filteredLocations[0].id);
    }
  }, [filteredLocations, routeLocationID, selectedID]);
  const selectedChildren = selected
    ? sortedLocations.filter((location) => location.parentLocationId === selected.id)
    : [];
  const childCount = selectedChildren.length;
  const selectedEncounterLocationIDs = selected
    ? new Set([selected.id, ...descendantLocationIDs(sortedLocations, selected.id)])
    : new Set<string>();
  const selectedEncounters = selected
    ? encounters.filter((encounter) =>
        encounter.locationId ? selectedEncounterLocationIDs.has(encounter.locationId) : false,
      )
    : [];
  const selectedNpcLinks = selected
    ? npcLinks.filter((link) => link.locationId === selected.id)
    : [];
  const selectedStock = selected ? stock.filter((entry) => entry.locationId === selected.id) : [];
  function openCreate(parent?: CampaignLocation, draftName?: string, defaultLocationType?: string) {
    setEditingLocation(null);
    setParentID(parent?.id ?? "");
    setName(draftName ?? "");
    setLocationType(defaultLocationType ?? (parent ? "room" : "settlement"));
    setSummary("");
    setPublicNotes("");
    setDmNotes("");
    setTags("");
    setMapMarker("");
    setError("");
    setEditorOpen(true);
  }
  function openEdit(location: CampaignLocation) {
    setEditingLocation(location);
    setParentID(location.parentLocationId ?? "");
    setName(location.name);
    setLocationType(location.locationType ?? "custom");
    setSummary(location.summary ?? "");
    setPublicNotes(location.publicNotes || location.notes);
    setDmNotes(location.dmNotes ?? "");
    setTags((location.tags ?? []).join(", "));
    setMapMarker(locationMapMarker(location));
    setError("");
    setEditorOpen(true);
  }
  async function saveLocation(event: FormEvent) {
    event.preventDefault();
    const payload = worldLocationPayload({
      parentID,
      name,
      locationType,
      summary,
      publicNotes,
      dmNotes,
      tags,
      mapMarker,
    });
    if (!payload.name) return;
    setError("");
    try {
      if (editingLocation) {
        await api.updateCampaignLocation(campaignId, editingLocation.id, payload);
      } else {
        await api.createCampaignLocation(campaignId, payload);
      }
      setEditorOpen(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save world location");
    }
  }
  async function createLocationLink(input: LinkFormInput) {
    const { link } = await api.createCampaignLocationLink(campaignId, {
      ...input,
      direction: "bidirectional",
      visibility: "dm",
    });
    setLinks((current) => [...current, link]);
  }
  async function deleteLocationLink(linkID: string) {
    await api.deleteCampaignLocationLink(campaignId, linkID);
    setLinks((current) => current.filter((link) => link.id !== linkID));
  }
  async function createNpcLocationLink(input: NpcLocationFormInput) {
    const { link } = await api.createCampaignNpcLocationLink(campaignId, input);
    setNpcLinks((current) => [...current, link]);
  }
  async function deleteNpcLocationLink(linkID: string) {
    await api.deleteCampaignNpcLocationLink(campaignId, linkID);
    setNpcLinks((current) => current.filter((link) => link.id !== linkID));
  }
  async function createLocationStock(input: LocationStockFormInput) {
    const { stock: savedStock } = await api.upsertCampaignLocationStock(campaignId, input);
    setStock((current) => [...current.filter((entry) => entry.id !== savedStock.id), savedStock]);
  }
  async function deleteLocationStock(stockID: string) {
    await api.deleteCampaignLocationStock(campaignId, stockID);
    setStock((current) => current.filter((entry) => entry.id !== stockID));
  }
  async function confirmDeleteLocation() {
    if (!deleteLocation) return;
    setError("");
    try {
      await api.deleteCampaignLocation(campaignId, deleteLocation.id);
      setDeleteLocation(null);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete world location");
    }
  }
  function clearSearchFilters() {
    setSearchQuery("");
  }
  function selectLocation(locationID: string, { clearFilters = false } = {}) {
    if (clearFilters) clearSearchFilters();
    setFocusedMapID("");
    setFocusedLocationID("");
    setSelectedID(locationID);
    void navigate(`/campaigns/${campaignId}/world/location/${locationID}`);
  }
  function jumpToLocation(locationID: string) {
    selectLocation(locationID, { clearFilters: true });
  }
  function openMapsForLocation(locationID = selected?.id ?? "") {
    if (locationID) setSelectedID(locationID);
    void navigate(`/campaigns/${campaignId}/world/maps`);
  }
  function navigateFromPin(locationID: string, sourceMapID: string) {
    clearSearchFilters();
    const ownMap = maps.find((map) => (map.parentLocationId ?? "") === locationID);
    setFocusedMapID(ownMap?.id ?? sourceMapID);
    setFocusedLocationID(ownMap ? "" : locationID);
    setSelectedID(locationID);
    void navigate(`/campaigns/${campaignId}/world/location/${locationID}`);
  }
  function addCustomStockItem(item: Item) {
    setStockItems((current) => [item, ...current]);
  }
  async function loadMaps() {
    setMapsLoading(true);
    setMapsError("");
    try {
      const { maps: nextMaps } = await api.campaignMaps(campaignId);
      setMaps(nextMaps);
    } catch (err) {
      setMapsError(err instanceof Error ? err.message : "Could not load campaign maps");
    } finally {
      setMapsLoading(false);
    }
  }
  return (
    <SectionPanel title="World" icon={Map} className="lg:col-span-2">
      {sortedLocations.length === 0 ? (
        <EmptyWorldLocations onCreate={() => openCreate()} />
      ) : (
        <div className="grid gap-4">
          {missingRouteLocation ? (
            <MissingLocationFallback campaignId={campaignId} />
          ) : filteredLocations.length === 0 && !selected ? (
            <CampaignWorldSearchEmptyState
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
              onClear={clearSearchFilters}
              onCreate={() => openCreate(undefined, searchQuery)}
            />
          ) : (
            <div className="grid gap-3">
              {selectedHiddenByFilters ? <FilterHiddenNotice onClear={clearSearchFilters} /> : null}
              <SidebarDetailLayout variant="compact">
                <WorldLocationList
                  locations={filteredLocations}
                  query={searchQuery}
                  resultCount={filteredLocations.length}
                  selectedID={selected?.id ?? ""}
                  totalCount={sortedLocations.length}
                  onCreate={() => openCreate()}
                  onQueryChange={setSearchQuery}
                  onSelect={(locationID) => {
                    if (mapsMode) setSelectedID(locationID);
                    else selectLocation(locationID);
                  }}
                />
                {selected && (
                  <CampaignWorldLocationWorkspace
                    campaignId={campaignId}
                    childCount={childCount}
                    childLocations={selectedChildren}
                    encounters={selectedEncounters}
                    links={links}
                    linksError={linksError}
                    linksLoading={linksLoading}
                    focusedLocationID={focusedLocationID}
                    focusedMapID={focusedMapID}
                    location={selected}
                    locations={sortedLocations}
                    maps={maps}
                    mapsError={mapsError}
                    mapsLoading={mapsLoading}
                    mapsMode={mapsMode}
                    journeys={journeys}
                    npcLinks={selectedNpcLinks}
                    npcLinksError={npcLinksError}
                    npcLinksLoading={npcLinksLoading}
                    npcs={npcs}
                    stock={selectedStock}
                    stockError={stockError}
                    stockItems={stockItems}
                    stockLoading={stockLoading}
                    onAddChild={(locationType) => openCreate(selected, undefined, locationType)}
                    onCreateLink={createLocationLink}
                    onCreateNpc={onManageNpcs}
                    onCreateNpcLink={createNpcLocationLink}
                    onCreateStock={createLocationStock}
                    onCustomStockItemCreated={addCustomStockItem}
                    onDeleteLink={deleteLocationLink}
                    onDeleteLocation={() => setDeleteLocation(selected)}
                    onDeleteNpcLink={deleteNpcLocationLink}
                    onDeleteStock={deleteLocationStock}
                    onEdit={() => openEdit(selected)}
                    onGenerateEncounter={() => onGenerateEncounter(selected)}
                    onMapsChanged={loadMaps}
                    onNavigateFromPin={navigateFromPin}
                    onOpenMaps={() => openMapsForLocation(selected.id)}
                    onPlanTravel={() => onPlanTravel?.(selected)}
                    onSelectLocation={jumpToLocation}
                  />
                )}
              </SidebarDetailLayout>
            </div>
          )}
        </div>
      )}
      <CampaignWorldLocationEditor
        editingLocation={editingLocation}
        error={error}
        locationType={locationType}
        mapMarker={mapMarker}
        name={name}
        open={editorOpen}
        parentID={parentID}
        publicNotes={publicNotes}
        summary={summary}
        tags={tags}
        locations={sortedLocations}
        dmNotes={dmNotes}
        onClose={() => setEditorOpen(false)}
        onDmNotesChange={setDmNotes}
        onLocationTypeChange={setLocationType}
        onMapMarkerChange={setMapMarker}
        onNameChange={setName}
        onOpenChange={setEditorOpen}
        onParentIDChange={setParentID}
        onPublicNotesChange={setPublicNotes}
        onSubmit={saveLocation}
        onSummaryChange={setSummary}
        onTagsChange={setTags}
      />
      <DeleteLocationConfirm
        locationName={deleteLocation?.name}
        open={Boolean(deleteLocation)}
        onCancel={() => setDeleteLocation(null)}
        onConfirm={() => void confirmDeleteLocation()}
      />
    </SectionPanel>
  );
}
