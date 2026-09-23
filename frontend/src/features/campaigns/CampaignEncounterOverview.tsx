import { ClipboardList, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, SectionPanel } from "../../components/ui";
import type { EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Creature, Encounter, Player } from "../../types";
import { EncounterList } from "../encounters/EncounterList";
import { CampaignEncounterCreateDialog } from "./CampaignEncounterCreateDialog";
import type { CampaignLocation } from "./world/travelTypes";

export function CampaignEncounterOverview({
  allowedStandardSources,
  campaignId,
  difficultyRuleset,
  encounterOpen,
  encounters,
  locations,
  npcs,
  players,
  onCreated,
  onOpenChange,
  onRemove,
  onStart,
}: {
  allowedStandardSources: string[];
  campaignId: string;
  difficultyRuleset: EncounterRuleset;
  encounterOpen: boolean;
  encounters: Encounter[];
  locations: CampaignLocation[];
  npcs: Creature[];
  players: Player[];
  onCreated: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  return (
    <SectionPanel
      className="min-w-0"
      title={`Encounters · ${encounters.length}`}
      icon={ClipboardList}
      action={
        <div className="flex flex-wrap gap-2">
          <CampaignEncounterCreateDialog
            allowedStandardSources={allowedStandardSources}
            campaignId={campaignId}
            difficultyRuleset={difficultyRuleset}
            locations={locations}
            npcs={npcs}
            open={encounterOpen}
            players={players}
            trigger={
              <Button type="button" icon={Plus} size="sm" variant="secondary">
                Add
              </Button>
            }
            onCreated={onCreated}
            onOpenChange={onOpenChange}
          />
          <Link to={`/campaigns/${campaignId}/encounters`}>
            <Button type="button" size="sm" variant="outline">
              View all
            </Button>
          </Link>
        </div>
      }
    >
      <EncounterList
        campaignId={campaignId}
        encounters={encounters}
        onRemove={onRemove}
        onStart={onStart}
      />
    </SectionPanel>
  );
}
