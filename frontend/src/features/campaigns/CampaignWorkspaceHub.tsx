import { ClipboardList, Map, Route, Swords, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveGrid } from "../../components/layout";
import { FeatureCard } from "../../components/layout";
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
        {cards.map((card, index) => (
          <FeatureCard
            action={
              <Link to={card.to}>
                <Button type="button" size="sm" variant="secondary">
                  {card.cta}
                </Button>
              </Link>
            }
            copy={card.copy}
            icon={card.icon}
            key={card.title}
            tone={
              ["primary", "secondary", "tertiary", "accent", "secondary"][index] as
                | "primary"
                | "secondary"
                | "tertiary"
                | "accent"
            }
            title={card.title}
            value={card.value}
          />
        ))}
      </ResponsiveGrid>
    </SectionPanel>
  );
}
