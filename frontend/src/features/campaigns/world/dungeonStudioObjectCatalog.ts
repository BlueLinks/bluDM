import type { DungeonStudioEntity } from "./dungeonStudioDocument";

export type DungeonStudioObjectCategory =
  | "furniture"
  | "storage"
  | "decor"
  | "light"
  | "doorway"
  | "hazard"
  | "stairs"
  | "custom";

export type DungeonStudioObjectAsset = {
  key: string;
  label: string;
  category: DungeonStudioObjectCategory;
  entityKind: DungeonStudioEntity["kind"];
  glyph: string;
  defaultLabel?: string;
  license: "built-in" | "user-provided";
  source: string;
};

export type DungeonStudioCustomAsset = {
  key: string;
  label: string;
  category: string;
  dataUrl: string;
  defaultScale?: number;
  sourceNotes?: string;
  licenseNotes?: string;
};

export const builtinDungeonStudioObjectAssets: DungeonStudioObjectAsset[] = [
  asset("table", "Table", "furniture", "prop", "▭"),
  asset("chair", "Chair", "furniture", "prop", "◻"),
  asset("chest", "Chest", "storage", "prop", "▣"),
  asset("barrel", "Barrel", "storage", "prop", "◯"),
  asset("crate", "Crate", "storage", "prop", "□"),
  asset("bed", "Bed", "furniture", "prop", "▰"),
  asset("bookshelf", "Bookshelf", "furniture", "prop", "▥"),
  asset("rug", "Rug", "decor", "prop", "▱"),
  asset("torch", "Torch", "light", "light", "✦"),
  asset("statue", "Statue", "decor", "prop", "♜"),
  asset("gate", "Gate", "doorway", "prop", "╫"),
  asset("trap", "Trap", "hazard", "trap", "⚠"),
  asset("stairs-up", "Stairs up", "stairs", "stairs", "↟", "Stairs up"),
  asset("stairs-down", "Stairs down", "stairs", "stairs", "↡", "Stairs down"),
];

export const dungeonStudioObjectCategoryLabels: Record<DungeonStudioObjectCategory, string> = {
  furniture: "Furniture",
  storage: "Storage",
  decor: "Decor",
  light: "Lighting",
  doorway: "Doors and gates",
  hazard: "Traps",
  stairs: "Stairs",
  custom: "Custom uploads",
};

export function dungeonStudioAssetByKey(
  key: string | undefined,
  customAssets: DungeonStudioCustomAsset[] = [],
): DungeonStudioObjectAsset | undefined {
  if (!key) return undefined;
  const builtIn = builtinDungeonStudioObjectAssets.find((asset) => asset.key === key);
  if (builtIn) return builtIn;
  const custom = customAssets.find((asset) => asset.key === key);
  return custom
    ? {
        key: custom.key,
        label: custom.label,
        category: "custom",
        entityKind: "prop",
        glyph: "✣",
        license: "user-provided",
        source: custom.sourceNotes || "User upload",
      }
    : undefined;
}

function asset(
  key: string,
  label: string,
  category: DungeonStudioObjectCategory,
  entityKind: DungeonStudioEntity["kind"],
  glyph: string,
  defaultLabel = label,
): DungeonStudioObjectAsset {
  return {
    key,
    label,
    category,
    entityKind,
    glyph,
    defaultLabel,
    license: "built-in",
    source: "bluDM built-in SVG/text glyph catalog; no third-party asset files bundled.",
  };
}
