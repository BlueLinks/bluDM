import {
  Archive,
  Download,
  FileArchive,
  FileCheck2,
  FolderArchive,
  History,
  Import,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { ContentStack, ResponsiveGrid } from "../components/layout";
import { Button, Callout, SectionPanel } from "../components/ui";
import type { ImportExportBundleType, ImportExportExport } from "../lib/api/importExport";
import type { Campaign } from "../types";
import { DependencyGraphPanel } from "./ImportPageDependencyGraph";
import {
  bundleLabel,
  bundleOptions,
  defaultSettings,
  formatBytes,
  formatCounts,
  formatDate,
  needsCampaignContext,
  exportProgressStages,
  type HistoryRow,
  type ExportObjectChoice,
  usesObjectSelection,
} from "./ImportPageSupport";
import {
  BundleGrid,
  BundleSelectRow,
  Checklist,
  HistoryList,
  ImportModeCards,
  ProgressStageList,
  SafetyStrip,
  Stat,
  ToggleRow,
} from "./ImportPageUi";

export function OverviewTab({
  historyRows,
  lastExport,
  onExport,
  onImport,
}: {
  historyRows: HistoryRow[];
  lastExport: ImportExportExport | null;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <ContentStack>
      <ResponsiveGrid variant="equal2">
        <SectionPanel title="Export" icon={Download}>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Create a ZIP bundle containing a versioned manifest and uploaded assets.
            </p>
            <Button type="button" icon={Download} onClick={onExport}>
              Start Export
            </Button>
            <Checklist
              items={[
                "Campaign data and related content",
                "Players, NPCs, creatures, items, and spells",
                "Maps, locations, encounters, journeys, and roll tables",
                "References to standard content by key",
              ]}
            />
            {lastExport ? (
              <Callout>
                Latest export: {lastExport.name} · {formatBytes(lastExport.size)}
              </Callout>
            ) : (
              <Callout>Exports are generated as portable `.zip` bundles.</Callout>
            )}
          </div>
        </SectionPanel>
        <SectionPanel title="Import" icon={Import}>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Upload a bundle, inspect its contents, resolve conflicts, then clone it with new IDs.
            </p>
            <Button type="button" icon={UploadCloud} onClick={onImport}>
              Start Import
            </Button>
            <ImportModeCards compact />
            <Callout>Nothing is written until the final import confirmation.</Callout>
          </div>
        </SectionPanel>
      </ResponsiveGrid>

      <SectionPanel title="Export Options" icon={Archive}>
        <BundleGrid />
      </SectionPanel>

      <ResponsiveGrid variant="equal2">
        <SectionPanel title="Recent Exports / Imports" icon={History}>
          {historyRows.length ? (
            <HistoryList rows={historyRows.slice(0, 4)} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Recent app-native exports and imports will appear here for this session.
            </p>
          )}
        </SectionPanel>
        <SectionPanel title="Safety Features" icon={ShieldCheck}>
          <SafetyStrip />
        </SectionPanel>
      </ResponsiveGrid>
    </ContentStack>
  );
}

export function ExportTab({
  campaigns,
  estimatedSize,
  exporting,
  exportDisabled,
  lastExport,
  objects,
  objectsLoading,
  selectedBundle,
  selectedCampaignIDs,
  selectedObjectIDs,
  settings,
  onCreateExport,
  onSelectBundle,
  onToggleCampaign,
  onToggleObject,
  onToggleSetting,
}: {
  campaigns: Campaign[];
  estimatedSize: string;
  exporting: boolean;
  exportDisabled: boolean;
  lastExport: ImportExportExport | null;
  objects: ExportObjectChoice[];
  objectsLoading: boolean;
  selectedBundle: ImportExportBundleType;
  selectedCampaignIDs: string[];
  selectedObjectIDs: string[];
  settings: typeof defaultSettings;
  onCreateExport: () => void;
  onSelectBundle: (type: ImportExportBundleType) => void;
  onToggleCampaign: (campaignID: string) => void;
  onToggleObject: (objectID: string) => void;
  onToggleSetting: (key: keyof typeof defaultSettings) => void;
}) {
  return (
    <ContentStack>
      <ResponsiveGrid variant="equal2">
        <SectionPanel title="Create an Export" icon={FileArchive}>
          <div className="grid gap-2">
            {bundleOptions.map((option) => (
              <BundleSelectRow
                key={option.key}
                option={option}
                selected={selectedBundle === option.key}
                onClick={() => option.supported && onSelectBundle(option.key)}
              />
            ))}
          </div>
        </SectionPanel>
        <ContentStack>
          <CampaignContextPanel
            campaigns={campaigns}
            selectedBundle={selectedBundle}
            selectedCampaignIDs={selectedCampaignIDs}
            onToggleCampaign={onToggleCampaign}
          />
          {usesObjectSelection(selectedBundle) && (
            <ObjectSelectionPanel
              objects={objects}
              objectsLoading={objectsLoading}
              selectedObjectIDs={selectedObjectIDs}
              onToggleObject={onToggleObject}
            />
          )}
          <SectionPanel title="Options" icon={Settings}>
            <div className="grid gap-3">
              <ToggleRow
                checked={settings.includeAssets}
                label="Include uploaded assets"
                onChange={() => onToggleSetting("includeAssets")}
              />
              <ToggleRow
                checked={settings.includeDungeonStudio}
                label="Include Dungeon Studio data"
                onChange={() => onToggleSetting("includeDungeonStudio")}
              />
              <ToggleRow
                checked={settings.includePlayers}
                label="Include player characters"
                onChange={() => onToggleSetting("includePlayers")}
              />
              <ToggleRow
                checked={settings.includeArchived}
                disabled
                label="Include inactive / archived items"
                note="Requires archive restore rules"
                onChange={() => onToggleSetting("includeArchived")}
              />
              <ToggleRow
                checked={settings.compressImages}
                disabled
                label="Compress images"
                note="Requires asset rewrite support"
                onChange={() => onToggleSetting("compressImages")}
              />
            </div>
          </SectionPanel>
        </ContentStack>
      </ResponsiveGrid>
      <SectionPanel
        title="Review Export"
        icon={FileCheck2}
        action={
          <Button type="button" icon={Download} disabled={exportDisabled} onClick={onCreateExport}>
            {exporting ? "Preparing..." : "Download Export"}
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Stat label="Bundle type" value={bundleLabel(selectedBundle)} />
          <Stat
            label="Selected campaigns"
            value={needsCampaignContext(selectedBundle) ? selectedCampaignIDs.length : "All"}
          />
          {usesObjectSelection(selectedBundle) && (
            <Stat
              label="Selected objects"
              value={selectedObjectIDs.length ? selectedObjectIDs.length : "All shown"}
            />
          )}
          <Stat label="Estimated size" value={estimatedSize} />
        </div>
        {(exporting || lastExport) && (
          <div className="mt-4">
            <ProgressStageList
              stages={exportProgressStages}
              completed={lastExport ? exportProgressStages.length : 3}
              activeIndex={lastExport ? -1 : 3}
            />
          </div>
        )}
        {lastExport && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{lastExport.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(lastExport.size)} · {formatCounts(lastExport.counts)}
              </p>
              {lastExport.downloadExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Download available until {new Date(lastExport.downloadExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button
              type="button"
              icon={Download}
              onClick={() => {
                window.location.assign(lastExport.downloadUrl);
              }}
            >
              Download
            </Button>
          </div>
        )}
      </SectionPanel>
      {lastExport && (
        <DependencyGraphPanel graph={lastExport.dependencyGraph} title="Export Dependency Graph" />
      )}
    </ContentStack>
  );
}

function CampaignContextPanel({
  campaigns,
  selectedBundle,
  selectedCampaignIDs,
  onToggleCampaign,
}: {
  campaigns: Campaign[];
  selectedBundle: ImportExportBundleType;
  selectedCampaignIDs: string[];
  onToggleCampaign: (campaignID: string) => void;
}) {
  return (
    <SectionPanel
      title={needsCampaignContext(selectedBundle) ? "Campaign Context" : "Scope"}
      icon={FolderArchive}
    >
      {needsCampaignContext(selectedBundle) ? (
        <CampaignChecklist
          campaigns={campaigns}
          selectedCampaignIDs={selectedCampaignIDs}
          onToggleCampaign={onToggleCampaign}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {selectedBundle === "everything"
            ? "Everything exports include every active campaign owned by the current account."
            : "This bundle exports from your user-owned library."}
        </p>
      )}
    </SectionPanel>
  );
}

function CampaignChecklist({
  campaigns,
  selectedCampaignIDs,
  onToggleCampaign,
}: {
  campaigns: Campaign[];
  selectedCampaignIDs: string[];
  onToggleCampaign: (campaignID: string) => void;
}) {
  if (!campaigns.length) {
    return (
      <p className="text-sm text-muted-foreground">No campaigns are available for this export.</p>
    );
  }
  return (
    <div className="grid gap-2">
      {campaigns.map((campaign) => (
        <label
          key={campaign.id}
          className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-background p-3 text-sm"
        >
          <input
            className="mt-1"
            type="checkbox"
            checked={selectedCampaignIDs.includes(campaign.id)}
            onChange={() => onToggleCampaign(campaign.id)}
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{campaign.name}</span>
            <span className="block text-xs text-muted-foreground">
              Updated {formatDate(campaign.updatedAt)}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ObjectSelectionPanel({
  objects,
  objectsLoading,
  selectedObjectIDs,
  onToggleObject,
}: {
  objects: ExportObjectChoice[];
  objectsLoading: boolean;
  selectedObjectIDs: string[];
  onToggleObject: (objectID: string) => void;
}) {
  return (
    <SectionPanel title="Objects to Export" icon={FileCheck2}>
      {objectsLoading ? (
        <p className="text-sm text-muted-foreground">Loading exportable objects...</p>
      ) : objects.length ? (
        <ObjectChecklist
          objects={objects}
          selectedObjectIDs={selectedObjectIDs}
          onToggleObject={onToggleObject}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No exportable objects were found for this bundle type.
        </p>
      )}
    </SectionPanel>
  );
}

function ObjectChecklist({
  objects,
  selectedObjectIDs,
  onToggleObject,
}: {
  objects: ExportObjectChoice[];
  selectedObjectIDs: string[];
  onToggleObject: (objectID: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        Select one or more objects. If none are selected, every object shown here is exported.
      </p>
      {objects.map((object) => (
        <label
          key={object.id}
          className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-background p-3 text-sm"
        >
          <input
            className="mt-1"
            type="checkbox"
            checked={selectedObjectIDs.includes(object.id)}
            onChange={() => onToggleObject(object.id)}
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{object.label}</span>
            {object.detail && (
              <span className="block text-xs text-muted-foreground">{object.detail}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
