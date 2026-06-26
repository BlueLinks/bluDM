import type React from "react";
import type { LocationProfileInfo } from "./locationProfiles";

export function sectionOrder(
  profile: LocationProfileInfo,
  sections: Record<string, React.ReactNode>,
) {
  const orders: Record<string, string[]> = {
    region: [
      "mapCard",
      "childCard",
      "travelCard",
      "linksCard",
      "notesCard",
      "encountersCard",
      "npcsCard",
    ],
    town: [
      "mapCard",
      "childCard",
      "npcsCard",
      "travelCard",
      "notesCard",
      "encountersCard",
      "linksCard",
    ],
    dungeon: [
      "structureCard",
      "childCard",
      "prepCard",
      "mapCard",
      "encountersCard",
      "linksCard",
      "notesCard",
      "npcsCard",
      "travelCard",
    ],
    floor: [
      "mapCard",
      "childCard",
      "prepCard",
      "encountersCard",
      "linksCard",
      "notesCard",
      "npcsCard",
    ],
    shop: [
      "stockCard",
      "pricingCard",
      "npcsCard",
      "notesCard",
      "mapCard",
      "parentCard",
      "encountersCard",
      "linksCard",
      "childCard",
    ],
    room: [
      "notesCard",
      "prepCard",
      "encountersCard",
      "linksCard",
      "npcsCard",
      "mapCard",
      "parentCard",
      "childCard",
    ],
  };
  const key = profile.profile === "container" ? (profile.variant ?? "region") : profile.profile;
  return orders[key].flatMap((name) => {
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

function sectionSpanClass(profileKey: string, sectionName: string) {
  if (sectionName === "stockCard" || sectionName === "mapCard") return "xl:col-span-2";
  if (profileKey === "room" && sectionName === "notesCard") return "xl:col-span-2";
  return undefined;
}
