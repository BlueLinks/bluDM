import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Page, PageHeader, ToastViewport, useToasts } from "../components/ui";
import { api } from "../lib/api";
import type {
  ImportExportBundleType,
  ImportExportExport,
  ImportExportHistoryRecord,
  ImportMode,
  ImportExportPreview,
} from "../lib/api/importExport";
import type { Campaign } from "../types";
import { MarkdownEncounterTab } from "./ImportPageMarkdown";
import { ExportTab, OverviewTab } from "./ImportPageOverviewExport";
import { HistoryTab, ImportTab, SettingsTab } from "./ImportPageImportHistorySettings";
import {
  bundleOptions,
  defaultSettings,
  estimateBundleSize,
  hasBlockingConflict,
  historyFromRecord,
  importErrorMessage,
  needsCampaignContext,
  tabs,
  usesObjectSelection,
  type ExportObjectChoice,
  type HistoryRow,
  type TabKey,
} from "./ImportPageSupport";
import { exportObjectChoices } from "./importPageExportObjects";

export function ImportPage() {
  const [requestedCampaignID] = useState(
    () => new URLSearchParams(window.location.search).get("campaign") ?? "",
  );
  const [activeTab, setActiveTab] = useState<TabKey>(initialImportTab);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignError, setCampaignError] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<ImportExportBundleType>("everything");
  const [selectedCampaignIDs, setSelectedCampaignIDs] = useState<string[]>([]);
  const [exportObjects, setExportObjects] = useState<ExportObjectChoice[]>([]);
  const [selectedObjectIDs, setSelectedObjectIDs] = useState<string[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState("");
  const [settings, setSettings] = useState(defaultSettings);
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ImportExportExport | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ImportExportHistoryRecord | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportExportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("clone");
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [mergeConfirmed, setMergeConfirmed] = useState(false);
  const [importComplete, setImportComplete] = useState("");
  const [importError, setImportError] = useState("");
  const toast = useToasts();

  useEffect(() => {
    let cancelled = false;
    api
      .campaigns()
      .then((payload) => {
        if (!cancelled) {
          setCampaigns(payload.campaigns);
          setSelectedCampaignIDs((current) =>
            current.length
              ? current
              : requestedCampaignID &&
                  payload.campaigns.some((campaign) => campaign.id === requestedCampaignID)
                ? [requestedCampaignID]
                : payload.campaigns.slice(0, 1).map((campaign) => campaign.id),
          );
        }
      })
      .catch((err) => !cancelled && setCampaignError(importErrorMessage(err, "campaigns")));
    return () => {
      cancelled = true;
    };
  }, [requestedCampaignID]);

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    setSelectedObjectIDs([]);
  }, [selectedBundle]);

  useEffect(() => {
    let cancelled = false;
    async function loadExportObjects() {
      if (!usesObjectSelection(selectedBundle)) {
        setExportObjects([]);
        setObjectsError("");
        return;
      }
      setObjectsLoading(true);
      setObjectsError("");
      try {
        const objects = await exportObjectChoices(selectedBundle, selectedCampaignIDs);
        if (!cancelled) {
          setExportObjects(objects);
          setSelectedObjectIDs((current) =>
            current.filter((id) => objects.some((object) => object.id === id)),
          );
        }
      } catch (err) {
        if (!cancelled) setObjectsError(importErrorMessage(err, "export objects"));
      } finally {
        if (!cancelled) setObjectsLoading(false);
      }
    }
    void loadExportObjects();
    return () => {
      cancelled = true;
    };
  }, [selectedBundle, selectedCampaignIDs]);

  const selectedOption = bundleOptions.find((option) => option.key === selectedBundle);
  const exportDisabled =
    exporting ||
    objectsLoading ||
    !selectedOption?.supported ||
    (needsCampaignContext(selectedBundle) &&
      selectedBundle !== "encounter" &&
      selectedBundle !== "map" &&
      selectedCampaignIDs.length === 0) ||
    (usesObjectSelection(selectedBundle) && exportObjects.length === 0);
  const estimatedSize = useMemo(
    () => estimateBundleSize(selectedBundle, selectedCampaignIDs.length, settings.includeAssets),
    [selectedBundle, selectedCampaignIDs.length, settings.includeAssets],
  );

  async function createExport() {
    setExporting(true);
    setImportError("");
    try {
      const payload = await api.createExport({
        bundleType: selectedBundle,
        campaignIds: needsCampaignContext(selectedBundle) ? selectedCampaignIDs : [],
        objectIds: usesObjectSelection(selectedBundle)
          ? selectedObjectIDs.length
            ? selectedObjectIDs
            : exportObjects.map((object) => object.id)
          : [],
        options: {
          includeAssets: settings.includeAssets,
          includeDungeonStudio: settings.includeDungeonStudio,
          includePlayers: settings.includePlayers,
        },
      });
      setLastExport(payload.export);
      if (payload.history) {
        setSelectedHistory(payload.history);
      }
      await loadHistory();
      toast.push("Export bundle is ready");
    } catch (err) {
      setImportError(importErrorMessage(err, "export"));
    } finally {
      setExporting(false);
    }
  }

  async function previewImport(file = importFile, mode = importMode) {
    if (!file) return;
    setImportError("");
    setImportComplete("");
    setPreview(null);
    try {
      const payload = await api.previewImport(file, mode);
      setPreview(payload.preview);
      setActiveTab("import");
      toast.push("Import preview ready");
    } catch (err) {
      setImportError(importErrorMessage(err, "preview"));
    }
  }

  async function executeImport() {
    if (!importFile || !preview || hasBlockingConflict(preview.conflicts)) return;
    setImporting(true);
    setImportError("");
    try {
      const payload = await api.executeImport(
        importFile,
        importMode,
        restoreConfirmed,
        mergeConfirmed,
      );
      const count = payload.import.campaignIds?.length ?? 0;
      setImportComplete(
        count > 0
          ? `${importMode === "restore" ? "Restored" : importMode === "merge" ? "Merged" : "Imported"} ${count} campaign${count === 1 ? "" : "s"}.`
          : `${importMode === "restore" ? "Restore" : importMode === "merge" ? "Merge" : "Import"} completed.`,
      );
      if (payload.history) {
        setSelectedHistory(payload.history);
      }
      await loadHistory();
      toast.push("Bundle imported");
    } catch (err) {
      setImportError(importErrorMessage(err, "import"));
    } finally {
      setImporting(false);
    }
  }

  function chooseFile(file: File | null) {
    setImportFile(file);
    setPreview(null);
    setImportMode("clone");
    setRestoreConfirmed(false);
    setMergeConfirmed(false);
    setImportComplete("");
    setImportError("");
    if (file) void previewImport(file);
  }

  async function loadHistory() {
    try {
      const payload = await api.history();
      setHistoryRows(payload.history.map(historyFromRecord));
    } catch (err) {
      setImportError(importErrorMessage(err, "history"));
    }
  }

  async function deleteHistory(historyID: string) {
    try {
      await api.deleteHistory(historyID);
      if (selectedHistory?.id === historyID) setSelectedHistory(null);
      await loadHistory();
      toast.push("History entry deleted");
    } catch (err) {
      setImportError(importErrorMessage(err, "history"));
    }
  }

  async function clearHistory() {
    try {
      await api.clearHistory();
      setSelectedHistory(null);
      await loadHistory();
      toast.push("History cleared");
    } catch (err) {
      setImportError(importErrorMessage(err, "history"));
    }
  }

  return (
    <Page size="wide">
      <ToastViewport toasts={toast.toasts} />
      <PageHeader
        eyebrow="Data management"
        title="Import / Export"
        copy="Bring encounters, NPCs, and dungeons in from Markdown, or create portable bluDM bundles for full data transfer and recovery."
        action={<ImportHelpButton onClick={() => setActiveTab("settings")} />}
      />

      <nav
        aria-label="Import export sections"
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={[
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-surface-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {campaignError && <Callout tone="danger">{campaignError}</Callout>}
      {objectsError && <Callout tone="danger">{objectsError}</Callout>}
      {importError && <Callout tone="danger">{importError}</Callout>}
      {importComplete && <Callout tone="success">{importComplete}</Callout>}

      {activeTab === "overview" && (
        <OverviewTab
          historyRows={historyRows}
          lastExport={lastExport}
          onExport={() => setActiveTab("export")}
          onImport={() => setActiveTab("import")}
        />
      )}
      {activeTab === "markdown" && (
        <MarkdownEncounterTab
          campaigns={campaigns}
          initialCampaignID={requestedCampaignID || selectedCampaignIDs[0] || ""}
        />
      )}
      {activeTab === "export" && (
        <ExportTab
          campaigns={campaigns}
          estimatedSize={estimatedSize}
          exporting={exporting}
          exportDisabled={exportDisabled}
          lastExport={lastExport}
          objects={exportObjects}
          objectsLoading={objectsLoading}
          selectedBundle={selectedBundle}
          selectedCampaignIDs={selectedCampaignIDs}
          selectedObjectIDs={selectedObjectIDs}
          settings={settings}
          onCreateExport={() => void createExport()}
          onSelectBundle={setSelectedBundle}
          onToggleObject={(objectID) => {
            setSelectedObjectIDs((current) =>
              current.includes(objectID)
                ? current.filter((id) => id !== objectID)
                : [...current, objectID],
            );
          }}
          onToggleCampaign={(campaignID) => {
            setSelectedCampaignIDs((current) =>
              current.includes(campaignID)
                ? current.filter((id) => id !== campaignID)
                : [...current, campaignID],
            );
          }}
          onToggleSetting={(key) =>
            setSettings((current) => ({ ...current, [key]: !current[key] }))
          }
        />
      )}
      {activeTab === "import" && (
        <ImportTab
          file={importFile}
          importComplete={importComplete}
          importMode={importMode}
          importing={importing}
          preview={preview}
          restoreConfirmed={restoreConfirmed}
          mergeConfirmed={mergeConfirmed}
          onChooseFile={chooseFile}
          onExecute={() => void executeImport()}
          onPreview={() => void previewImport()}
          onSelectMode={(mode) => {
            setImportMode(mode);
            setRestoreConfirmed(false);
            setMergeConfirmed(false);
            if (importFile) void previewImport(importFile, mode);
          }}
          onToggleMergeConfirmed={() => setMergeConfirmed((current) => !current)}
          onToggleRestoreConfirmed={() => setRestoreConfirmed((current) => !current)}
        />
      )}
      {activeTab === "history" && (
        <HistoryTab
          rows={historyRows}
          selected={selectedHistory}
          onClear={() => void clearHistory()}
          onDelete={(historyID) => void deleteHistory(historyID)}
          onSelect={(record) => setSelectedHistory(record)}
        />
      )}
      {activeTab === "settings" && (
        <SettingsTab
          settings={settings}
          onToggle={(key) => setSettings((current) => ({ ...current, [key]: !current[key] }))}
        />
      )}
    </Page>
  );
}

function initialImportTab(): TabKey {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((candidate) => candidate.key === tab) ? (tab as TabKey) : "overview";
}

function ImportHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" icon={Info} variant="secondary" onClick={onClick}>
      How it works
    </Button>
  );
}
