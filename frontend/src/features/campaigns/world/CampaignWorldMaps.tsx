import { Map as MapIcon, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Callout, EmptyMini, Select } from "../../../components/ui";
import { api } from "../../../lib/api";
import { formatMapDistance } from "./campaignMapDistance";
import { candidateLocationsForMap } from "./campaignWorldMapUtils";
import { CampaignWorldMapCanvas } from "./CampaignWorldMapCanvas";
import { CampaignWorldMapForm } from "./CampaignWorldMapForm";
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
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [distanceFromId, setDistanceFromId] = useState("");
  const [distanceToId, setDistanceToId] = useState("");
  const [distance, setDistance] = useState<CampaignMapDistance | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
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
      setPins((current) => current.filter((item) => item.id !== pin.id));
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

  async function handleMapSaved(savedMap: CampaignMap) {
    if (formMode === "edit" && activeMap) {
      await resizePinsForUpdatedMap(activeMap, savedMap, pins);
      await refreshPins(savedMap.id);
    }
    setFormMode(null);
    await onMapsChanged();
  }

  async function resizePinsForUpdatedMap(
    previousMap: CampaignMap,
    nextMap: CampaignMap,
    mapPins: CampaignMapPin[],
  ) {
    await Promise.all(
      mapPins.map((pin) => {
        const nextX = relativeCoordinate(pin.x, previousMap.width, nextMap.width);
        const nextY = relativeCoordinate(pin.y, previousMap.height, nextMap.height);
        return api.updateCampaignMapPin(campaignId, nextMap.id, pin.id, {
          locationId: pin.locationId,
          x: nextX,
          y: nextY,
          labelOverride: pin.labelOverride,
          visibility: pin.visibility,
          state: pin.state,
          metadata: pin.metadata,
        });
      }),
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {error ? <Callout tone="danger">{error}</Callout> : null}
      {!activeMap ? (
        <div className="grid min-w-0 gap-3 rounded-md border border-dashed border-border bg-background p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Map tools</p>
              <p className="text-xs text-muted-foreground">
                Create one map for this location, then place relevant child locations on it.
              </p>
            </div>
            <Button
              type="button"
              icon={MapIcon}
              size="sm"
              variant="secondary"
              onClick={() => setFormMode((mode) => (mode === "create" ? null : "create"))}
            >
              {formMode === "create" ? "Close map form" : "Create map"}
            </Button>
          </div>
          {formMode === "create" ? (
            <CampaignWorldMapForm
              campaignId={campaignId}
              currentLocation={currentLocation}
              onError={setError}
              onSaved={handleMapSaved}
            />
          ) : null}
          <EmptyMini copy="Create a map attached to this location, then explicitly place pins for relevant child locations." />
        </div>
      ) : (
        <>
          <ActiveMapToolbar
            activeMap={activeMap}
            editing={formMode === "edit"}
            onEditToggle={() => setFormMode((mode) => (mode === "edit" ? null : "edit"))}
          />
          {formMode === "edit" ? (
            <CampaignWorldMapForm
              campaignId={campaignId}
              currentLocation={currentLocation}
              existingMap={activeMap}
              onError={setError}
              onSaved={handleMapSaved}
            />
          ) : null}
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
    </div>
  );
}

function ActiveMapToolbar({
  activeMap,
  editing,
  onEditToggle,
}: {
  activeMap: CampaignMap;
  editing: boolean;
  onEditToggle: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{activeMap.name}</p>
        <p className="text-xs text-muted-foreground">
          {activeMap.mode === "image" ? "Image map" : "Blank grid"} · {activeMap.width}×
          {activeMap.height}px
        </p>
      </div>
      <Button type="button" icon={MapIcon} size="sm" variant="secondary" onClick={onEditToggle}>
        {editing ? "Close map editor" : "Edit map image"}
      </Button>
    </div>
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
        onRemovePin={onRemovePin}
        onShowGridChange={onShowGridChange}
        onStartPlacement={onStartPlacement}
      />
      <aside className="grid min-w-0 content-start gap-3">
        <PinPlacementList
          candidates={candidateLocations}
          placementMode={placementMode}
          pins={pins}
          onStartPlacement={onStartPlacement}
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

function relativeCoordinate(value: number, previousSize: number, nextSize: number) {
  if (previousSize <= 0) return clamp(value, 0, nextSize);
  return clamp((value / previousSize) * nextSize, 0, nextSize);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
