import { ClipboardList, Map, Route, Swords, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveGrid } from "../../components/layout";
import { Button, SectionPanel } from "../../components/ui";
import type { CampaignDetail } from "../../types";
import type { CampaignJourney } from "./world/travelTypes";

export function CampaignWorkspaceHub({
  campaignId,
  detail,
  journeys,
}: {
  campaignId: string;
  detail: CampaignDetail;
  journeys: CampaignJourney[];
}) {
  const cards = [
    {
      title: "World workspace",
      copy: "Build nested regions, towns, shops, rooms, NPC links, stock, and encounter hooks.",
      value: `${detail.locationCount} locations`,
      to: `/campaigns/${campaignId}/world`,
      cta: "Open world",
      icon: Map,
    },
    {
      title: "Encounters",
      copy: "Prep scenes, attach them to world locations, and launch play without leaving the campaign.",
      value: `${detail.encounterCount} ready`,
      to: "#campaign-encounters",
      cta: "Jump to encounters",
      icon: ClipboardList,
    },
    {
      title: "Party",
      copy: "Review current character state, long rest the table, and keep the active roster tidy.",
      value: `${detail.playerCount} players`,
      to: "#campaign-party",
      cta: "Jump to party",
      icon: UsersRound,
    },
    {
      title: "NPC roster",
      copy: "Link recurring creatures to the campaign so they are always at hand during prep and play.",
      value: `${detail.npcs.length} linked`,
      to: "#campaign-npcs",
      cta: "Jump to NPCs",
      icon: Swords,
    },
    {
      title: "Travel",
      copy: "Keep reusable route calculations and weather assumptions for the roads the party revisits.",
      value: `${journeys.length} saved journeys`,
      to: "#campaign-travel",
      cta: "Jump to travel",
      icon: Route,
    },
  ];

  return (
    <SectionPanel title="Workspace" icon={Map}>
      <ResponsiveGrid variant="cards3">
        {cards.map((card) => (
          <article className="rounded-md border border-border bg-background p-4" key={card.title}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-accent">{card.value}</div>
                <h4 className="mt-1 font-semibold">{card.title}</h4>
              </div>
              <card.icon className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{card.copy}</p>
            <div className="mt-4">
              <Link to={card.to}>
                <Button type="button" size="sm" variant="secondary">
                  {card.cta}
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </ResponsiveGrid>
    </SectionPanel>
  );
}
