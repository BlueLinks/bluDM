import { Copy, MoreHorizontal, Pencil, Play, Plus, Swords, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Encounter } from "../../../types";
import { CampaignWorldEmptyState } from "./CampaignWorldEmptyState";

export function CampaignWorldLocationEncounters({
  actionLabel = "Add encounter",
  campaignId,
  encounters,
  onAddEncounter,
  onCloneEncounter = () => undefined,
  onDeleteEncounter = () => undefined,
  onStartEncounter = () => undefined,
}: {
  actionLabel?: string;
  campaignId: string;
  encounters: Encounter[];
  onAddEncounter?: () => void;
  onCloneEncounter?: (encounter: Encounter) => void;
  onDeleteEncounter?: (encounter: Encounter) => void;
  onStartEncounter?: (encounter: Encounter, test: boolean) => void;
}) {
  return (
    <CardSection>
      <SectionHeader
        action={
          onAddEncounter ? (
            <Button
              type="button"
              icon={Plus}
              size="sm"
              variant="secondary"
              onClick={onAddEncounter}
            >
              {actionLabel}
            </Button>
          ) : undefined
        }
        icon={Swords}
        meta={encounters.length ? `${encounters.length} ready to review` : undefined}
        title="Encounters"
      />
      {encounters.length ? (
        <>
          <EncounterStatusSummary encounters={encounters} />
          <div className="mt-3 grid gap-3">
            {encounters.map((encounter) => (
              <EncounterSceneCard
                campaignId={campaignId}
                encounter={encounter}
                key={encounter.id}
                onClone={onCloneEncounter}
                onDelete={onDeleteEncounter}
                onStart={onStartEncounter}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3">
          <CampaignWorldEmptyState
            icon={Swords}
            title="No encounters here yet"
            copy="Generate or add an encounter when this place needs a prepared scene."
          />
        </div>
      )}
    </CardSection>
  );
}

function EncounterSceneCard({
  campaignId,
  encounter,
  onClone,
  onDelete,
  onStart,
}: {
  campaignId: string;
  encounter: Encounter;
  onClone: (encounter: Encounter) => void;
  onDelete: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  return (
    <article className="grid min-w-0 gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {encounterStatusLabel(encounter.status)}
          </span>
          {encounter.roomNumber ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Room {encounter.roomNumber}
            </span>
          ) : null}
        </div>
        <h4 className="mt-2 font-semibold leading-tight [overflow-wrap:anywhere]">
          {encounter.name}
        </h4>
        {encounter.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            {encounter.description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-start justify-end gap-2">
        <Button type="button" icon={Play} size="sm" onClick={() => onStart(encounter, false)}>
          Run
        </Button>
        <details className="relative">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="h-4 w-4" />
            <span>More</span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 grid min-w-32 gap-1 rounded-md border border-border bg-card p-1 shadow-md">
            <button
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              type="button"
              onClick={() => onClone(encounter)}
            >
              <Copy className="h-4 w-4" />
              Clone
            </button>
            <Link
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              to={`/campaigns/${campaignId}/encounters/${encounter.id}/edit`}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              type="button"
              onClick={() => onDelete(encounter)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </details>
      </div>
    </article>
  );
}

function EncounterStatusSummary({ encounters }: { encounters: Encounter[] }) {
  const counts = encounters.reduce<Record<string, number>>((current, encounter) => {
    const status = (encounter.status || "unknown").trim().toLowerCase() || "unknown";
    current[status] = (current[status] ?? 0) + 1;
    return current;
  }, {});
  return (
    <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
      {Object.entries(counts).map(([status, count]) => (
        <span className={statusChipClass(status)} key={status}>
          {count} {status}
        </span>
      ))}
    </div>
  );
}

function statusChipClass(status: string) {
  if (["ready", "active", "running"].includes(status)) {
    return "rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[0.68rem] font-semibold text-success";
  }
  if (["draft", "planned", "planning"].includes(status)) {
    return "rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-[0.68rem] font-semibold text-warning";
  }
  return "rounded-md border border-border bg-background px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground";
}

function encounterStatusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "skipped") return "Skipped";
  return "Planned";
}
