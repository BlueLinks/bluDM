import { CheckCircle2, FileCheck2, GitMerge } from "lucide-react";
import type { ReactNode } from "react";
import { ContentStack } from "../components/layout";
import { Callout, SectionPanel } from "../components/ui";
import type {
  ImportExportHistoryRecord,
  ImportExportMergePlan,
  ImportExportMergeProvenance,
} from "../lib/api/importExport";
import { DependencyGraphPanel } from "./ImportPageDependencyGraph";
import {
  exportProgressStages,
  formatBytes,
  formatCounts,
  importProgressStages,
} from "./ImportPageSupport";
import { MergePreviewPanel } from "./ImportPageMergePreview";
import { ProgressStageList } from "./ImportPageUi";

export function HistoryInspector({ record }: { record: ImportExportHistoryRecord }) {
  const stages = record.action === "import" ? importProgressStages : exportProgressStages;
  const succeeded = record.status === "success";
  const completed = succeeded ? stages.length : Math.max(0, stages.length - 2);
  const activeIndex = succeeded ? -1 : Math.min(completed, stages.length - 1);
  const mergePlan = readMergePlan(record.manifestSummary);
  const provenance = readMergeProvenance(record.manifestSummary);
  const warnings = record.warnings ?? [];
  return (
    <ContentStack>
      <SectionPanel title="History Inspector" icon={FileCheck2}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InspectorStat label="Bundle" value={record.bundleType} />
          <InspectorStat label="Action" value={record.action} />
          <InspectorStat label="Version" value={`v${record.bundleVersion}`} />
          <InspectorStat label="Duration" value={`${record.durationMillis} ms`} />
          <InspectorStat label="Size" value={formatBytes(record.sizeBytes)} />
          <InspectorStat label="Source" value={record.sourceAppVersion || "local"} />
          <InspectorStat label="Objects" value={formatCounts(record.counts) || "0 objects"} />
          <InspectorStat label="Warnings" value={warnings.length} />
          {record.downloadExpiresAt && (
            <InspectorStat
              label="Download expiry"
              value={new Date(record.downloadExpiresAt).toLocaleString()}
            />
          )}
        </div>
        {record.downloadStatus && (
          <div className="mt-4">
            <Callout>{record.downloadStatus}</Callout>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mt-4 grid gap-2">
            {warnings.map((warning) => (
              <Callout key={warning} tone="danger">
                {warning}
              </Callout>
            ))}
          </div>
        )}
      </SectionPanel>
      {(mergePlan || provenance) && (
        <SectionPanel title="Merge History" icon={GitMerge}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {mergePlan && <MergeHistoryStats plan={mergePlan} />}
            {provenance && (
              <>
                <InspectorStat label="Imported From" value="Archive" />
                <InspectorStat
                  label="Import Date"
                  value={
                    provenance.importedAt
                      ? new Date(provenance.importedAt).toLocaleString()
                      : "Unknown"
                  }
                />
                <InspectorStat
                  label="Import Mode"
                  value={provenance.importMode || record.importMode}
                />
                <InspectorStat
                  label="Archive Version"
                  value={provenance.archiveVersion ?? record.bundleVersion}
                />
              </>
            )}
          </div>
          {mergePlan?.warnings.length ? (
            <div className="mt-4 grid gap-2">
              {mergePlan.warnings.map((warning) => (
                <Callout key={warning}>{warning}</Callout>
              ))}
            </div>
          ) : null}
          {provenance && <DeveloperProvenance provenance={provenance} />}
        </SectionPanel>
      )}
      {mergePlan && <MergePreviewPanel plan={mergePlan} />}
      <SectionPanel title="Progress Stages" icon={CheckCircle2}>
        <ProgressStageList
          stages={stages}
          completed={completed}
          activeIndex={activeIndex}
          failed={!succeeded}
        />
      </SectionPanel>
      <DependencyGraphPanel graph={record.dependencyGraph} title="Historical Dependency Graph" />
    </ContentStack>
  );
}

function MergeHistoryStats({ plan }: { plan: ImportExportMergePlan }) {
  return (
    <>
      <InspectorStat label="Planner Ready" value={plan.ready ? "Yes" : "No"} />
      <InspectorStat label="Creates" value={plan.summary.create} />
      <InspectorStat label="Reused" value={plan.summary.reuse} />
      <InspectorStat label="Renamed" value={plan.summary.rename} />
      <InspectorStat label="Skipped" value={plan.summary.skip} />
      <InspectorStat label="Blocked" value={plan.summary.block} />
      <InspectorStat label="Assets Reused" value={(plan.assetMatches ?? []).length} />
      <InspectorStat label="Warnings" value={plan.summary.warnings} />
    </>
  );
}

function DeveloperProvenance({ provenance }: { provenance: ImportExportMergeProvenance }) {
  return (
    <details className="mt-4 rounded-md border border-border bg-background p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground">
        Developer provenance
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InspectorStat
          label="Archive Fingerprint"
          value={shortHistoryReference(provenance.archiveFingerprint)}
        />
        <InspectorStat
          label="Original Export Ref"
          value={shortHistoryReference(provenance.originalExportedId)}
        />
        <InspectorStat
          label="Import Batch"
          value={shortHistoryReference(provenance.importBatchId)}
        />
        <InspectorStat label="Lineage" value={(provenance.mergeLineage ?? []).length || "None"} />
      </div>
    </details>
  );
}

function InspectorStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

function readMergePlan(summary: Record<string, unknown>): ImportExportMergePlan | null {
  const plan = summary.mergePlan;
  if (!plan || typeof plan !== "object") {
    return null;
  }
  const typed = plan as ImportExportMergePlan;
  return {
    ...typed,
    assetMatches: typed.assetMatches ?? [],
    blockedReplaces: typed.blockedReplaces ?? [],
    blockers: typed.blockers ?? [],
    conflicts: typed.conflicts ?? [],
    decisions: (typed.decisions ?? []).map((decision) => ({
      ...decision,
      dependencyImpact: decision.dependencyImpact ?? {
        assets: 0,
        internalRecords: 0,
        missingRequired: 0,
        objects: 0,
        optionalObjects: 0,
        requiredObjects: 0,
        standardReferences: 0,
      },
      fieldDiffs: decision.fieldDiffs ?? [],
      reasons: decision.reasons ?? [],
    })),
    entityMatches: typed.entityMatches ?? [],
    plannedCreates: typed.plannedCreates ?? [],
    plannedRenames: typed.plannedRenames ?? [],
    plannedReuses: typed.plannedReuses ?? [],
    plannedSkips: typed.plannedSkips ?? [],
    policies: typed.policies ?? [],
    unsupportedOperations: typed.unsupportedOperations ?? [],
    warnings: typed.warnings ?? [],
  };
}

function readMergeProvenance(summary: Record<string, unknown>): ImportExportMergeProvenance | null {
  const provenance = summary.mergeProvenance;
  if (!provenance || typeof provenance !== "object") {
    return null;
  }
  return provenance;
}

function shortHistoryReference(value?: string) {
  if (!value) return "Unknown";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
