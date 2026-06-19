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
        meta={`${encounters.length} attached`}
        title="Encounters"
      />
      {encounters.length ? (
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
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No encounters attached to this location yet.
        </p>
      )}
    </CardSection>
  );
}
