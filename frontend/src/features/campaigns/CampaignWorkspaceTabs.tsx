import { Castle, Map } from "lucide-react";
import { NavLink } from "react-router-dom";

export function CampaignWorkspaceTabs({ campaignId }: { campaignId: string }) {
  const tabs = [
    { to: `/campaigns/${campaignId}`, label: "Overview", icon: Castle, end: true },
    { to: `/campaigns/${campaignId}/world`, label: "World", icon: Map, end: false },
  ];

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Campaign workspace sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          end={tab.end}
          to={tab.to}
          className={({ isActive }) =>
            [
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
            ].join(" ")
          }
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
