import { ExternalLink, Plus, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Encounter } from "../../../types";

export function CampaignWorldLocationEncounters({
  actionLabel = "Add encounter",
  campaignId,
  encounters,
  onAddEncounter,
}: {
  actionLabel?: string;
  campaignId: string;
  encounters: Encounter[];
  onAddEncounter?: () => void;
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
          <div className="mt-3 grid gap-2">
            {encounters.map((encounter) => (
              <div
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
                key={encounter.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="[overflow-wrap:anywhere] font-semibold">{encounter.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {[encounter.status, encounter.roomNumber ? `Room ${encounter.roomNumber}` : ""]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
                <Link
                  className="shrink-0"
                  to={`/campaigns/${campaignId}/encounters/${encounter.id}/edit`}
                >
                  <Button type="button" icon={ExternalLink} size="sm" variant="ghost">
                    Open
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No encounters attached to this location yet.
        </p>
      )}
    </CardSection>
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
    return "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-bold uppercase text-emerald-700 dark:text-emerald-200";
  }
  if (["draft", "planned", "planning"].includes(status)) {
    return "rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.68rem] font-bold uppercase text-amber-700 dark:text-amber-200";
  }
  return "rounded-full border border-border bg-background px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground";
}
