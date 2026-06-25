import { Map as MapIcon, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button, Callout, EmptyMini, Select } from "../../../components/ui";
import { api } from "../../../lib/api";
import { formatMapDistance } from "./campaignMapDistance";
import {
  candidateLocationsForMap,
  summarizePins,
  type MapPinSummary,
} from "./campaignWorldMapUtils";
import { CampaignWorldMapCanvas } from "./CampaignWorldMapCanvas";
import { CampaignWorldMapForm } from "./CampaignWorldMapForm";
import { CampaignWorldMapSelectionList } from "./CampaignWorldMapSelectionList";
import { CampaignWorldPinnedLocations } from "./CampaignWorldPinnedLocations";
import { PinPlacementList } from "./CampaignWorldPinPlacementList";
import type {
  CampaignLocation,
  CampaignMap,
  CampaignMapDistance,
  CampaignMapPin,
} from "./travelTypes";

export type PlacementMode = { locationID: string; action: "place" | "move" } | null;

export function CampaignWorldMaps({
  campaignId,
  childLocations,
  currentLocation,
  focusedLocationID,
  focusedMapID,
  locations,
  maps,
  onMapsChanged,
  onNavigateFromPin,
}: {
  campaignId: string;
  childLocations: CampaignLocation[];
  currentLocation: CampaignLocation;
  focusedLocationID: string;
  focusedMapID: string;
  locations: CampaignLocation[];
  maps: CampaignMap[];
  onMapsChanged: () => Promise<void>;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onSelectLocation: (locationID: string) => void;
}) {
  const [activeMapId, setActiveMapId] = useState("");
  const [pins, setPins] = useState<CampaignMapPin[]>([]);
  const [pinSummaries, setPinSummaries] = useState<Record<string, MapPinSummary>>({});
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [distanceFromId, setDistanceFromId] = useState("");
  const [distanceToId, setDistanceToId] = useState("");
  const [distance, setDistance] = useState<CampaignMapDistance | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [loadingPins, setLoadingPins] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const attachedMaps = useMemo(
    () => maps.filter((map) => (map.parentLocationId ?? "") === currentLocation.id),
    [currentLocation.id, maps],
  );
  const rootMaps = useMemo(() => maps.filter((map) => !(map.parentLocationId ?? "")), [maps]);
  const focusedMap = useMemo(
    () => maps.find((map) => map.id === focusedMapID),
    [focusedMapID, maps],
  );
  const parentMaps = useMemo(
    () =>
      maps.filter(
        (map) => (map.parentLocationId ?? "") === (currentLocation.parentLocationId ?? ""),
      ),
    [currentLocation.parentLocationId, maps],
  );
  const availableMaps = useMemo(
    () => (attachedMaps.length ? attachedMaps : focusedMap ? [focusedMap] : rootMaps),
    [attachedMaps, focusedMap, rootMaps],
  );
  const activeMap = availableMaps.find((map) => map.id === activeMapId) ?? availableMaps[0];

  useEffect(() => {
    if (focusedMapID && availableMaps.some((map) => map.id === focusedMapID)) {
      setActiveMapId(focusedMapID);
      return;
    }
    if (activeMap && activeMap.id !== activeMapId) setActiveMapId(activeMap.id);
    if (!activeMap) setActiveMapId("");
  }, [activeMap, activeMapId, availableMaps, focusedMapID]);

  useEffect(() => {
    if (!activeMap) {
      setPins([]);
      return;
    }
    let active = true;
    setPins([]);
    setPlacementMode(null);
    setDistance(null);
    setDistanceFromId("");
    setDistanceToId("");
    setLoadingPins(true);
    setError("");
    api
      .campaignMapPins(campaignId, activeMap.id)
      .then(({ pins: nextPins }) => {
        if (!active) return;
        setPins(nextPins);
        setPinSummaries((current) => ({
          ...current,
          [activeMap.id]: summarizePins(nextPins),
        }));
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load map pins");
      })
      .finally(() => {
        if (active) setLoadingPins(false);
      });
    return () => {
      active = false;
    };
  }, [activeMap?.id, campaignId]);

  useEffect(() => {
    if (!availableMaps.length) {
      setPinSummaries({});
      return;
    }
    let active = true;
    Promise.all(
      availableMaps.map((map) =>
        api
          .campaignMapPins(campaignId, map.id)
          .then(({ pins: mapPins }) => [map.id, summarizePins(mapPins)] as const),
      ),
    )
      .then((entries) => {
        if (active) setPinSummaries(Object.fromEntries(entries));
      })
      .catch((err: unknown) => {
        if (active)
          setError(err instanceof Error ? err.message : "Could not load map pin summaries");
      });
    return () => {
      active = false;
    };
  }, [availableMaps, campaignId]);

  const candidateLocations = useMemo(() => {
    if (!activeMap) return childLocations;
    return candidateLocationsForMap(activeMap, locations);
  }, [activeMap, childLocations, locations]);
  const locationById = useMemo(
    () => new globalThis.Map(locations.map((location) => [location.id, location])),
    [locations],
  );
  const pinnedOptions = pinOptions(pins, locationById);

  async function refreshPins(mapId = activeMap?.id) {
    if (!mapId) return;
    const { pins: nextPins } = await api.campaignMapPins(campaignId, mapId);
    setPins(nextPins);
    setPinSummaries((current) => ({ ...current, [mapId]: summarizePins(nextPins) }));
  }

  async function placePin(x: number, y: number) {
    if (!activeMap || !placementMode) return;
    const existing = pins.find((pin) => pin.locationId === placementMode.locationID);
    setSaving(true);
    setError("");
    try {
      const payload = {
        locationId: placementMode.locationID,
        x,
        y,
        visibility: "dm",
        state: "active",
      };
      if (existing) await api.updateCampaignMapPin(campaignId, activeMap.id, existing.id, payload);
      else await api.createCampaignMapPin(campaignId, activeMap.id, payload);
      setPlacementMode(null);
      await refreshPins(activeMap.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place map pin");
    } finally {
      setSaving(false);
    }
  }

  async function removePin(pin: CampaignMapPin) {
    if (!activeMap) return;
    setSaving(true);
    setError("");
    try {
      await api.deleteCampaignMapPin(campaignId, activeMap.id, pin.id);
      setPins((current) => {
        const nextPins = current.filter((item) => item.id !== pin.id);
        setPinSummaries((summaries) => ({
          ...summaries,
          [activeMap.id]: summarizePins(nextPins),
        }));
        return nextPins;
      });
      setDistance(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove map pin");
    } finally {
      setSaving(false);
    }
  }

  async function calculateDistance() {
    if (!activeMap || !distanceFromId || !distanceToId || distanceFromId === distanceToId) return;
    setError("");
    try {
      const payload = await api.campaignMapDistance(
        campaignId,
        activeMap.id,
        distanceFromId,
        distanceToId,
      );
      setDistance(payload.distance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate map distance");
    }
  }

  return (
    <CardSection className="grid min-w-0 gap-4 p-4" tone="card">
      <SectionHeader
        icon={MapIcon}
        meta={`${attachedMaps.length} attached ${attachedMaps.length === 1 ? "map" : "maps"}`}
        title="Location map"
        action={
          <Button
            type="button"
            icon={MapIcon}
            size="sm"
            variant="secondary"
            onClick={() => setFormOpen((open) => !open)}
          >
            {formOpen ? "Close map form" : "Create map"}
          </Button>
        }
      />
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <ParentPinSummary currentLocation={currentLocation} maps={parentMaps} />
      {formOpen ? (
        <CampaignWorldMapForm
          campaignId={campaignId}
          currentLocation={currentLocation}
          onCreated={async () => {
            setFormOpen(false);
            await onMapsChanged();
          }}
          onError={setError}
        />
      ) : null}
      {!activeMap ? (
        <EmptyMini copy="Create a map attached to this location, then explicitly place pins for relevant child locations." />
      ) : (
        <>
          <CampaignWorldMapSelectionList
            activeMap={activeMap}
            availableMaps={availableMaps}
            currentLocation={currentLocation}
            locations={locations}
            pinSummaries={pinSummaries}
            onMapChange={setActiveMapId}
          />
          <ActiveMapWorkspace
            activeMap={activeMap}
            candidateLocations={candidateLocations}
            distance={distance}
            distanceFromId={distanceFromId}
            distanceToId={distanceToId}
            focusedLocationID={focusedLocationID}
            loadingPins={loadingPins}
            locationById={locationById}
            placementMode={placementMode}
            pinnedLocationOptions={pinnedOptions}
            pins={pins}
            saving={saving}
            showGrid={showGrid}
            onCalculateDistance={calculateDistance}
            onDistanceFromChange={setDistanceFromId}
            onDistanceToChange={setDistanceToId}
            onNavigateFromPin={onNavigateFromPin}
            onCancelPlacement={() => setPlacementMode(null)}
            onPlacePin={placePin}
            onRemovePin={removePin}
            onShowGridChange={setShowGrid}
            onStartPlacement={setPlacementMode}
          />
        </>
      )}
    </CardSection>
  );
}

function ActiveMapWorkspace({
  activeMap,
  candidateLocations,
  distance,
  distanceFromId,
  distanceToId,
  focusedLocationID,
  loadingPins,
  locationById,
  placementMode,
  pinnedLocationOptions,
  pins,
  saving,
  showGrid,
  onCalculateDistance,
  onDistanceFromChange,
  onDistanceToChange,
  onNavigateFromPin,
  onCancelPlacement,
  onPlacePin,
  onRemovePin,
  onShowGridChange,
  onStartPlacement,
}: ActiveMapWorkspaceProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
      <CampaignWorldMapCanvas
        activeMap={activeMap}
        focusedLocationID={focusedLocationID}
        loadingPins={loadingPins}
        locationById={locationById}
        placementMode={placementMode}
        pins={pins}
        saving={saving}
        showGrid={showGrid}
        onNavigateFromPin={onNavigateFromPin}
        onCancelPlacement={onCancelPlacement}
        onPlacePin={onPlacePin}
        onShowGridChange={onShowGridChange}
      />
      <aside className="grid min-w-0 content-start gap-3">
        <PinPlacementList
          candidates={candidateLocations}
          placementMode={placementMode}
          pins={pins}
          onStartPlacement={onStartPlacement}
        />
        <CampaignWorldPinnedLocations
          pins={pins}
          locationById={locationById}
          map={activeMap}
          onRemove={onRemovePin}
          onSelectLocation={(locationID) => onNavigateFromPin(locationID, activeMap.id)}
        />
        <DistancePanel
          distance={distance}
          distanceFromId={distanceFromId}
          distanceToId={distanceToId}
          options={pinnedLocationOptions}
          onCalculateDistance={onCalculateDistance}
          onDistanceFromChange={onDistanceFromChange}
          onDistanceToChange={onDistanceToChange}
        />
      </aside>
    </div>
  );
}

function DistancePanel({
  distance,
  distanceFromId,
  distanceToId,
  options,
  onCalculateDistance,
  onDistanceFromChange,
  onDistanceToChange,
}: {
  distance: CampaignMapDistance | null;
  distanceFromId: string;
  distanceToId: string;
  options: Array<{ value: string; label: string }>;
  onCalculateDistance: () => Promise<void>;
  onDistanceFromChange: (locationID: string) => void;
  onDistanceToChange: (locationID: string) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Ruler className="h-4 w-4 text-accent" /> Distance
      </div>
      <Select
        value={distanceFromId}
        placeholder="From"
        options={options}
        onValueChange={onDistanceFromChange}
      />
      <Select
        value={distanceToId}
        placeholder="To"
        options={options}
        onValueChange={onDistanceToChange}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={!distanceFromId || !distanceToId || distanceFromId === distanceToId}
        onClick={() => void onCalculateDistance()}
      >
        Calculate straight-line distance
      </Button>
      {distance ? (
        <p className="text-sm text-muted-foreground">
          {formatMapDistance(distance.distance, distance.distanceUnit)} (
          {distance.pixelDistance.toFixed(1)} px). Travel calculator uses{" "}
          {distance.travelDistance.toFixed(2)} {distance.travelDistanceUnit}.
        </p>
      ) : null}
    </div>
  );
}

function ParentPinSummary({
  currentLocation,
  maps,
}: {
  currentLocation: CampaignLocation;
  maps: CampaignMap[];
}) {
  if (!currentLocation.parentLocationId) return null;
  return (
    <p className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
      Parent map status: {maps.length} parent-level {maps.length === 1 ? "map can" : "maps can"} pin
      or move {currentLocation.name}. Open the parent location if this space needs a regional or
      floor-level pin.
    </p>
  );
}

function pinOptions(pins: CampaignMapPin[], locationById: Map<string, CampaignLocation>) {
  return pins.map((pin) => {
    const location = locationById.get(pin.locationId);
    return {
      value: pin.locationId,
      label: pin.labelOverride || location?.name || "Pinned location",
    };
  });
}

type ActiveMapWorkspaceProps = {
  activeMap: CampaignMap;
  candidateLocations: CampaignLocation[];
  distance: CampaignMapDistance | null;
  distanceFromId: string;
  distanceToId: string;
  focusedLocationID: string;
  loadingPins: boolean;
  locationById: Map<string, CampaignLocation>;
  placementMode: PlacementMode;
  pinnedLocationOptions: Array<{ value: string; label: string }>;
  pins: CampaignMapPin[];
  saving: boolean;
  showGrid: boolean;
  onCalculateDistance: () => Promise<void>;
  onDistanceFromChange: (locationID: string) => void;
  onDistanceToChange: (locationID: string) => void;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onCancelPlacement: () => void;
  onPlacePin: (x: number, y: number) => Promise<void>;
  onRemovePin: (pin: CampaignMapPin) => void;
  onShowGridChange: (show: boolean) => void;
  onStartPlacement: (mode: PlacementMode) => void;
};
