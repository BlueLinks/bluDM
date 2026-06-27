import { ExternalLink, LocateFixed, MapPin, Minus, Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Button, Callout, Checkbox } from "../../../components/ui";
import { formatMapDistance } from "./campaignMapDistance";
import { mapDefaultsForType } from "./campaignWorldMapDefaults";
import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";
import type { PlacementMode } from "./CampaignWorldMaps";

export function CampaignWorldMapCanvas({
  activeMap,
  focusedLocationID,
  loadingPins,
  locationById,
  placementMode,
  pins,
  saving,
  showGrid,
  onNavigateFromPin,
  onCancelPlacement,
  onPlacePin,
  onRemovePin,
  onShowGridChange,
  onStartPlacement,
}: CampaignWorldMapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedPinId, setSelectedPinId] = useState("");
  const grid = mapDefaultsForType(activeMap.mapType);

  useEffect(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setSelectedPinId("");
  }, [activeMap.id]);

  useEffect(() => {
    const pin = pins.find((item) => item.locationId === focusedLocationID);
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!pin || !rect) return;
    const nextZoom = 1.35;
    const nextPan = clampPan(
      {
        x: rect.width / 2 - (pin.x / activeMap.width) * rect.width * nextZoom,
        y: rect.height / 2 - (pin.y / activeMap.height) * rect.height * nextZoom,
      },
      nextZoom,
      rect,
    );
    setZoom(nextZoom);
    setPan(nextPan);
  }, [activeMap.height, activeMap.width, focusedLocationID, pins]);

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function zoomIn() {
    setZoom((value) => {
      const nextZoom = Math.min(MAX_ZOOM, value + 0.25);
      setPan((current) => clampedPan(current, nextZoom));
      return nextZoom;
    });
  }

  function zoomOut() {
    setZoom((value) => {
      const nextZoom = Math.max(MIN_ZOOM, value - 0.25);
      setPan((current) => clampedPan(current, nextZoom));
      return nextZoom;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && placementMode) {
      event.preventDefault();
      onCancelPlacement();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomOut();
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      resetView();
      return;
    }
    if (placementMode) return;
    const panStep = event.shiftKey ? 80 : 32;
    const panKeys: Record<string, { x: number; y: number }> = {
      ArrowDown: { x: 0, y: -panStep },
      ArrowLeft: { x: panStep, y: 0 },
      ArrowRight: { x: -panStep, y: 0 },
      ArrowUp: { x: 0, y: panStep },
    };
    const delta = panKeys[event.key];
    if (!delta) return;
    event.preventDefault();
    setPan((current) => clampedPan({ x: current.x + delta.x, y: current.y + delta.y }, zoom));
  }

  function clampedPan(nextPan: { x: number; y: number }, nextZoom = zoom) {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? clampPan(nextPan, nextZoom, rect) : nextPan;
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!placementMode || !viewportRef.current) {
      setSelectedPinId("");
      return;
    }
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
    setPan(
      clampedPan({
        x: panStart.current.panX + event.clientX - panStart.current.x,
        y: panStart.current.panY + event.clientY - panStart.current.y,
      }),
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      {placementMode ? (
        <Callout>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Click or tap the map to {placementMode.action} this pin. Press Escape or cancel to
              leave placement mode.
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={onCancelPlacement}>
              Cancel placement
            </Button>
          </div>
        </Callout>
      ) : null}
      <div
        ref={viewportRef}
        role="region"
        tabIndex={0}
        aria-label={`Interactive map canvas for ${activeMap.name}. Use arrow keys to pan, plus and minus to zoom, 0 to reset, and Escape to cancel pin placement.`}
        className={[
          "relative w-full min-w-0 touch-none overflow-hidden rounded-lg border border-border bg-muted shadow-inner outline-none focus:ring-2 focus:ring-primary/30",
          placementMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        ].join(" ")}
        style={{ aspectRatio: `${activeMap.width} / ${activeMap.height}` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerCancel={() => (panStart.current = null)}
        onPointerUp={() => (panStart.current = null)}
      >
        <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(18rem,calc(100%-2rem))] rounded-md border border-border bg-card/90 px-3 py-2 shadow backdrop-blur">
          <p className="truncate text-sm font-semibold">{activeMap.name}</p>
          <p className="text-xs text-muted-foreground">{Math.round(zoom * 100)}% zoom</p>
        </div>
        <MapViewControls
          canReset={zoom !== MIN_ZOOM || pan.x !== 0 || pan.y !== 0}
          showGrid={showGrid}
          zoom={zoom}
          onReset={resetView}
          onShowGridChange={onShowGridChange}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
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
              selected={selectedPinId === pin.id}
              onMove={() => onStartPlacement({ locationID: pin.locationId, action: "move" })}
              onNavigate={() => onNavigateFromPin(pin.locationId, activeMap.id)}
              onRemove={() => onRemovePin(pin)}
              onSelect={() => setSelectedPinId((current) => (current === pin.id ? "" : pin.id))}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {saving || loadingPins
          ? "Saving map pins…"
          : "Drag the map background to pan; click a pin for actions."}
      </p>
    </div>
  );
}

function MapViewControls({
  canReset,
  showGrid,
  zoom,
  onReset,
  onShowGridChange,
  onZoomIn,
  onZoomOut,
}: {
  canReset: boolean;
  showGrid: boolean;
  zoom: number;
  onReset: () => void;
  onShowGridChange: (show: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div
      className="absolute bottom-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1 rounded-md border border-border bg-card/90 p-1 shadow backdrop-blur"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Checkbox label="Grid" checked={showGrid} onChange={onShowGridChange} />
      <Button
        aria-label="Zoom out"
        className="h-8 w-8 p-0"
        type="button"
        icon={Minus}
        size="sm"
        variant="secondary"
        disabled={zoom <= MIN_ZOOM}
        onClick={onZoomOut}
      />
      <Button
        aria-label="Zoom in"
        className="h-8 w-8 p-0"
        type="button"
        icon={Plus}
        size="sm"
        variant="secondary"
        disabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      />
      <Button
        aria-label="Reset map view"
        className="h-8 w-8 p-0"
        type="button"
        icon={LocateFixed}
        size="sm"
        variant="secondary"
        disabled={!canReset}
        onClick={onReset}
      />
    </div>
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
    >
      <div className="pointer-events-none absolute inset-3 grid place-items-center rounded-md border border-dashed border-border bg-background/70 p-4 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-semibold">Blank grid map</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeMap.width}×{activeMap.height}px ·{" "}
            {formatMapDistance(activeMap.scaleDistancePerPixel, activeMap.scaleDistanceUnit)} per
            pixel. Use Place pins to anchor locations.
          </p>
        </div>
      </div>
    </div>
  );
}

function MapPinMarker({
  active,
  location,
  map,
  pin,
  selected,
  onMove,
  onNavigate,
  onRemove,
  onSelect,
}: {
  active: boolean;
  location?: CampaignLocation;
  map: CampaignMap;
  pin: CampaignMapPin;
  selected: boolean;
  onMove: () => void;
  onNavigate: () => void;
  onRemove: () => void;
  onSelect: () => void;
}) {
  const label = pin.labelOverride || location?.name || "Pin";
  return (
    <div
      data-map-pin
      className="absolute z-10 -translate-x-1/2 -translate-y-full text-center"
      style={{ left: `${(pin.x / map.width) * 100}%`, top: `${(pin.y / map.height) * 100}%` }}
    >
      <button
        type="button"
        aria-expanded={selected}
        aria-label={`Show map pin actions for ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <span
          className={[
            "mb-1 block rounded-md border bg-card px-2 py-0.5 text-xs font-semibold shadow",
            active || selected ? "border-primary text-primary" : "border-border",
          ].join(" ")}
        >
          {label}
        </span>
        <MapPin
          className={[
            "mx-auto h-7 w-7 drop-shadow",
            active || selected ? "fill-primary text-primary" : "fill-accent text-accent",
          ].join(" ")}
        />
      </button>
      {selected ? (
        <div
          className="absolute left-1/2 top-full z-30 mt-1 grid w-28 -translate-x-1/2 gap-1 rounded-md border border-border bg-card p-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <Button type="button" icon={ExternalLink} size="sm" variant="ghost" onClick={onNavigate}>
            Open
          </Button>
          <Button type="button" icon={MapPin} size="sm" variant="ghost" onClick={onMove}>
            Move
          </Button>
          <Button type="button" icon={Trash2} size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : null}
    </div>
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clampPan(
  pan: { x: number; y: number },
  zoom: number,
  rect: { width: number; height: number },
) {
  const minX = Math.min(0, rect.width - rect.width * zoom);
  const minY = Math.min(0, rect.height - rect.height * zoom);
  return {
    x: clamp(pan.x, minX, 0),
    y: clamp(pan.y, minY, 0),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type CampaignWorldMapCanvasProps = {
  activeMap: CampaignMap;
  focusedLocationID: string;
  loadingPins: boolean;
  locationById: Map<string, CampaignLocation>;
  placementMode: PlacementMode;
  pins: CampaignMapPin[];
  saving: boolean;
  showGrid: boolean;
  onNavigateFromPin: (locationID: string, sourceMapID: string) => void;
  onCancelPlacement: () => void;
  onPlacePin: (x: number, y: number) => Promise<void>;
  onRemovePin: (pin: CampaignMapPin) => void;
  onShowGridChange: (show: boolean) => void;
  onStartPlacement: (mode: PlacementMode) => void;
};
