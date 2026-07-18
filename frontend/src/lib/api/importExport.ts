import { request } from "./request";

export type ImportExportBundleType =
  | "everything"
  | "campaign"
  | "encounter"
  | "npc"
  | "player"
  | "item"
  | "spell"
  | "map"
  | "shop"
  | "dungeon"
  | "journey"
  | "roll-table"
  | "custom";

export type ImportExportCounts = {
  campaigns?: number;
  encounters?: number;
  players?: number;
  npcs?: number;
  maps?: number;
  locations?: number;
  shops?: number;
  dungeons?: number;
  journeys?: number;
  spells?: number;
  items?: number;
  assets?: number;
  rollTables?: number;
  combatLog?: number;
  dungeonStudio?: number;
};

export type ImportExportDependencyGraphNode = {
  id: string;
  kind: string;
  label: string;
  optional?: boolean;
  asset?: boolean;
  standard?: boolean;
  missing?: boolean;
};

export type ImportExportDependencyGraphEdge = {
  from: string;
  to: string;
  relation: string;
  required: boolean;
};

export type ImportExportDependencyGraph = {
  roots: string[];
  order: string[];
  nodes: ImportExportDependencyGraphNode[];
  edges: ImportExportDependencyGraphEdge[];
  reverseEdges: ImportExportDependencyGraphEdge[];
  counts: {
    objects: number;
    requiredObjects: number;
    optionalObjects: number;
    assets: number;
    standardReferences: number;
    missing: number;
    edges: number;
  };
  warnings: string[];
  audit: {
    errors: string[];
    warnings: string[];
    orphanedNodes: number;
    missingRequired: number;
    unexpectedCycles: number;
  };
  projection?: ImportExportDependencyGraphView;
};

export type ImportExportDependencyGraphViewNode = {
  id: string;
  kind: string;
  label: string;
  category: string;
  root?: boolean;
  optional?: boolean;
  asset?: boolean;
  standard?: boolean;
  missing?: boolean;
  internalRecords: number;
  childCounts?: Record<string, number>;
};

export type ImportExportDependencyGraphViewEdge = {
  from: string;
  to: string;
  relation: string;
  required: boolean;
};

export type ImportExportDependencyGraphView = {
  roots: string[];
  nodes: ImportExportDependencyGraphViewNode[];
  edges: ImportExportDependencyGraphViewEdge[];
  counts: {
    objects: number;
    rootObjects: number;
    internalRecords: number;
    assets: number;
    standardReferences: number;
    edges: number;
  };
  groups: Array<{ kind: string; label: string; count: number }>;
};

export type ImportExportExportStats = {
  source: string;
  bundleType: string;
  nodeCount: number;
  edgeCount: number;
  reverseEdgeCount: number;
  rootCount: number;
  warningCount: number;
  graphTraversalMillis: number;
  manifestGenerationMillis: number;
  zipGenerationMillis?: number;
};

export type ImportExportExport = {
  id: string;
  historyId?: string;
  name: string;
  bundleType: ImportExportBundleType;
  downloadUrl: string;
  downloadExpiresAt?: string;
  size: number;
  counts: ImportExportCounts;
  createdAt: string;
  dependencyGraph: ImportExportDependencyGraph;
  stats?: ImportExportExportStats;
};

export type ImportExportConflict = {
  kind: string;
  name: string;
  severity: "warning" | "danger";
  default: string;
  options: string[];
  blocking?: boolean;
  importedId?: string;
  entityId?: string;
  entityKind?: string;
  message?: string;
  impact?: string;
};

export type ImportExportMergeFieldDiff = {
  field: string;
  existing?: unknown;
  imported?: unknown;
  status: string;
  recommendation?: string;
};

export type ImportExportMergeProvenance = {
  archiveFingerprint?: string;
  archiveVersion?: number;
  importedAt?: string;
  importMode?: string;
  originalExportedId?: string;
  mergeLineage?: string[];
  importBatchId?: string;
};

export type ImportExportMergePlanDecision = {
  importedId: string;
  existingId?: string;
  kind: string;
  label: string;
  action: string;
  userDecision?: string;
  severity?: string;
  code?: string;
  confidence: string;
  matchedRule: string;
  parentContext?: string;
  dependencyImpact: {
    objects: number;
    requiredObjects: number;
    optionalObjects: number;
    internalRecords: number;
    assets: number;
    standardReferences: number;
    missingRequired: number;
  };
  reasons: string[];
  fieldDiffs?: ImportExportMergeFieldDiff[];
  provenance?: ImportExportMergeProvenance;
};

export type ImportExportMergePlanConflict = {
  severity: string;
  message: string;
  code: string;
  importedId?: string;
  entityId?: string;
  entityKind?: string;
  affectedDependencies: number;
  affectedInternalRecordCount: number;
  suggestedDefaultDecision: string;
};

export type ImportExportMergePlan = {
  mode: "merge";
  ready: boolean;
  summary: {
    create: number;
    update: number;
    skip: number;
    rename: number;
    block: number;
    reuse: number;
    warnings: number;
    conflicts: number;
    assets: number;
    standardReferences: number;
    unsupportedOperations: number;
  };
  decisions: ImportExportMergePlanDecision[];
  blockers: ImportExportMergePlanConflict[];
  warnings: string[];
  conflicts: ImportExportMergePlanConflict[];
  entityMatches: Array<{
    importedId: string;
    existingId: string;
    kind: string;
    label: string;
    matchType: string;
    exact: boolean;
  }>;
  assetMatches: Array<{
    importedId: string;
    existingId?: string;
    filename: string;
    sha256?: string;
    matchType: string;
    action: string;
  }>;
  dependencyImpact: {
    objects: number;
    requiredObjects: number;
    optionalObjects: number;
    internalRecords: number;
    assets: number;
    standardReferences: number;
    missingRequired: number;
  };
  policies: Array<{
    kind: string;
    create: boolean;
    reuseExisting: boolean;
    skipExactDuplicate: boolean;
    renameImported: boolean;
    replaceExisting: boolean;
    fieldLevelMerge?: boolean;
    provenance?: boolean;
    childMerge?: boolean;
    mergeChildren: boolean;
    destructiveOverwrite: boolean;
  }>;
  plannedCreates: ImportExportMergePlanDecision[];
  plannedSkips: ImportExportMergePlanDecision[];
  plannedRenames: ImportExportMergePlanDecision[];
  plannedReuses: ImportExportMergePlanDecision[];
  blockedReplaces: ImportExportMergePlanDecision[];
  unsupportedOperations: ImportExportMergePlanDecision[];
  dependencyGraph: ImportExportDependencyGraph;
};

export type ImportExportPreview = {
  bundleType: ImportExportBundleType;
  version: number;
  exportedAt: string;
  sourceAppVersion: string;
  counts: ImportExportCounts;
  summary?: {
    entities: ImportExportDependencyGraphViewNode[];
    groups: Array<{ kind: string; label: string; count: number }>;
    internalRecords: number;
    assets: number;
    standardReferences: number;
    rootObjects: number;
  };
  verification: {
    archiveValid: boolean;
    manifestValid: boolean;
    graphValid: boolean;
    internalRecordsValid: boolean;
    logicalFilesValid: boolean;
    assetsVerified: boolean;
    dependenciesComplete: boolean;
    standardReferencesOk: boolean;
    unsupportedFuture: boolean;
    duplicateEntities: boolean;
    orphanedGraphNodes: number;
    missingRequired: number;
    unexpectedCycles: number;
    messages: string[];
  };
  restoreReadiness: {
    archiveValid: boolean;
    databaseSafe: boolean;
    dependenciesComplete: boolean;
    assetsVerified: boolean;
    ready: boolean;
    messages: string[];
  };
  warnings: string[];
  unsupported: string[];
  conflicts: ImportExportConflict[];
  estimatedBytes: number;
  dependencyGraph: ImportExportDependencyGraph;
  mergePlan?: ImportExportMergePlan;
};

export type ImportExecuteResult = {
  campaignIds: string[];
  counts: ImportExportCounts;
};

export type ImportMode = "clone" | "restore" | "merge";

export type ImportExportHistoryRecord = {
  id: string;
  action: "export" | "import";
  bundleType: ImportExportBundleType;
  name: string;
  exportId?: string;
  downloadUrl?: string;
  downloadAvailable?: boolean;
  downloadExpiresAt?: string;
  downloadStatus?: string;
  importMode: string;
  bundleVersion: number;
  sourceAppVersion: string;
  sizeBytes: number;
  durationMillis: number;
  status: string;
  warnings: string[];
  counts: ImportExportCounts;
  manifestSummary: Record<string, unknown>;
  dependencyGraph: ImportExportDependencyGraph;
  createdAt: string;
};

export const importExportApi = {
  createExport: (payload: {
    bundleType: ImportExportBundleType;
    campaignIds: string[];
    objectIds?: string[];
    options: {
      includeAssets: boolean;
      includeDungeonStudio: boolean;
      includePlayers: boolean;
    };
  }) =>
    request<{ export: ImportExportExport; history?: ImportExportHistoryRecord }>(
      "/api/import-export/exports",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  history: () => request<{ history: ImportExportHistoryRecord[] }>("/api/import-export/history"),
  historyEntry: (historyId: string) =>
    request<{ history: ImportExportHistoryRecord }>(
      `/api/import-export/history/${encodeURIComponent(historyId)}`,
    ),
  deleteHistory: (historyId: string) =>
    request<void>(`/api/import-export/history/${encodeURIComponent(historyId)}`, {
      method: "DELETE",
    }),
  clearHistory: () =>
    request<void>("/api/import-export/history", {
      method: "DELETE",
    }),
  previewImport(file: File, mode?: ImportMode) {
    const formData = new FormData();
    formData.append("bundle", file, file.name);
    const params = new URLSearchParams();
    if (mode) params.set("mode", mode);
    const query = params.toString();
    return request<{ preview: ImportExportPreview }>(
      `/api/import-export/imports/preview${query ? `?${query}` : ""}`,
      {
        method: "POST",
        body: formData,
      },
    );
  },
  executeImport(
    file: File,
    mode: ImportMode = "clone",
    confirmRestore = false,
    confirmMerge = false,
  ) {
    const formData = new FormData();
    formData.append("bundle", file, file.name);
    const params = new URLSearchParams({ mode });
    if (confirmRestore) params.set("confirmRestore", "true");
    if (confirmMerge) params.set("confirmMerge", "true");
    return request<{
      import: ImportExecuteResult;
      history?: ImportExportHistoryRecord;
      mergePlan?: ImportExportMergePlan;
    }>(`/api/import-export/imports/execute?${params.toString()}`, {
      method: "POST",
      body: formData,
    });
  },
};
