import {
  addOuterWallsAroundFloorCells,
  paintFloorCells,
  placeObjectEntity,
} from "./dungeonStudioEditing";
import {
  createDungeonStudioDocument,
  type DungeonStudioDocument,
  type DungeonStudioTilesetKey,
  type GridCell,
} from "./dungeonStudioDocument";

export type DungeonStudioGeneratorType = "classic" | "cave";

export type DungeonStudioGeneratorSettings = {
  type: DungeonStudioGeneratorType;
  seed: string;
  tileset: DungeonStudioTilesetKey;
  width: number;
  height: number;
  roomCount: number;
  density: number;
  createRooms: boolean;
  addFurniture: boolean;
  addStairs: boolean;
};

export const defaultDungeonStudioGeneratorSettings: DungeonStudioGeneratorSettings = {
  type: "classic",
  seed: "bludm-dungeon",
  tileset: "dungeon",
  width: 40,
  height: 30,
  roomCount: 8,
  density: 45,
  createRooms: true,
  addFurniture: true,
  addStairs: true,
};

export function generateDungeonStudioDocument(settings: DungeonStudioGeneratorSettings) {
  const rng = seededRandom(settings.seed || "bludm-dungeon");
  const document = createDungeonStudioDocument({
    tileset: settings.tileset,
    grid: { width: settings.width, height: settings.height },
  });
  const generated =
    settings.type === "cave"
      ? generateCave(document, settings, rng)
      : generateClassic(document, settings, rng);
  return {
    ...generated,
    generation: {
      generator: settings.type,
      seed: settings.seed,
      settings: { ...settings },
    },
  } satisfies DungeonStudioDocument;
}

function generateClassic(
  document: DungeonStudioDocument,
  settings: DungeonStudioGeneratorSettings,
  rng: () => number,
) {
  const rooms: Array<{ x: number; y: number; width: number; height: number; cells: GridCell[] }> =
    [];
  let current = document;
  for (
    let attempt = 0;
    attempt < settings.roomCount * 8 && rooms.length < settings.roomCount;
    attempt += 1
  ) {
    const width = randInt(rng, 4, 9);
    const height = randInt(rng, 4, 8);
    const x = randInt(rng, 1, Math.max(2, settings.width - width - 2));
    const y = randInt(rng, 1, Math.max(2, settings.height - height - 2));
    const candidate = rectangleCells(x, y, width, height);
    if (rooms.some((room) => rectanglesOverlap(room, { x, y, width, height }))) continue;
    rooms.push({ x, y, width, height, cells: candidate });
    current = paintFloorCells(current, candidate);
  }
  for (let index = 1; index < rooms.length; index += 1) {
    current = paintFloorCells(
      current,
      corridorCells(centerOf(rooms[index - 1]), centerOf(rooms[index])),
    );
  }
  current = addOuterWallsAroundFloorCells(current);
  if (settings.createRooms) {
    current = {
      ...current,
      rooms: rooms.map((room, index) => ({
        id: `generated-room-${index + 1}`,
        label: `Room ${index + 1}`,
        color: roomColor(index),
        cells: room.cells,
      })),
    };
  }
  return dressGeneratedMap(
    current,
    settings,
    rooms.map((room) => centerOf(room)),
    rng,
  );
}

function generateCave(
  document: DungeonStudioDocument,
  settings: DungeonStudioGeneratorSettings,
  rng: () => number,
) {
  let open = new Set<string>();
  for (let y = 1; y < settings.height - 1; y += 1) {
    for (let x = 1; x < settings.width - 1; x += 1) {
      if (rng() * 100 < settings.density) open.add(`${x},${y}`);
    }
  }
  for (let step = 0; step < 4; step += 1) {
    const next = new Set<string>();
    for (let y = 1; y < settings.height - 1; y += 1) {
      for (let x = 1; x < settings.width - 1; x += 1) {
        const neighbors = neighborOpenCount(open, x, y);
        if (neighbors >= 5 || (open.has(`${x},${y}`) && neighbors >= 4)) next.add(`${x},${y}`);
      }
    }
    open = next;
  }
  const cells = [...open].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
  let current = addOuterWallsAroundFloorCells(paintFloorCells(document, cells));
  if (settings.createRooms && cells.length) {
    current = {
      ...current,
      rooms: [{ id: "generated-cavern-1", label: "Cavern", color: "#78716c", cells }],
    };
  }
  return dressGeneratedMap(
    current,
    settings,
    [cells[Math.floor(cells.length / 2)]].filter(Boolean),
    rng,
  );
}

function dressGeneratedMap(
  document: DungeonStudioDocument,
  settings: DungeonStudioGeneratorSettings,
  anchors: GridCell[],
  rng: () => number,
) {
  let current = document;
  if (settings.addStairs && anchors.length) {
    current = placeObjectEntity(current, anchors[0], "stairs-up");
    current = placeObjectEntity(current, anchors.at(-1) ?? anchors[0], "stairs-down");
  }
  if (settings.addFurniture) {
    for (const anchor of anchors.slice(0, 8)) {
      const asset = ["table", "chair", "chest", "barrel", "crate", "torch"][randInt(rng, 0, 5)];
      current = placeObjectEntity(current, anchor, asset);
    }
  }
  return current;
}

function seededRandom(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function rectangleCells(x: number, y: number, width: number, height: number) {
  return Array.from({ length: width * height }, (_, index) => ({
    x: x + (index % width),
    y: y + Math.floor(index / width),
  }));
}

function corridorCells(from: GridCell, to: GridCell) {
  const cells: GridCell[] = [];
  const xStep = from.x <= to.x ? 1 : -1;
  for (let x = from.x; x !== to.x; x += xStep) cells.push({ x, y: from.y });
  const yStep = from.y <= to.y ? 1 : -1;
  for (let y = from.y; y !== to.y; y += yStep) cells.push({ x: to.x, y });
  cells.push(to);
  return cells;
}

function rectanglesOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return !(
    left.x + left.width + 1 < right.x ||
    right.x + right.width + 1 < left.x ||
    left.y + left.height + 1 < right.y ||
    right.y + right.height + 1 < left.y
  );
}

function centerOf(room: { x: number; y: number; width: number; height: number }) {
  return { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) };
}

function neighborOpenCount(open: Set<string>, x: number, y: number) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx || dy) count += open.has(`${x + dx},${y + dy}`) ? 1 : 0;
    }
  }
  return count;
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function roomColor(index: number) {
  return ["#14b8a6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4"][index % 6];
}
