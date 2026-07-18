import type { WheelEvent } from "react";
import type { DungeonStudioCellKind, DungeonStudioDocument } from "./dungeonStudioDocument";
import { dungeonStudioTheme } from "./dungeonStudioThemes";

const cellLayerFills: Record<DungeonStudioCellKind, string> = {
  floor: "hsl(var(--muted))",
  water: "rgb(56 189 248 / 0.38)",
  cliff: "rgb(120 113 108 / 0.34)",
  chasm: "rgb(15 23 42 / 0.70)",
  rubble: "rgb(161 98 7 / 0.28)",
  hazard: "rgb(239 68 68 / 0.26)",
  road: "rgb(180 83 9 / 0.24)",
  grass: "rgb(34 197 94 / 0.24)",
};

export function dungeonStudioDimensions(document: DungeonStudioDocument) {
  return { width: document.grid.width * 24, height: document.grid.height * 24 };
}

export function cellLayerFill(kind: DungeonStudioCellKind, document: DungeonStudioDocument) {
  const theme = dungeonStudioTheme(document.tileset);
  if (kind === "floor") return theme.floor;
  return theme.terrain[kind] ?? cellLayerFills[kind];
}

export function clampPan(
  nextPan: { x: number; y: number },
  dimensions: { width: number; height: number },
  zoom: number,
) {
  const maxX = dimensions.width - dimensions.width / zoom;
  const maxY = dimensions.height - dimensions.height / zoom;
  return {
    x: Math.min(maxX, Math.max(0, nextPan.x)),
    y: Math.min(maxY, Math.max(0, nextPan.y)),
  };
}

export function wheelZoomPan(
  event: WheelEvent<HTMLDivElement>,
  rect: DOMRect,
  pan: { x: number; y: number },
  dimensions: { width: number; height: number },
  currentZoom: number,
  nextZoom: number,
) {
  const pointerX = (event.clientX - rect.left) / rect.width;
  const pointerY = (event.clientY - rect.top) / rect.height;
  const currentView = {
    width: dimensions.width / currentZoom,
    height: dimensions.height / currentZoom,
  };
  const nextView = { width: dimensions.width / nextZoom, height: dimensions.height / nextZoom };
  const worldX = pan.x + pointerX * currentView.width;
  const worldY = pan.y + pointerY * currentView.height;
  return clampPan(
    { x: worldX - pointerX * nextView.width, y: worldY - pointerY * nextView.height },
    dimensions,
    nextZoom,
  );
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
