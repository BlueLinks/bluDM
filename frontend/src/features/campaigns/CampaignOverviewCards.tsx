import { ClipboardList, Route, Swords, UsersRound } from "lucide-react";
import { DashboardCard } from "../../components/ui";
import type { CampaignDetail } from "../../types";

export function CampaignOverviewCards({ detail }: { detail: CampaignDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardCard
        icon={UsersRound}
        title="Player Characters"
        value={detail.playerCount}
        copy="Character cards show portrait, AC, current HP, temporary HP, and key passives."
      />
      <DashboardCard
        icon={ClipboardList}
        title="Encounters"
        value={detail.encounterCount}
        copy="Prepared encounters appear here with start and duplicate actions."
      />
      <DashboardCard
        icon={Swords}
        title="Campaign NPCs"
        value={detail.npcs.length}
        copy="Friendly NPCs, rivals, and recurring monsters linked to this campaign."
      />
      <DashboardCard
        icon={Route}
        title="Journeys"
        value={detail.journeyCount}
        copy="Saved routes with travel time, weather, assumptions, and DM notes."
      />
    </div>
  );
}
