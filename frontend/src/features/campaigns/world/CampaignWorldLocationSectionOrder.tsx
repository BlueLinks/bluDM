import type React from "react";
import type { LocationDetailTab } from "./CampaignWorldLocationModeTabs";
import type { LocationProfileInfo } from "./locationProfiles";

export function sectionOrder(
  profile: LocationProfileInfo,
  sections: Record<string, React.ReactNode>,
  activeTab: LocationDetailTab = "overview",
) {
  const key = profile.profile === "container" ? (profile.variant ?? "region") : profile.profile;
  const order = ordersForTab(key, activeTab);
  return order.flatMap((name) => {
    const section = sections[name];
    return section
      ? [
          <div className={sectionSpanClass(key, name)} key={name}>
            {section}
          </div>,
        ]
      : [];
  });
}

function ordersForTab(profileKey: string, activeTab: LocationDetailTab) {
  const orders: Record<string, Record<LocationDetailTab, string[]>> = {
    region: {
      overview: ["mapCard", "childCard", "travelCard", "notesCard"],
      places: ["childCard", "mapCard", "travelCard", "linksCard"],
      inventory: ["childCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["linksCard", "travelCard"],
    },
    town: {
      overview: ["mapCard", "childCard", "npcsCard", "travelCard", "notesCard"],
      places: ["childCard", "mapCard", "linksCard"],
      inventory: ["childCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["travelCard", "linksCard"],
    },
    dungeon: {
      overview: ["mapCard", "childCard", "prepCard", "encountersCard"],
      places: ["childCard", "mapCard"],
      inventory: ["childCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["linksCard", "travelCard"],
    },
    floor: {
      overview: ["mapCard", "childCard", "prepCard", "encountersCard"],
      places: ["childCard", "mapCard"],
      inventory: ["childCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["linksCard"],
    },
    shop: {
      overview: ["npcsCard", "notesCard", "mapCard", "parentCard"],
      places: ["childCard", "parentCard", "mapCard"],
      inventory: ["stockCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["linksCard", "parentCard", "mapCard"],
    },
    room: {
      overview: ["mapCard", "prepCard", "encountersCard", "npcsCard", "notesCard"],
      places: ["mapCard", "parentCard", "childCard"],
      inventory: ["childCard"],
      people: ["npcsCard"],
      encounters: ["encountersCard"],
      notes: ["notesCard"],
      connections: ["linksCard", "mapCard", "parentCard"],
    },
  };
  return orders[profileKey]?.[activeTab] ?? orders[profileKey]?.overview ?? [];
}

function sectionSpanClass(profileKey: string, sectionName: string) {
  if (sectionName === "stockCard" || sectionName === "mapCard") return "xl:col-span-2";
  if (profileKey === "room" && sectionName === "notesCard") return "xl:col-span-2";
  return undefined;
}
