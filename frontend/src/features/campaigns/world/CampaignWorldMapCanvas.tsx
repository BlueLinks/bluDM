import { LocateFixed, MapPin, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ActionRow } from "../../../components/layout";
import { Button, Callout, Checkbox, Select } from "../../../components/ui";
import { mapDefaultsForType } from "./campaignWorldMapDefaults";
import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";
import type { PlacementMode } from "./CampaignWorldMaps";

export function CampaignWorldMapCanvas({
  activeMap,
  availableMaps,
  focusedLocationID,
  loadingPins,
  locationById,
  placementMode,
  pins,
  saving,
  showGrid,
  onMapChange,
  onNavigateFromPin,
  onPlacePin,
  onShowGridChange,
}: CampaignWorldMapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const grid = mapDefaultsForType(activeMap.mapType);

  useEffect(() => {
    const pin = pins.find((item) => item.locationId === focusedLocationID);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!pin || !rect) return;
    const nextZoom = Math.max(zoom, 1.35);
    setZoom(nextZoom);
    setPan({
      x: rect.width / 2 - (pin.x / activeMap.width) * rect.width * nextZoom,
      y: rect.height / 2 - (pin.y / activeMap.height) * rect.height * nextZoom,
    });
  }, [activeMap.height, activeMap.width, focusedLocationID, pins, zoom]);

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!placementMode || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left - pan.x) / zoom / rect.width) * activeMap.width;
    const y = ((event.clientY - rect.top - pan.y) / zoom / rect.height) * activeMap.height;
    void onPlacePin(clamp(x, 0, activeMap.width), clamp(y, 0, activeMap.height));
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    if (placementMode || (event.target as HTMLElement).closest("[data-map-pin]")) return;
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!panStart.current) return;
    setPan({
      x: panStart.current.panX + event.clientX - panStart.current.x,
      y: panStart.current.panY + event.clientY - panStart.current.y,
    });
  }

  return (
    <div className="grid min-w-0 gap-3">
      <ActionRow justify="between">
        <Select
          value={activeMap.id}
          placeholder="Select map"
          options={availableMaps.map((map) => ({ value: map.id, label: map.name }))}
          onValueChange={onMapChange}
        />
        <MapViewControls
          showGrid={showGrid}
          onReset={resetView}
          onShowGridChange={onShowGridChange}
          onZoomIn={() => setZoom((value) => Math.min(3, value + 0.25))}
          onZoomOut={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        />
      </ActionRow>
      {placementMode ? (
        <Callout>
          Click the map to {placementMode.action} this pin. Pan is disabled until placement is
          complete.
        </Callout>
      ) : null}
      <div
        ref={viewportRef}
        className="relative w-full min-w-0 overflow-hidden rounded-lg border border-border bg-muted shadow-inner"
        style={{ aspectRatio: `${activeMap.width} / ${activeMap.height}` }}
        onClick={handleClick}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={() => (panStart.current = null)}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <MapBackground
            activeMap={activeMap}
            gridMajorEvery={grid.gridMajorEvery}
            showGrid={showGrid}
          />
          {pins.map((pin) => (
            <MapPinMarker
              active={
                pin.locationId === focusedLocationID || pin.locationId === placementMode?.locationID
              }
              key={pin.id}
              location={locationById.get(pin.locationId)}
              map={activeMap}
              pin={pin}
              onNavigate={() => onNavigateFromPin(pin.locationId, activeMap.id)}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag the map background to pan. Use explicit Place or Move buttons before changing pin
        coordinates. {saving || loadingPins ? "Saving map pins…" : null}
      </p>
    </div>
  );
}

function MapViewControls({
  showGrid,
  onReset,
  onShowGridChange,
  onZoomIn,
  onZoomOut,
}: {
  showGrid: boolean;
  onReset: () => void;
  onShowGridChange: (show: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <ActionRow justify="end">
      <Checkbox label="Grid" checked={showGrid} onChange={onShowGridChange} />
      <Button type="button" icon={Minus} size="sm" variant="secondary" onClick={onZoomOut}>
        Zoom out
      </Button>
      <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onZoomIn}>
        Zoom in
      </Button>
      <Button type="button" icon={LocateFixed} size="sm" variant="secondary" onClick={onReset}>
        Reset
      </Button>
    </ActionRow>
  );
}

function MapBackground({
  activeMap,
  gridMajorEvery,
  showGrid,
}: {
  activeMap: CampaignMap;
  gridMajorEvery: number;
  showGrid: boolean;
}) {
  if (activeMap.imageUrl) {
    return (
      <img className="absolute inset-0 h-full w-full object-fill" src={activeMap.imageUrl} alt="" />
    );
  }
  return (
    <div
      className="absolute inset-0 bg-background"
      style={showGrid ? blankGridStyle(gridMajorEvery) : undefined}
    />
  );
}

function MapPinMarker({
  active,
  location,
  map,
  pin,
  onNavigate,
}: {
  active: boolean;
  location?: CampaignLocation;
  map: CampaignMap;
  pin: CampaignMapPin;
  onNavigate: () => void;
}) {
  return (
    <button
      data-map-pin
      type="button"
      className="absolute z-10 -translate-x-1/2 -translate-y-full text-center"
      style={{ left: `${(pin.x / map.width) * 100}%`, top: `${(pin.y / map.height) * 100}%` }}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate();
      }}
    >
      <span
        className={[
          "mb-1 block rounded-md border bg-card px-2 py-0.5 text-xs font-semibold shadow",
          active ? "border-primary text-primary" : "border-border",
        ].join(" ")}
      >
        {pin.labelOverride || location?.name || "Pin"}
      </span>
      <MapPin
        className={[
          "mx-auto h-7 w-7 drop-shadow",
          active ? "fill-primary text-primary" : "fill-accent text-accent",
        ].join(" ")}
      />
    </button>
  );
}

function blankGridStyle(majorEvery: number) {
  const minor = `${Math.max(1, majorEvery / 5)}px ${Math.max(1, majorEvery / 5)}px`;
  const major = `${majorEvery}px ${majorEvery}px`;
  return {
    backgroundImage:
      "linear-gradient(hsl(var(--border) / 0.7) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.7) 1px, transparent 1px), linear-gradient(hsl(var(--accent) / 0.22) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent) / 0.22) 1px, transparent 1px)",
    backgroundSize: `${minor}, ${minor}, ${major}, ${major}`,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type CampaignWorldMapCanvasProps = {
  activeMap: CampaignMap;
  availableMaps: CampaignMap[];
  focusedLocationID: string;
  loadingPins: boolean;
  locationById: Map<string, CampaignLocation>;
  placementMode: PlacementMode;
  pins: CampaignMapPin[];
  saving: boolean;
  showGrid: boolean;
  onMapChange: (mapID: string) => void;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onPlacePin: (x: number, y: number) => Promise<void>;
  onShowGridChange: (show: boolean) => void;
};
