import { GitMerge } from "lucide-react";
import { Badge, Callout, SectionPanel } from "../components/ui";
import type {
  ImportExportMergeFieldDiff,
  ImportExportMergePlan,
  ImportExportMergePlanDecision,
  ImportExportMergeProvenance,
} from "../lib/api/importExport";
import { formatDate, resolutionLabel } from "./ImportPageSupport";
import { Stat } from "./ImportPageUi";

export function MergePreviewPanel({ plan }: { plan: ImportExportMergePlan }) {
  const decisions = plan.decisions ?? [];
  const warnings = plan.warnings ?? [];
  const conflicts = plan.conflicts ?? [];
  const assetMatches = plan.assetMatches ?? [];
  const grouped = groupMergeDecisions(decisions);
  const summary = [
    ["Creates", plan.summary.create],
    ["Reuses", plan.summary.reuse],
    ["Renames", plan.summary.rename],
    ["Skips", plan.summary.skip],
    ["Blocked", plan.summary.block],
    ["Assets reused", assetMatches.length],
  ];
  return (
    <SectionPanel title="Merge Planner Preview" icon={GitMerge}>
      <Callout>
        No data has been written. Merge execution only runs the safe planner-approved actions shown
        here and rolls back if any step fails.
      </Callout>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {summary.map(([label, value]) => (
          <Stat key={String(label)} label={String(label)} value={value} />
        ))}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 grid gap-2">
          {warnings.map((warning) => (
            <Callout key={warning}>{warning}</Callout>
          ))}
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="mt-4 grid gap-2">
          <h4 className="text-sm font-semibold">Conflicts</h4>
          {conflicts.slice(0, 6).map((conflict) => (
            <Callout
              tone={conflict.severity === "danger" ? "danger" : "default"}
              key={conflict.message}
            >
              {conflict.message}
            </Callout>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-3">
        {grouped.map(([kind, decisions]) => (
          <details className="rounded-md border border-border bg-background p-3" key={kind} open>
            <summary className="cursor-pointer text-sm font-semibold">
              {mergeKindLabel(kind)} · {decisions.length}
            </summary>
            <div className="mt-3 grid gap-2">
              {decisions.map((decision) => (
                <MergeDecisionRow
                  decision={decision}
                  key={`${decision.kind}-${decision.label}-${decision.action}`}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </SectionPanel>
  );
}

function MergeDecisionRow({ decision }: { decision: ImportExportMergePlanDecision }) {
  const fieldDiffs = decision.fieldDiffs ?? [];
  const changedFields = fieldDiffs.filter((diff) => diff.status !== "same");
  const unchangedFields = fieldDiffs.length - changedFields.length;
  const finalAction = decision.userDecision || decision.action;
  const impact = decision.dependencyImpact ?? emptyDependencyImpact;
  const reasons = decision.reasons ?? [];
  return (
    <details className="rounded-md border border-border bg-card p-3 text-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{decision.label}</span>
          <Badge tone={decision.severity === "warning" ? "warning" : "metadata"}>
            {resolutionLabel(decision.action)}
          </Badge>
          <Badge tone="info">{decision.confidence || "high"} confidence</Badge>
          {changedFields.length > 0 && (
            <Badge tone="warning">{changedFields.length} field changes</Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">{reasons[0] || "Planner decision"}</p>
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ReviewFact
            label="Existing object"
            value={decision.existingId ? decision.label : "None"}
          />
          <ReviewFact label="Imported object" value={decision.label} />
          <ReviewFact label="Recommendation" value={resolutionLabel(decision.action)} />
          <ReviewFact label="Final action" value={resolutionLabel(finalAction)} />
          <ReviewFact
            label="Rule"
            value={resolutionLabel(decision.matchedRule || decision.code || "planner")}
          />
          <ReviewFact label="Confidence" value={decision.confidence || "high"} />
          <ReviewFact label="Dependencies" value={`${impact.objects} objects`} />
          <ReviewFact label="Assets" value={`${impact.assets} assets`} />
        </div>
        <DependencySummary impact={impact} />
        {fieldDiffs.length > 0 && (
          <FieldDiffViewer
            diffs={fieldDiffs}
            unchangedFields={unchangedFields}
            finalAction={finalAction}
          />
        )}
        <ProvenanceSummary provenance={decision.provenance} />
        {reasons.length > 1 && (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Reasons</p>
            <ul className="mt-2 grid gap-1 text-muted-foreground">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function ReviewFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

const emptyDependencyImpact = {
  objects: 0,
  requiredObjects: 0,
  optionalObjects: 0,
  internalRecords: 0,
  assets: 0,
  standardReferences: 0,
  missingRequired: 0,
};

function DependencySummary({ impact }: { impact: typeof emptyDependencyImpact }) {
  const rows = [
    ["Required", impact.requiredObjects],
    ["Optional", impact.optionalObjects],
    ["Child records", impact.internalRecords],
    ["Standard refs", impact.standardReferences],
    ["Missing required", impact.missingRequired],
  ];
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Dependencies and child collections
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map(([label, value]) => (
          <span className="text-muted-foreground" key={String(label)}>
            <span className="font-semibold text-foreground">{value}</span> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FieldDiffViewer({
  diffs,
  finalAction,
  unchangedFields,
}: {
  diffs: ImportExportMergeFieldDiff[];
  finalAction: string;
  unchangedFields: number;
}) {
  const changed = diffs.filter((diff) => diff.status !== "same");
  const visible = changed.length > 0 ? changed : diffs.slice(0, 8);
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Field diff</p>
        {unchangedFields > 0 && <Badge tone="success">{unchangedFields} unchanged</Badge>}
      </div>
      <div className="mt-3 grid gap-2">
        {visible.map((diff) => (
          <div className="rounded-md border border-border bg-card p-3" key={diff.field}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{fieldLabel(diff.field)}</span>
              <Badge tone={diff.status === "added" ? "imported" : "default"}>
                {resolutionLabel(diff.status)}
              </Badge>
              {diff.recommendation && (
                <Badge tone="info">{resolutionLabel(diff.recommendation)}</Badge>
              )}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <DiffValue label="Existing" value={diff.existing} />
              <DiffValue label="Imported" value={diff.imported} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Planner recommendation flows into final action: {resolutionLabel(finalAction)}.
      </p>
    </div>
  );
}

function DiffValue({ label, value }: { label: string; value: unknown }) {
  const formatted = formatDiffValue(value);
  const structured = typeof formatted !== "string";
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      {structured ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-sm font-semibold">Structured value</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs">
            {JSON.stringify(formatted, null, 2)}
          </pre>
        </details>
      ) : (
        <p className="mt-1 break-words font-semibold">{formatted}</p>
      )}
    </div>
  );
}

function ProvenanceSummary({ provenance }: { provenance?: ImportExportMergeProvenance }) {
  if (!provenance) {
    return null;
  }
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Provenance</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <span>Imported from archive</span>
        <span>{provenance.importedAt ? formatDate(provenance.importedAt) : "Unknown date"}</span>
        <span>{resolutionLabel(provenance.importMode || "merge")}</span>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground">
          Developer details
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <ReviewFact label="Archive version" value={provenance.archiveVersion ?? "Unknown"} />
          <ReviewFact
            label="Archive fingerprint"
            value={shortReference(provenance.archiveFingerprint)}
          />
          <ReviewFact
            label="Original export ref"
            value={shortReference(provenance.originalExportedId)}
          />
          <ReviewFact label="Import batch" value={shortReference(provenance.importBatchId)} />
          <ReviewFact label="Lineage" value={(provenance.mergeLineage ?? []).length || "None"} />
        </div>
      </details>
    </div>
  );
}

function groupMergeDecisions(decisions: ImportExportMergePlanDecision[]) {
  const order = [
    "campaign",
    "dungeon",
    "shop",
    "encounter",
    "npc",
    "player",
    "item",
    "spell",
    "map",
    "journey",
    "roll table",
    "asset",
  ];
  const groups = new Map<string, ImportExportMergePlanDecision[]>();
  decisions
    .filter((decision) => !decision.kind.startsWith("standard"))
    .forEach((decision) =>
      groups.set(decision.kind, [...(groups.get(decision.kind) ?? []), decision]),
    );
  return [...groups.entries()].sort(([left], [right]) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function mergeKindLabel(kind: string) {
  return kind
    .split(" ")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldLabel(field: string) {
  return field.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function formatDiffValue(value: unknown): string | Record<string, unknown> | unknown[] {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return "Empty";
    }
    if (value.every((item) => item === null || typeof item !== "object")) {
      return value.map((item) => String(item)).join(", ");
    }
    return value.map((item) => item as unknown);
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "symbol") {
    return value.description || "Symbol";
  }
  if (typeof value === "function") {
    return "Function";
  }
  return "Unsupported value";
}

function shortReference(value?: string) {
  if (!value) return "Unknown";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
