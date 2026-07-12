import { Boxes, FilePenLine, Map, PackagePlus, Route, Swords, UserRound } from "lucide-react";
import type React from "react";
import type { LocationProfileInfo } from "./locationProfiles";

type LocationDetailTab =
  | "overview"
  | "places"
  | "inventory"
  | "people"
  | "encounters"
  | "notes"
  | "connections";

type TabConfig = {
  key: LocationDetailTab;
  label: string;
  icon: React.ElementType;
};

export function tabsForLocationProfile(profile: LocationProfileInfo): TabConfig[] {
  if (profile.profile === "shop") {
    return [
      { key: "overview", label: "Overview", icon: Map },
      { key: "inventory", label: "Inventory", icon: PackagePlus },
      { key: "people", label: "People", icon: UserRound },
      { key: "encounters", label: "Encounters", icon: Swords },
      { key: "notes", label: "Notes", icon: FilePenLine },
      { key: "connections", label: "Connections", icon: Route },
    ];
  }
  if (profile.profile === "room") {
    return [
      { key: "overview", label: "Overview", icon: Map },
      { key: "encounters", label: "Encounters", icon: Swords },
      { key: "people", label: "NPCs", icon: UserRound },
      { key: "notes", label: "Notes", icon: FilePenLine },
      { key: "connections", label: "Connected rooms", icon: Route },
    ];
  }
  if (profile.variant === "dungeon" || profile.variant === "floor") {
    return [
      { key: "overview", label: "Overview", icon: Map },
      { key: "places", label: profile.variant === "dungeon" ? "Floors" : "Rooms", icon: Boxes },
      { key: "encounters", label: "Encounters", icon: Swords },
      { key: "notes", label: "Notes", icon: FilePenLine },
      { key: "connections", label: "Connections", icon: Route },
    ];
  }
  if (profile.variant === "town") {
    return [
      { key: "overview", label: "Overview", icon: Map },
      { key: "places", label: "Places", icon: Boxes },
      { key: "people", label: "People", icon: UserRound },
      { key: "encounters", label: "Encounters", icon: Swords },
      { key: "notes", label: "Notes", icon: FilePenLine },
    ];
  }
  return [
    { key: "overview", label: "Overview", icon: Map },
    { key: "places", label: "Locations", icon: Boxes },
    { key: "encounters", label: "Encounters", icon: Swords },
    { key: "notes", label: "Notes", icon: FilePenLine },
    { key: "connections", label: "Connections", icon: Route },
  ];
}

export function CampaignWorldLocationModeTabs({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: LocationDetailTab;
  tabs: TabConfig[];
  onChange: (tab: LocationDetailTab) => void;
}) {
  return (
    <div className="campaign-world-mode-tabs overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-5 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 pt-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-surface-foreground hover:border-border hover:text-foreground",
              ].join(" ")}
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { LocationDetailTab };
