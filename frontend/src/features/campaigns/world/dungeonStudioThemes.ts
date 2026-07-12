import type { DungeonStudioCellKind, DungeonStudioTilesetKey } from "./dungeonStudioDocument";

export type DungeonStudioThemeDefinition = {
  key: DungeonStudioTilesetKey;
  label: string;
  floor: string;
  wall: string;
  gridOpacity: number;
  terrain: Partial<Record<DungeonStudioCellKind, string>>;
};

export const dungeonStudioThemeDefinitions: DungeonStudioThemeDefinition[] = [
  theme("dungeon", "Dungeon", "rgb(100 116 139 / 0.34)", "hsl(var(--foreground))"),
  theme("stone", "Stone", "rgb(120 113 108 / 0.36)", "rgb(68 64 60)"),
  theme("cave", "Cave", "rgb(87 83 78 / 0.42)", "rgb(68 64 60)", {
    cliff: "rgb(87 83 78 / 0.48)",
    chasm: "rgb(12 10 9 / 0.78)",
  }),
  theme("castle", "Castle", "rgb(148 163 184 / 0.32)", "rgb(51 65 85)"),
  theme("cellar", "Cellar", "rgb(120 53 15 / 0.24)", "rgb(92 51 23)"),
  theme("forest", "Forest", "rgb(34 197 94 / 0.24)", "rgb(63 98 18)", {
    grass: "rgb(34 197 94 / 0.32)",
    water: "rgb(14 165 233 / 0.32)",
  }),
  theme("sewer", "Sewer", "rgb(71 85 105 / 0.32)", "rgb(51 65 85)", {
    water: "rgb(20 184 166 / 0.34)",
    hazard: "rgb(132 204 22 / 0.28)",
  }),
  theme("house", "House", "rgb(180 83 9 / 0.22)", "rgb(120 53 15)"),
  theme("ruins", "Ruins", "rgb(161 161 170 / 0.30)", "rgb(82 82 91)", {
    rubble: "rgb(161 98 7 / 0.34)",
    grass: "rgb(34 197 94 / 0.20)",
  }),
  theme("temple", "Temple", "rgb(226 232 240 / 0.36)", "rgb(100 116 139)"),
  theme("crypt", "Crypt", "rgb(71 85 105 / 0.36)", "rgb(30 41 59)", {
    chasm: "rgb(15 23 42 / 0.76)",
  }),
  theme("shop", "Shop", "rgb(180 83 9 / 0.20)", "rgb(120 53 15)"),
  theme("home", "Home", "rgb(217 119 6 / 0.18)", "rgb(146 64 14)"),
  theme("town", "Town", "rgb(148 163 184 / 0.22)", "rgb(71 85 105)", {
    road: "rgb(180 83 9 / 0.28)",
    grass: "rgb(34 197 94 / 0.22)",
  }),
];

export const dungeonStudioThemeOptions = dungeonStudioThemeDefinitions.map((theme) => ({
  label: theme.label,
  value: theme.key,
}));

export function dungeonStudioTheme(key: DungeonStudioTilesetKey) {
  return (
    dungeonStudioThemeDefinitions.find((theme) => theme.key === key) ??
    dungeonStudioThemeDefinitions[0]
  );
}

export function dungeonStudioThemeLabel(key: DungeonStudioTilesetKey) {
  return dungeonStudioTheme(key).label;
}

function theme(
  key: DungeonStudioTilesetKey,
  label: string,
  floor: string,
  wall: string,
  terrain: Partial<Record<DungeonStudioCellKind, string>> = {},
): DungeonStudioThemeDefinition {
  return { key, label, floor, wall, gridOpacity: key === "forest" ? 0.45 : 0.65, terrain };
}
