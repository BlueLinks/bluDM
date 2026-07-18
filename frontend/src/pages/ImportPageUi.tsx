import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileCheck2,
  Lock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import { FeatureCard, MetricCard } from "../components/layout";
import { Badge, Callout, SectionPanel } from "../components/ui";
import type { ImportExportConflict, ImportExportPreview } from "../lib/api/importExport";
import type { BundleOption, HistoryRow, ProgressStage } from "./ImportPageSupport";
import { ArchiveVerificationPanel } from "./ImportPageArchiveVerification";
import { DependencyGraphPanel } from "./ImportPageDependencyGraph";
import {
  bundleLabel,
  bundleOptions,
  formatBytes,
  formatDate,
  resolutionLabel,
} from "./ImportPageSupport";

export function BundleGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {bundleOptions.map((option, index) => (
        <FeatureCard
          action={!option.supported ? <Badge tone="draft">Coming Soon</Badge> : undefined}
          className={!option.supported ? "opacity-70" : ""}
          copy={option.copy}
          icon={option.icon}
          key={option.key}
          tone={
            ["primary", "secondary", "tertiary"][index % 3] as "primary" | "secondary" | "tertiary"
          }
          title={option.label}
        />
      ))}
    </div>
  );
}

export function BundleSelectRow({
  option,
  selected,
  onClick,
}: {
  option: BundleOption;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!option.supported}
      className={[
        "flex min-w-0 items-start gap-3 rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        selected
          ? "border-accent bg-accent text-accent-foreground shadow-sm"
          : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
        !option.supported ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <option.icon
        className={[
          "mt-0.5 h-5 w-5 shrink-0",
          selected ? "text-accent-foreground" : "text-accent",
        ].join(" ")}
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {option.label}
          {!option.supported && <Badge tone="draft">Coming Soon</Badge>}
        </span>
        <span
          className={[
            "mt-1 block text-sm",
            selected ? "text-accent-foreground" : "text-surface-foreground",
          ].join(" ")}
        >
          {option.copy}
        </span>
      </span>
    </button>
  );
}

export function DropZone({
  file,
  onChooseFile,
}: {
  file: File | null;
  onChooseFile: (file: File | null) => void;
}) {
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    onChooseFile(event.dataTransfer.files.item(0));
  }
  return (
    <label
      className="grid cursor-pointer place-items-center gap-3 rounded-lg border border-dashed border-accent bg-accent/5 p-8 text-center transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <UploadCloud className="h-10 w-10 text-accent" />
      <span className="font-semibold">
        {file ? file.name : "Drag and drop a .zip export file here"}
      </span>
      <span className="text-sm text-muted-foreground">or choose a file from disk</span>
      <input
        className="sr-only"
        type="file"
        accept=".zip,application/zip"
        onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)}
      />
      <span className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
        Choose File
      </span>
    </label>
  );
}

export function PreviewPanel({ preview }: { preview: ImportExportPreview }) {
  const internalRecords = preview.dependencyGraph.projection?.counts.internalRecords ?? 0;
  const previewEntities =
    preview.summary?.entities.filter((entity) => entity.root || !entity.asset).slice(0, 8) ?? [];
  const stats = [
    ["Bundle type", bundleLabel(preview.bundleType)],
    ["Bundle version", `v${preview.version}`],
    ["Exported", formatDate(preview.exportedAt)],
    ["Source version", preview.sourceAppVersion || "local"],
    ["Campaigns", preview.counts.campaigns ?? 0],
    ["Encounters", preview.counts.encounters ?? 0],
    ["Players", preview.counts.players ?? 0],
    ["NPCs", preview.counts.npcs ?? 0],
    ["Maps", preview.counts.maps ?? 0],
    ["Locations", preview.counts.locations ?? 0],
    ["Journeys", preview.counts.journeys ?? 0],
    ["Roll tables", preview.counts.rollTables ?? 0],
    ["Spells", preview.counts.spells ?? 0],
    ["Items", preview.counts.items ?? 0],
    ["Assets", preview.counts.assets ?? 0],
    ["Internal records", internalRecords],
    ["Estimated size", formatBytes(preview.estimatedBytes)],
  ];
  return (
    <>
      <SectionPanel title="Import Preview" icon={FileCheck2}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value]) => (
            <Stat key={String(label)} label={String(label)} value={value} />
          ))}
        </div>
        {preview.warnings.length > 0 && (
          <div className="mt-4 grid gap-2">
            {preview.warnings.map((warning) => (
              <Callout key={warning} tone="warning">
                {warning}
              </Callout>
            ))}
          </div>
        )}
        {preview.unsupported.length > 0 && (
          <div className="mt-4 grid gap-2">
            {preview.unsupported.map((item) => (
              <Callout tone="danger" key={item}>
                {item}
              </Callout>
            ))}
          </div>
        )}
        {previewEntities.length > 0 && (
          <div className="mt-4 grid gap-2">
            <h4 className="text-sm font-semibold">High-level entities</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {previewEntities.map((entity, index) => (
                <FeatureCard
                  key={entity.id}
                  tone={
                    ["primary", "secondary", "tertiary", "accent"][index % 4] as
                      | "primary"
                      | "secondary"
                      | "tertiary"
                      | "accent"
                  }
                  title={entity.label}
                  value={
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge tone="info">{entity.kind}</Badge>
                      {entity.root && <Badge tone="published">Root</Badge>}
                    </div>
                  }
                  copy={
                    entity.internalRecords
                      ? `${entity.internalRecords} internal record${entity.internalRecords === 1 ? "" : "s"} grouped under this object.`
                      : "No internal records grouped under this object."
                  }
                />
              ))}
            </div>
          </div>
        )}
      </SectionPanel>
      <ArchiveVerificationPanel preview={preview} />
      <DependencyGraphPanel graph={preview.dependencyGraph} title="Import Dependency Graph" />
    </>
  );
}

export function ConflictPanel({ conflicts }: { conflicts: ImportExportConflict[] }) {
  return (
    <SectionPanel title="Resolve Conflicts" icon={AlertTriangle}>
      {conflicts.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                {["Type", "Name", "Default", "Status"].map((header) => (
                  <th className="px-3 py-2" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conflicts.map((conflict) => (
                <tr
                  className="border-t border-border"
                  key={`${conflict.kind}-${conflict.importedId}-${conflict.name}`}
                >
                  <td className="px-3 py-3 capitalize">{conflict.entityKind || conflict.kind}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{conflict.message || conflict.name}</p>
                    {conflict.impact && (
                      <p className="mt-1 text-xs text-muted-foreground">{conflict.impact}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">{resolutionLabel(conflict.default)}</td>
                  <td className="px-3 py-3">
                    {conflict.blocking ? (
                      <Badge tone="danger">Blocked</Badge>
                    ) : (
                      <Badge tone="success">Safe default</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No blocking conflicts were found. Name collisions will be renamed during clone import.
        </p>
      )}
    </SectionPanel>
  );
}

export type ImportMode = "clone" | "restore" | "merge";

export function ImportModeCards({
  compact = false,
  onSelect,
  restoreReady = false,
  selected = "clone",
}: {
  compact?: boolean;
  onSelect?: (mode: ImportMode) => void;
  restoreReady?: boolean;
  selected?: ImportMode;
}) {
  const modes = [
    ["clone", "Clone", "Import as new content with new IDs.", true],
    [
      "restore",
      "Restore",
      restoreReady
        ? "Restore original IDs into this empty account."
        : "Requires archive validation and an empty account.",
      true,
    ],
    ["merge", "Merge", "Preview and execute planner-approved safe actions.", true],
  ] as const;
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3"}>
      {modes.map(([key, label, copy, enabled]) => (
        <button
          type="button"
          disabled={!enabled}
          onClick={() => onSelect?.(key)}
          className={[
            "rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            selected === key
              ? "border-accent bg-accent text-accent-foreground shadow-sm"
              : "border-border bg-surface text-surface-foreground opacity-70 hover:bg-card hover:text-foreground",
            enabled ? "cursor-pointer" : "cursor-not-allowed",
          ].join(" ")}
          key={label}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className={selected === key ? "text-accent-foreground" : "text-muted-foreground"}>
              ●
            </span>
            {label}
            {key === "merge" && <Badge tone="metadata">Planner</Badge>}
          </div>
          <p
            className={[
              "mt-1 text-sm",
              selected === key ? "text-accent-foreground" : "text-surface-foreground",
            ].join(" ")}
          >
            {copy}
          </p>
        </button>
      ))}
    </div>
  );
}

export function StepTrack({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
      {["Upload File", "Preview", "Resolve Conflicts", "Import"].map((label, index) => {
        const step = index + 1;
        return (
          <div className="flex items-center gap-2" key={label}>
            <span
              className={[
                "grid h-7 w-7 place-items-center rounded-full text-xs font-bold shadow-sm",
                step <= activeStep
                  ? "bg-accent text-accent-foreground"
                  : "bg-companion-metadata/10 text-companion-metadata",
              ].join(" ")}
            >
              {step}
            </span>
            <span className="text-sm font-semibold">{label}</span>
            {step < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

export function ProgressStageList({
  activeIndex = -1,
  completed,
  failed = false,
  stages,
}: {
  activeIndex?: number;
  completed: number;
  failed?: boolean;
  stages: ProgressStage[];
}) {
  return (
    <ol className="grid gap-2">
      {stages.map((stage, index) => {
        const complete = index < completed;
        const active = index === activeIndex;
        const failedHere = failed && active;
        const Icon = failedHere
          ? AlertTriangle
          : complete
            ? CheckCircle2
            : active
              ? Loader2
              : Circle;
        return (
          <li
            className={[
              "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3",
              active ? "border-accent" : "",
              failedHere ? "border-destructive" : "",
            ].join(" ")}
            key={stage.key}
          >
            <Icon
              className={[
                "mt-0.5 h-4 w-4 shrink-0",
                complete ? "text-success" : active ? "text-accent" : "text-muted-foreground",
                active && !failedHere ? "animate-spin" : "",
                failedHere ? "text-destructive" : "",
              ].join(" ")}
            />
            <span className="min-w-0">
              <span className="block font-semibold">{stage.label}</span>
              <span className="block text-sm text-muted-foreground">{stage.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SafetyStrip() {
  const items = [
    ["Safe & Transactional", "Imports are all-or-nothing.", ShieldCheck],
    ["ID Remapping", "Relationships get new safe IDs.", RefreshCw],
    ["Versioned Format", "Bundles carry manifest versions.", FileCheck2],
    ["Secure", "ZIPs are validated before use.", Lock],
    ["Preview First", "Review before import.", CheckCircle2],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([title, copy, Icon]) => (
        <div
          className="flex items-start gap-3 rounded-md border border-border bg-surface p-3"
          key={title}
        >
          <Icon className="h-5 w-5 shrink-0 text-accent" />
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 text-sm">
      {items.map((item) => (
        <li className="flex items-start gap-2" key={item}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ToggleRow({
  checked,
  disabled = false,
  label,
  note,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  note?: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 text-sm">
      <input
        className="mt-1"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        <span className="font-semibold">{label}</span>
        {note && <span className="ml-2 text-xs text-muted-foreground">{note}</span>}
      </span>
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <MetricCard label={label} tone="tertiary" value={value} />;
}

export function HistoryList({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div
          className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
          key={row.id}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.bundleType} · {row.action} · {row.size}
            </p>
          </div>
          <Badge tone="published">{row.status}</Badge>
        </div>
      ))}
    </div>
  );
}
