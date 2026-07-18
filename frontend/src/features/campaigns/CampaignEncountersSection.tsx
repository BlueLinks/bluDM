import { ClipboardList, Copy, FlaskConical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyMini, SectionPanel } from "../../components/ui";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { Creature, Encounter, Player } from "../../types";
import { CampaignEncounterCreateDialog } from "./CampaignEncounterCreateDialog";
import type { CampaignLocation } from "./world/travelTypes";

const encounterStatusLabel = (status: string) =>
  encounterStatusOptions.find((option) => option.value === status)?.label ?? "Planned";

export function CampaignEncountersSection({
  campaignID,
  encounterOpen,
  encounters,
  locations,
  npcs,
  players,
  onClone,
  onOpenChange,
  onRemove,
  onStart,
  onCreated,
}: {
  campaignID: string;
  encounterOpen: boolean;
  encounters: Encounter[];
  locations: CampaignLocation[];
  npcs: Creature[];
  players: Player[];
  onClone: (encounter: Encounter) => void;
  onOpenChange: (open: boolean) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
  onCreated?: () => Promise<void> | void;
}) {
  return (
    <SectionPanel title="Encounters" icon={ClipboardList}>
      {encounters.length === 0 ? (
        <EmptyMini copy="No encounters yet. Create one here, then open the full builder to add players, allies, and enemies." />
      ) : (
        <div className="grid gap-3">
          {encounters.map((encounter) => (
            <CampaignEncounterCard
              campaignID={campaignID}
              encounter={encounter}
              key={encounter.id}
              onClone={onClone}
              onRemove={onRemove}
              onStart={onStart}
            />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <CampaignEncounterCreateDialog
          campaignId={campaignID}
          locations={locations}
          npcs={npcs}
          open={encounterOpen}
          players={players}
          trigger={
            <Button type="button" icon={Plus}>
              Add encounter
            </Button>
          }
          onCreated={onCreated}
          onOpenChange={onOpenChange}
        />
        <Button type="button" variant="secondary" disabled>
          Import encounter
        </Button>
      </div>
    </SectionPanel>
  );
}

export function CampaignEncounterCard({
  campaignID,
  encounter,
  onClone,
  onRemove,
  onStart,
}: {
  campaignID: string;
  encounter: Encounter;
  onClone: (encounter: Encounter) => void;
  onRemove?: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{encounter.name}</div>
          {encounter.description && (
            <p className="mt-1 text-sm text-muted-foreground">{encounter.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={encounter.status === "completed" ? "published" : "draft"}>
              {encounterStatusLabel(encounter.status)}
            </Badge>
            {encounter.location && <Badge tone="shared">{encounter.location}</Badge>}
            {encounter.roomNumber && <Badge tone="metadata">Room {encounter.roomNumber}</Badge>}
            <Badge tone="info">{encounter.combatantCount} combatants</Badge>
            <Badge tone="warning">{encounter.enemyCount} enemies</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" icon={Play} size="sm" onClick={() => onStart(encounter, false)}>
            Run
          </Button>
          <Button
            type="button"
            icon={FlaskConical}
            size="sm"
            variant="tertiary"
            onClick={() => onStart(encounter, true)}
          >
            Test
          </Button>
          <Link to={`/campaigns/${campaignID}/encounters/${encounter.id}/edit`}>
            <Button type="button" icon={Pencil} size="sm" variant="secondary">
              Edit
            </Button>
          </Link>
          <Button
            type="button"
            icon={Copy}
            size="sm"
            variant="secondary"
            onClick={() => onClone(encounter)}
          >
            Clone
          </Button>
          {onRemove ? (
            <Button
              type="button"
              icon={Trash2}
              size="sm"
              variant="danger"
              onClick={() => onRemove(encounter)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
