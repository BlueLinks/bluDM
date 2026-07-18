import {
  Boxes,
  DatabaseBackup,
  Download,
  FolderArchive,
  History,
  Import,
  Map,
  Package,
  Route,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  TableProperties,
  TentTree,
  UsersRound,
} from "lucide-react";
import type { ElementType } from "react";
import type {
  ImportExportBundleType,
  ImportExportConflict,
  ImportExportExport,
  ImportExportHistoryRecord,
  ImportExportPreview,
} from "../lib/api/importExport";

export type TabKey = "overview" | "import" | "export" | "history" | "settings";

export type BundleOption = {
  key: ImportExportBundleType;
  label: string;
  copy: string;
  icon: ElementType;
  supported: boolean;
};

export type ExportObjectChoice = {
  id: string;
  label: string;
  detail: string;
};

export const tabs: Array<{ key: TabKey; label: string; icon: ElementType }> = [
  { key: "overview", label: "Overview", icon: DatabaseBackup },
  { key: "import", label: "Import", icon: Import },
  { key: "export", label: "Export", icon: Download },
  { key: "history", label: "History", icon: History },
  { key: "settings", label: "Settings", icon: Settings },
];

export const bundleOptions: BundleOption[] = [
  {
    key: "everything",
    label: "Everything",
    copy: "All current-user portable data and referenced assets.",
    icon: DatabaseBackup,
    supported: true,
  },
  {
    key: "campaign",
    label: "Campaigns",
    copy: "One or more campaigns with dependencies.",
    icon: FolderArchive,
    supported: true,
  },
  {
    key: "encounter",
    label: "Encounters",
    copy: "Selected encounters with combatants and referenced actors.",
    icon: Swords,
    supported: true,
  },
  {
    key: "npc",
    label: "NPCs / Creatures",
    copy: "Creature packs include actions, spellcasting, spells, and assets.",
    icon: UsersRound,
    supported: true,
  },
  {
    key: "player",
    label: "Players",
    copy: "Player character bundles with sheet data and portrait assets.",
    icon: UsersRound,
    supported: true,
  },
  {
    key: "item",
    label: "Items",
    copy: "Custom item bundles for your user library.",
    icon: Package,
    supported: true,
  },
  {
    key: "spell",
    label: "Spells",
    copy: "Custom spell bundles with automation and scaling data.",
    icon: Sparkles,
    supported: true,
  },
  {
    key: "map",
    label: "Maps",
    copy: "Selected maps with pins, location references, and assets.",
    icon: Map,
    supported: true,
  },
  {
    key: "shop",
    label: "Shops",
    copy: "Shop locations with stock rows and referenced item entities.",
    icon: ShoppingBag,
    supported: true,
  },
  {
    key: "dungeon",
    label: "Dungeons",
    copy: "Dungeon locations with child rooms, maps, pins, and linked encounters.",
    icon: TentTree,
    supported: true,
  },
  {
    key: "journey",
    label: "Journeys",
    copy: "Travel plans with route, pace, terrain, weather, and campaign context.",
    icon: Route,
    supported: true,
  },
  {
    key: "roll-table",
    label: "Roll Tables",
    copy: "Campaign roll tables with rows and campaign context.",
    icon: TableProperties,
    supported: true,
  },
  {
    key: "custom",
    label: "Custom Bundle",
    copy: "Disabled until per-object dependency planning is available.",
    icon: Boxes,
    supported: false,
  },
];

export const defaultSettings = {
  includeAssets: true,
  includeDungeonStudio: true,
  includePlayers: true,
  includeArchived: false,
  compressImages: false,
  previewFirst: true,
  validateBeforeImport: true,
};

export type ProgressStage = {
  key: string;
  label: string;
  detail: string;
};

export const importProgressStages: ProgressStage[] = [
  {
    key: "reading",
    label: "Reading archive",
    detail: "Load the ZIP and locate the manifest, graph, records, and assets.",
  },
  {
    key: "validating",
    label: "Validating archive",
    detail: "Check archive structure, format version, file index, and asset integrity.",
  },
  {
    key: "graph",
    label: "Building dependency graph",
    detail: "Project roots, required records, assets, and standard references.",
  },
  {
    key: "conflicts",
    label: "Checking conflicts",
    detail: "Detect name collisions and blocking import risks.",
  },
  {
    key: "preparing",
    label: "Preparing import",
    detail: "Create the clone plan and ID mapping.",
  },
  {
    key: "database",
    label: "Writing database",
    detail: "Insert cloned records inside a transaction.",
  },
  {
    key: "assets",
    label: "Importing assets",
    detail: "Copy uploaded asset metadata and files for the current user.",
  },
  {
    key: "finalising",
    label: "Finalising",
    detail: "Record import history and summarize remapped content.",
  },
  {
    key: "complete",
    label: "Complete",
    detail: "Imported content is available with new IDs.",
  },
];

export const exportProgressStages: ProgressStage[] = [
  {
    key: "planning",
    label: "Planning",
    detail: "Resolve the selected bundle type, campaigns, and object roots.",
  },
  {
    key: "graph",
    label: "Building dependency graph",
    detail: "Traverse required references, optional assets, and standard content.",
  },
  {
    key: "collecting",
    label: "Collecting entities",
    detail: "Gather logical records for the portable manifest.",
  },
  {
    key: "writing",
    label: "Writing archive",
    detail: "Write manifest, graph, logical entity files, and internal records.",
  },
  {
    key: "assets",
    label: "Compressing assets",
    detail: "Attach referenced uploaded files when assets are included.",
  },
  {
    key: "zip",
    label: "Finalising ZIP",
    detail: "Close the archive and save export history.",
  },
  {
    key: "ready",
    label: "Ready to Download",
    detail: "The download link is available for this bundle.",
  },
];

export type HistoryRow = {
  id: string;
  name: string;
  bundleType: string;
  action: string;
  mode: string;
  status: string;
  date: string;
  size: string;
  record?: ImportExportHistoryRecord;
};

export function historyFromExport(entry: ImportExportExport): HistoryRow {
  return {
    id: entry.id,
    name: entry.name,
    bundleType: bundleLabel(entry.bundleType),
    action: "Export",
    mode: "—",
    status: "Success",
    date: formatDate(entry.createdAt),
    size: formatBytes(entry.size),
  };
}

export function historyFromRecord(record: ImportExportHistoryRecord): HistoryRow {
  return {
    id: record.id,
    name: record.name,
    bundleType: bundleLabel(record.bundleType),
    action: titleCase(record.action),
    mode: record.importMode ? titleCase(record.importMode) : "—",
    status: titleCase(record.status),
    date: formatDate(record.createdAt),
    size: formatBytes(record.sizeBytes),
    record,
  };
}

export function historyFromImport(preview: ImportExportPreview): HistoryRow {
  return {
    id: `${preview.bundleType}-${Date.now()}`,
    name: `${bundleLabel(preview.bundleType)} import`,
    bundleType: bundleLabel(preview.bundleType),
    action: "Import",
    mode: "Clone",
    status: "Success",
    date: formatDate(new Date().toISOString()),
    size: formatBytes(preview.estimatedBytes),
  };
}

export function estimateBundleSize(
  type: ImportExportBundleType,
  campaignCount: number,
  includeAssets: boolean,
) {
  if (type === "everything")
    return includeAssets ? "Depends on uploaded assets" : "Usually under 10 MB";
  if (type === "campaign") {
    const count = Math.max(campaignCount, 1);
    return includeAssets
      ? `${count} campaign${count === 1 ? "" : "s"} + assets`
      : `${count} campaign manifest`;
  }
  if (["encounter", "map", "shop", "dungeon", "journey", "roll-table"].includes(type)) {
    return includeAssets ? "Selected objects + campaign context + assets" : "Selected objects";
  }
  if (["npc", "player", "item", "spell"].includes(type)) {
    return includeAssets ? "Selected library objects + assets" : "Selected library objects";
  }
  return "Coming soon";
}

export function needsCampaignContext(type: ImportExportBundleType) {
  return ["campaign", "encounter", "map", "shop", "dungeon", "journey", "roll-table"].includes(
    type,
  );
}

export function usesObjectSelection(type: ImportExportBundleType) {
  return [
    "encounter",
    "npc",
    "player",
    "item",
    "spell",
    "map",
    "shop",
    "dungeon",
    "journey",
    "roll-table",
  ].includes(type);
}

export function bundleLabel(type: string) {
  return bundleOptions.find((option) => option.key === type)?.label ?? type;
}

export function hasBlockingConflict(conflicts: ImportExportConflict[]) {
  return conflicts.some((conflict) => conflict.blocking);
}

export function resolutionLabel(value: string) {
  return value
    .replaceAll("_", "-")
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCounts(counts: Record<string, number | undefined>) {
  return [
    countLabel(counts.campaigns, "campaign"),
    countLabel(counts.players, "player"),
    countLabel(counts.npcs, "NPC"),
    countLabel(counts.journeys, "journey"),
    countLabel(counts.rollTables, "roll table"),
    countLabel(counts.assets, "asset"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function countLabel(value: number | undefined, label: string) {
  if (!value) return "";
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function importErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : `Could not load ${fallback}`;
}

function titleCase(value: string) {
  if (!value) return "";
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
