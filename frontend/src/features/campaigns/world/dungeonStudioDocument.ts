import type { CampaignLocation, CampaignMap, CampaignMapInput } from "./travelTypes";
import type { DungeonStudioCustomAsset } from "./dungeonStudioObjectCatalog";

export type { DungeonStudioCustomAsset } from "./dungeonStudioObjectCatalog";

export type GridCell = { x: number; y: number };
export type DungeonStudioScope = "dungeon" | "floor" | "shop" | "home" | "town" | "custom";
// prettier-ignore
export type DungeonStudioTilesetKey = "dungeon" | "stone" | "cave" | "castle" | "cellar" | "forest" | "sewer" | "house" | "ruins" | "temple" | "crypt" | "shop" | "home" | "town";

export type DungeonStudioGrid = {
  width: number;
  height: number;
  cellSizeFeet: number;
};

export type DungeonStudioCellKind =
  | "floor"
  | "water"
  | "cliff"
  | "chasm"
  | "rubble"
  | "hazard"
  | "road"
  | "grass";

export type DungeonStudioCellLayer = {
  id: string;
  name: string;
  kind: "cells";
  visible: boolean;
  opacity: number;
  cellKind: DungeonStudioCellKind;
  themeKey?: DungeonStudioTilesetKey;
  cells: GridCell[];
};

export type DungeonStudioEdgeDirection = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

export type DungeonStudioEdgeFeature = {
  id: string;
  cell: GridCell;
  direction: DungeonStudioEdgeDirection;
  kind: "wall" | "door" | "secret-door" | "window" | "gate" | "cliff-edge";
  state?: "open" | "closed" | "locked" | "barred" | "hidden";
};

export type DungeonStudioRoomRegion = {
  id: string;
  locationId?: string;
  label: string;
  color: string;
  themeKey?: DungeonStudioTilesetKey;
  cells: GridCell[];
};

export type DungeonStudioEntity = {
  id: string;
  kind: "npc" | "stairs" | "label" | "marker" | "light" | "prop" | "trap";
  cell: GridCell;
  xOffset?: number;
  yOffset?: number;
  rotation?: 0 | 90 | 180 | 270;
  linkedId?: string;
  assetKey?: string;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type DungeonStudioGenerationMetadata = {
  generator: string;
  seed?: string;
  settings?: Record<string, unknown>;
};

export type DungeonStudioDocument = {
  version: 1;
  kind: "dungeon-studio";
  scope: DungeonStudioScope;
  tileset: DungeonStudioTilesetKey;
  grid: DungeonStudioGrid;
  layers: DungeonStudioCellLayer[];
  edges: DungeonStudioEdgeFeature[];
  rooms: DungeonStudioRoomRegion[];
  entities: DungeonStudioEntity[];
  customAssets?: DungeonStudioCustomAsset[];
  generation?: DungeonStudioGenerationMetadata;
};

export const DUNGEON_STUDIO_VERSION = 1;
export const MAX_DUNGEON_STUDIO_GRID_SIZE = 80;
export const DEFAULT_DUNGEON_STUDIO_GRID: DungeonStudioGrid = {
  width: 40,
  height: 30,
  cellSizeFeet: 5,
};

const defaultLayer: DungeonStudioCellLayer = {
  id: "floor",
  name: "Floor",
  kind: "cells",
  visible: true,
  opacity: 1,
  cellKind: "floor",
  cells: [],
};

export function createDungeonStudioDocument({
  scope = "dungeon",
  tileset,
  grid = DEFAULT_DUNGEON_STUDIO_GRID,
}: {
  scope?: DungeonStudioScope;
  tileset?: DungeonStudioTilesetKey;
  grid?: Partial<DungeonStudioGrid>;
} = {}): DungeonStudioDocument {
  const normalizedGrid = normalizeGrid(grid);
  return {
    version: DUNGEON_STUDIO_VERSION,
    kind: "dungeon-studio",
    scope,
    tileset: tileset ?? tilesetForScope(scope),
    grid: normalizedGrid,
    layers: [{ ...defaultLayer, cells: [] }],
    edges: [],
    rooms: [],
    entities: [],
    customAssets: [],
  };
}

export function parseDungeonStudioDocument(
  metadata: Record<string, unknown> | undefined,
  fallback: { scope?: DungeonStudioScope; tileset?: DungeonStudioTilesetKey } = {},
): DungeonStudioDocument {
  const studio = metadata?.studio;
  if (!isRecord(studio) || studio.kind !== "dungeon-studio" || studio.version !== 1) {
    return createDungeonStudioDocument(fallback);
  }
  const scope = parseScope(studio.scope) ?? fallback.scope ?? "dungeon";
  const grid = normalizeGrid(isRecord(studio.grid) ? studio.grid : undefined);
  return {
    version: DUNGEON_STUDIO_VERSION,
    kind: "dungeon-studio",
    scope,
    tileset: parseTileset(studio.tileset) ?? fallback.tileset ?? tilesetForScope(scope),
    grid,
    layers: normalizeCellLayers(studio.layers, grid),
    edges: normalizeEdges(studio.edges, grid),
    rooms: normalizeRooms(studio.rooms, grid),
    entities: normalizeEntities(studio.entities, grid),
    customAssets: normalizeCustomAssets(studio.customAssets),
    generation: isRecord(studio.generation)
      ? {
          generator: stringValue(studio.generation.generator, "unknown"),
          seed: optionalString(studio.generation.seed),
          settings: isRecord(studio.generation.settings) ? studio.generation.settings : undefined,
        }
      : undefined,
  };
}

export function serializeDungeonStudioMetadata(
  metadata: Record<string, unknown> | undefined,
  document: DungeonStudioDocument,
) {
  return {
    ...(metadata ?? {}),
    studio: serializeDungeonStudioDocument(document),
  };
}

export function serializeDungeonStudioDocument(
  document: DungeonStudioDocument,
): DungeonStudioDocument {
  const grid = normalizeGrid(document.grid);
  return {
    version: DUNGEON_STUDIO_VERSION,
    kind: "dungeon-studio",
    scope: parseScope(document.scope) ?? "dungeon",
    tileset: parseTileset(document.tileset) ?? tilesetForScope(document.scope),
    grid,
    layers: normalizeCellLayers(document.layers, grid),
    edges: normalizeEdges(document.edges, grid),
    rooms: normalizeRooms(document.rooms, grid),
    entities: normalizeEntities(document.entities, grid),
    customAssets: normalizeCustomAssets(document.customAssets),
    generation: document.generation,
  };
}

export function isDungeonStudioMap(map: CampaignMap) {
  const studio = map.metadata?.studio;
  return isRecord(studio) && studio.kind === "dungeon-studio";
}

export function studioMapForLocation(maps: CampaignMap[], locationId: string) {
  return maps.find((map) => (map.parentLocationId ?? "") === locationId && isDungeonStudioMap(map));
}

export function studioScopeForLocation(
  location: Pick<CampaignLocation, "locationType">,
): DungeonStudioScope {
  const type = (location.locationType ?? "").toLowerCase();
  if (type === "floor" || type === "level" || type === "dungeon-level") return "floor";
  if (
    type === "dungeon" ||
    type === "lair" ||
    type === "cave" ||
    type === "crypt" ||
    type === "ruins" ||
    type === "temple"
  )
    return "dungeon";
  return "custom";
}

export function dungeonStudioMapInput(
  location: Pick<CampaignLocation, "id" | "name" | "locationType">,
  document = createDungeonStudioDocument({ scope: studioScopeForLocation(location) }),
): CampaignMapInput {
  const width = document.grid.width * 20;
  const height = document.grid.height * 20;
  return {
    parentLocationId: location.id,
    name: `${location.name} Studio Map`,
    description: `Grid-based Dungeon Studio map for ${location.name}.`,
    mapType:
      document.scope === "floor" ? "floor" : document.scope === "dungeon" ? "dungeon" : "custom",
    mode: "blank",
    width,
    height,
    scaleDistancePerPixel: document.grid.cellSizeFeet / 20,
    scaleDistanceUnit: "feet",
    calibrationPixelLength: 20,
    calibrationDistance: document.grid.cellSizeFeet,
    metadata: serializeDungeonStudioMetadata(undefined, document),
  };
}

export function cellKey(cell: GridCell) {
  return `${cell.x},${cell.y}`;
}

export function edgeKey(cell: GridCell, direction: DungeonStudioEdgeDirection) {
  const edge = normalizeEdgeReference(cell, direction);
  return `${edge.cell.x},${edge.cell.y},${edge.direction}`;
}

export function normalizeEdgeReference(cell: GridCell, direction: DungeonStudioEdgeDirection) {
  if (direction === "e") return { cell: { x: cell.x + 1, y: cell.y }, direction: "w" as const };
  if (direction === "s") return { cell: { x: cell.x, y: cell.y + 1 }, direction: "n" as const };
  return { cell, direction };
}

function normalizeGrid(grid?: Partial<DungeonStudioGrid>): DungeonStudioGrid {
  return {
    width: boundedNumber(grid?.width, DEFAULT_DUNGEON_STUDIO_GRID.width),
    height: boundedNumber(grid?.height, DEFAULT_DUNGEON_STUDIO_GRID.height),
    cellSizeFeet: boundedNumber(
      grid?.cellSizeFeet,
      DEFAULT_DUNGEON_STUDIO_GRID.cellSizeFeet,
      1,
      100,
    ),
  };
}

function normalizeCellLayers(value: unknown, grid: DungeonStudioGrid): DungeonStudioCellLayer[] {
  if (!Array.isArray(value)) return [{ ...defaultLayer, cells: [] }];
  const layers = value.flatMap((layer, index): DungeonStudioCellLayer[] => {
    if (!isRecord(layer) || layer.kind !== "cells") return [];
    const cellKind = parseCellKind(layer.cellKind) ?? "floor";
    return [
      {
        id: stringValue(layer.id, `${cellKind}-${index + 1}`),
        name: stringValue(layer.name, titleCase(cellKind)),
        kind: "cells",
        visible: typeof layer.visible === "boolean" ? layer.visible : true,
        opacity: boundedNumber(layer.opacity, 1, 0, 1),
        cellKind,
        themeKey: parseTileset(layer.themeKey),
        cells: normalizeCells(layer.cells, grid),
      },
    ];
  });
  return layers.length ? layers : [{ ...defaultLayer, cells: [] }];
}

function normalizeEdges(value: unknown, grid: DungeonStudioGrid): DungeonStudioEdgeFeature[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((edge, index): DungeonStudioEdgeFeature[] => {
    if (!isRecord(edge) || !isRecord(edge.cell)) return [];
    const direction = parseDirection(edge.direction);
    const kind = parseEdgeKind(edge.kind);
    const cell = normalizeCell(edge.cell, grid);
    if (!direction || !kind || !cell) return [];
    return [
      {
        id: stringValue(edge.id, `edge-${index + 1}`),
        cell,
        direction,
        kind,
        state: parseEdgeState(edge.state),
      },
    ];
  });
}

function normalizeRooms(value: unknown, grid: DungeonStudioGrid): DungeonStudioRoomRegion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((room, index): DungeonStudioRoomRegion[] => {
    if (!isRecord(room)) return [];
    return [
      {
        id: stringValue(room.id, `room-${index + 1}`),
        locationId: optionalString(room.locationId),
        label: stringValue(room.label, `Room ${index + 1}`),
        color: stringValue(room.color, "#14b8a6"),
        themeKey: parseTileset(room.themeKey),
        cells: normalizeCells(room.cells, grid),
      },
    ];
  });
}

function normalizeEntities(value: unknown, grid: DungeonStudioGrid): DungeonStudioEntity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entity, index): DungeonStudioEntity[] => {
    if (!isRecord(entity) || !isRecord(entity.cell)) return [];
    const kind = parseEntityKind(entity.kind);
    const cell = normalizeCell(entity.cell, grid);
    if (!kind || !cell) return [];
    return [
      {
        id: stringValue(entity.id, `entity-${index + 1}`),
        kind,
        cell,
        xOffset: optionalNumber(entity.xOffset),
        yOffset: optionalNumber(entity.yOffset),
        rotation: parseRotation(entity.rotation),
        linkedId: optionalString(entity.linkedId),
        assetKey: optionalString(entity.assetKey),
        label: optionalString(entity.label),
        metadata: isRecord(entity.metadata) ? entity.metadata : undefined,
      },
    ];
  });
}

function normalizeCustomAssets(value: unknown): DungeonStudioCustomAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((asset, index): DungeonStudioCustomAsset[] => {
    if (!isRecord(asset)) return [];
    const dataUrl = optionalString(asset.dataUrl);
    if (!dataUrl?.startsWith("data:image/")) return [];
    return [
      {
        key: stringValue(asset.key, `custom-asset-${index + 1}`),
        label: stringValue(asset.label, `Custom asset ${index + 1}`),
        category: stringValue(asset.category, "custom"),
        dataUrl,
        defaultScale: optionalNumber(asset.defaultScale),
        sourceNotes: optionalString(asset.sourceNotes),
        licenseNotes: optionalString(asset.licenseNotes),
      },
    ];
  });
}

function normalizeCells(value: unknown, grid: DungeonStudioGrid): GridCell[] {
  if (!Array.isArray(value)) return [];
  const byKey = new globalThis.Map<string, GridCell>();
  value.forEach((item) => {
    if (!isRecord(item)) return;
    const cell = normalizeCell(item, grid);
    if (cell) byKey.set(cellKey(cell), cell);
  });
  return [...byKey.values()];
}

function normalizeCell(value: Record<string, unknown>, grid: DungeonStudioGrid): GridCell | null {
  const x = numberValue(value.x);
  const y = numberValue(value.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  return { x, y };
}

function boundedNumber(
  value: unknown,
  fallback: number,
  min = 1,
  max = MAX_DUNGEON_STUDIO_GRID_SIZE,
) {
  const numeric = numberValue(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : Number.NaN;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseScope(value: unknown): DungeonStudioScope | undefined {
  return parseEnum(value, ["dungeon", "floor", "shop", "home", "town", "custom"] as const);
}

function parseTileset(value: unknown): DungeonStudioTilesetKey | undefined {
  return parseEnum(value, [
    "dungeon",
    "stone",
    "cave",
    "castle",
    "cellar",
    "forest",
    "sewer",
    "house",
    "ruins",
    "temple",
    "crypt",
    "shop",
    "home",
    "town",
  ] as const);
}

function parseCellKind(value: unknown): DungeonStudioCellKind | undefined {
  return parseEnum(value, [
    "floor",
    "water",
    "cliff",
    "chasm",
    "rubble",
    "hazard",
    "road",
    "grass",
  ] as const);
}

function parseDirection(value: unknown): DungeonStudioEdgeDirection | undefined {
  return parseEnum(value, ["n", "e", "s", "w", "ne", "nw", "se", "sw"] as const);
}

function parseEdgeKind(value: unknown): DungeonStudioEdgeFeature["kind"] | undefined {
  return parseEnum(value, ["wall", "door", "secret-door", "window", "gate", "cliff-edge"] as const);
}

function parseEdgeState(value: unknown): DungeonStudioEdgeFeature["state"] | undefined {
  return parseEnum(value, ["open", "closed", "locked", "barred", "hidden"] as const);
}

function parseEntityKind(value: unknown): DungeonStudioEntity["kind"] | undefined {
  return parseEnum(value, ["npc", "stairs", "label", "marker", "light", "prop", "trap"] as const);
}

function parseEnum<const T extends string>(value: unknown, options: readonly T[]) {
  return options.includes(String(value) as T) ? (String(value) as T) : undefined;
}

function parseRotation(value: unknown): DungeonStudioEntity["rotation"] | undefined {
  return [0, 90, 180, 270].includes(Number(value))
    ? (Number(value) as DungeonStudioEntity["rotation"])
    : undefined;
}

function tilesetForScope(scope: DungeonStudioScope): DungeonStudioTilesetKey {
  if (scope === "shop") return "shop";
  if (scope === "home") return "home";
  if (scope === "town") return "town";
  return "dungeon";
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1).replaceAll("-", " ");
}
