import { ClipboardList, Route, Swords, UsersRound } from "lucide-react";
import { ResponsiveGrid } from "../../components/layout";
import { MetricCard } from "../../components/layout";
import type { CampaignDetail } from "../../types";

export function CampaignOverviewCards({ detail }: { detail: CampaignDetail }) {
  return (
    <ResponsiveGrid variant="cards4">
      <MetricCard
        icon={UsersRound}
        label="Player Characters"
        tone="primary"
        value={detail.playerCount}
        detail="Character cards show portrait, AC, current HP, temporary HP, and key passives."
      />
      <MetricCard
        icon={ClipboardList}
        label="Encounters"
        tone="secondary"
        value={detail.encounterCount}
        detail="Prepared encounters appear here with start and duplicate actions."
      />
      <MetricCard
        icon={Swords}
        label="Campaign NPCs"
        tone="tertiary"
        value={detail.npcs.length}
        detail="Friendly NPCs, rivals, and recurring monsters linked to this campaign."
      />
      <MetricCard
        icon={Route}
        label="Travel"
        tone="accent"
        value={detail.locationCount}
        detail="Saved campaign locations plus a pop-up travel time and weather calculator."
      />
    </ResponsiveGrid>
  );
}
