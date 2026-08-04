import type { DungeonStudioTilesetKey } from "./dungeonStudioDocument";

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
