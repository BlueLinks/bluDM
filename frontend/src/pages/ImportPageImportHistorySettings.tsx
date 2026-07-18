import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  History,
  Import,
  Lock,
  RefreshCw,
  Settings,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ActionRow, ContentStack, ResponsiveGrid } from "../components/layout";
import { Badge, Button, Callout, Field, Input, SectionPanel } from "../components/ui";
import type {
  ImportExportHistoryRecord,
  ImportExportPreview,
  ImportMode,
} from "../lib/api/importExport";
import { HistoryInspector } from "./ImportPageHistoryInspector";
import {
  defaultSettings,
  formatBytes,
  hasBlockingConflict,
  importProgressStages,
  type HistoryRow,
} from "./ImportPageSupport";
import {
  ConflictPanel,
  DropZone,
  ImportModeCards,
  PreviewPanel,
  ProgressStageList,
  StepTrack,
  ToggleRow,
} from "./ImportPageUi";
import { MergePreviewPanel } from "./ImportPageMergePreview";

export function ImportTab({
  file,
  importComplete,
  importMode,
  importing,
  mergeConfirmed,
  preview,
  restoreConfirmed,
  onChooseFile,
  onExecute,
  onPreview,
  onSelectMode,
  onToggleMergeConfirmed,
  onToggleRestoreConfirmed,
}: {
  file: File | null;
  importComplete: string;
  importMode: ImportMode;
  importing: boolean;
  mergeConfirmed: boolean;
  preview: ImportExportPreview | null;
  restoreConfirmed: boolean;
  onChooseFile: (file: File | null) => void;
  onExecute: () => void;
  onPreview: () => void;
  onSelectMode: (mode: ImportMode) => void;
  onToggleMergeConfirmed: () => void;
  onToggleRestoreConfirmed: () => void;
}) {
  const activeStep = preview ? (preview.conflicts.length ? 3 : 2) : file ? 2 : 1;
  const restoreReady = Boolean(preview?.restoreReadiness?.ready);
  const blocked =
    !preview ||
    hasBlockingConflict(preview.conflicts) ||
    (importMode === "restore" && (!restoreReady || !restoreConfirmed)) ||
    (importMode === "merge" &&
      (!preview.mergePlan ||
        (preview.mergePlan.blockers ?? []).length > 0 ||
        preview.mergePlan.summary.block > 0 ||
        !mergeConfirmed));
  const completedImportStages = importComplete
    ? importProgressStages.length
    : importing
      ? 6
      : preview
        ? 4
        : file
          ? 1
          : 0;
  const activeImportStage = importComplete ? -1 : importing ? 6 : preview ? 4 : file ? 1 : 0;
  return (
    <ContentStack>
      <StepTrack activeStep={activeStep} />
      {(file || preview || importing || importComplete) && (
        <SectionPanel title="Import Progress" icon={FileCheck2}>
          <ProgressStageList
            stages={importProgressStages}
            completed={completedImportStages}
            activeIndex={activeImportStage}
          />
        </SectionPanel>
      )}
      <ResponsiveGrid variant="equal2">
        <SectionPanel title="Upload File" icon={UploadCloud}>
          <DropZone file={file} onChooseFile={onChooseFile} />
          <Callout>
            Maximum supported upload size is {formatBytes(50 * 1024 * 1024)}. Preview validates the
            ZIP and writes nothing.
          </Callout>
        </SectionPanel>
        <SectionPanel title="Import Modes" icon={RefreshCw}>
          <ImportModeCards
            selected={importMode}
            restoreReady={restoreReady}
            onSelect={onSelectMode}
          />
        </SectionPanel>
      </ResponsiveGrid>
      {preview && <PreviewPanel preview={preview} />}
      {preview?.mergePlan && <MergePreviewPanel plan={preview.mergePlan} />}
      {preview && <ConflictPanel conflicts={preview.conflicts} />}
      <SectionPanel
        title="Import"
        icon={CheckCircle2}
        action={
          <ActionRow justify="end">
            <Button
              type="button"
              icon={FileCheck2}
              variant="secondary"
              disabled={!file}
              onClick={onPreview}
            >
              Preview Again
            </Button>
            <Button type="button" icon={Import} disabled={blocked || importing} onClick={onExecute}>
              {importing
                ? "Importing..."
                : importMode === "restore"
                  ? "Restore Import"
                  : importMode === "merge"
                    ? "Merge Import"
                    : "Clone Import"}
            </Button>
          </ActionRow>
        }
      >
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            {importMode === "restore"
              ? "Restore mode preserves original IDs and only runs when this account has no existing portable data."
              : importMode === "merge"
                ? "Merge mode executes only the safe decisions approved by the planner and rolls back if anything changes underneath it."
                : "Clone mode creates new records, assigns them to the current user, and remaps IDs inside one transaction."}
          </p>
          {importMode === "restore" && (
            <label className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={restoreConfirmed}
                disabled={!restoreReady}
                onChange={onToggleRestoreConfirmed}
              />
              <span>
                <span className="font-semibold">Confirm restore</span>
                <span className="block text-muted-foreground">
                  I understand Restore preserves original IDs and must only run into an empty
                  account.
                </span>
              </span>
            </label>
          )}
          {importMode === "merge" && (
            <label className="flex items-start gap-3 rounded-md border border-border bg-background p-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={mergeConfirmed}
                disabled={!preview?.mergePlan || preview.mergePlan.summary.block > 0}
                onChange={onToggleMergeConfirmed}
              />
              <span>
                <span className="font-semibold">Confirm merge</span>
                <span className="block text-muted-foreground">
                  I reviewed the planner decisions and understand Merge will only execute the safe
                  approved actions shown above.
                </span>
              </span>
            </label>
          )}
        </div>
      </SectionPanel>
    </ContentStack>
  );
}

export function HistoryTab({
  rows,
  selected,
  onClear,
  onDelete,
  onSelect,
}: {
  rows: HistoryRow[];
  selected: ImportExportHistoryRecord | null;
  onClear: () => void;
  onDelete: (historyID: string) => void;
  onSelect: (record: ImportExportHistoryRecord) => void;
}) {
  return (
    <ContentStack>
      <SectionPanel
        title="Import / Export History"
        icon={History}
        action={
          <Button
            type="button"
            icon={Trash2}
            variant="secondary"
            disabled={!rows.length}
            onClick={onClear}
          >
            Clear
          </Button>
        }
      >
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    "Name",
                    "Bundle Type",
                    "Action",
                    "Mode",
                    "Status",
                    "Date",
                    "Size",
                    "Actions",
                  ].map((header) => (
                    <th className="px-3 py-2" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t border-border" key={row.id}>
                    <td className="px-3 py-3 font-semibold">{row.name}</td>
                    <td className="px-3 py-3">{row.bundleType}</td>
                    <td className="px-3 py-3">{row.action}</td>
                    <td className="px-3 py-3">{row.mode}</td>
                    <td className="px-3 py-3">
                      <Badge tone={row.status === "Success" ? "success" : "default"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{row.date}</td>
                    <td className="px-3 py-3">{row.size}</td>
                    <td className="px-3 py-3">
                      <ActionRow>
                        {row.record && (
                          <Button
                            type="button"
                            icon={Eye}
                            size="sm"
                            variant="secondary"
                            onClick={() => onSelect(row.record!)}
                          >
                            View
                          </Button>
                        )}
                        {row.record?.downloadUrl && (
                          <Button
                            type="button"
                            icon={Download}
                            size="sm"
                            disabled={row.record.downloadAvailable === false}
                            title={row.record.downloadStatus}
                            onClick={() => window.location.assign(row.record!.downloadUrl!)}
                          >
                            {row.record.downloadAvailable === false ? "Expired" : "Download"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          icon={Trash2}
                          size="sm"
                          variant="secondary"
                          onClick={() => onDelete(row.id)}
                        >
                          Delete
                        </Button>
                      </ActionRow>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Persistent import/export history will appear here after exports or imports complete.
          </p>
        )}
      </SectionPanel>
      {selected && <HistoryInspector record={selected} />}
    </ContentStack>
  );
}

export function SettingsTab({
  settings,
  onToggle,
}: {
  settings: typeof defaultSettings;
  onToggle: (key: keyof typeof defaultSettings) => void;
}) {
  return (
    <ResponsiveGrid variant="equal2">
      <SectionPanel title="Default Settings" icon={Settings}>
        <div className="grid gap-3">
          <ToggleRow
            checked={settings.includeAssets}
            label="Include uploaded assets by default"
            onChange={() => onToggle("includeAssets")}
          />
          <ToggleRow
            checked={settings.includeDungeonStudio}
            label="Include Dungeon Studio data by default"
            onChange={() => onToggle("includeDungeonStudio")}
          />
          <ToggleRow
            checked={settings.compressImages}
            disabled
            label="Compress images by default"
            note="Requires asset rewrite support"
            onChange={() => onToggle("compressImages")}
          />
          <ToggleRow
            checked={settings.previewFirst}
            label="Show preview before import"
            onChange={() => onToggle("previewFirst")}
          />
          <ToggleRow
            checked={settings.validateBeforeImport}
            label="Validate data before import"
            onChange={() => onToggle("validateBeforeImport")}
          />
        </div>
      </SectionPanel>
      <SectionPanel title="Advanced" icon={Lock}>
        <div className="grid gap-4">
          <Field label="Maximum import file size">
            <Input readOnly value="50 MB" />
          </Field>
          <Field label="Default import mode">
            <Input readOnly value="Clone" />
          </Field>
          <Field label="Export format version">
            <Input readOnly value="v2 split archive" />
          </Field>
          <Button type="button" variant="secondary" disabled>
            Clear Old Export Files
          </Button>
          <Callout>
            Cached downloads expire automatically after one hour in this first pass.
          </Callout>
        </div>
      </SectionPanel>
    </ResponsiveGrid>
  );
}
