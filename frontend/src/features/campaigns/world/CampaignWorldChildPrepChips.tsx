import { StatChip } from "../../../components/shared/displayPrimitives";
import type { Encounter } from "../../../types";
import { locationProfile } from "./locationProfiles";
import type {
  CampaignLocation,
  CampaignLocationLink,
  CampaignMap,
  CampaignNpcLocationLink,
} from "./travelTypes";

export type ChildPrepChip = {
  label: string;
  tone: "primary" | "secondary" | "shared" | "tertiary" | "warning";
};

export function ChildPrepChips({ chips }: { chips?: ChildPrepChip[] }) {
  if (!chips?.length) return null;
  return (
    <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
      {chips.map((chip) => (
        <StatChip
          className="rounded-full py-0.5 text-[0.68rem] uppercase"
          key={chip.label}
          label={chip.label}
          tone={chip.tone}
        />
      ))}
    </span>
  );
}

export function childPrepChipsFor({
  child,
  encounters,
  links,
  locations,
  maps,
  npcLinks = [],
}: {
  child: CampaignLocation;
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
  npcLinks?: CampaignNpcLocationLink[];
}) {
  const profile = locationProfile(child);
  const { childCount, encounterCount, exitCount, npcCount } = childPrepFacts({
    child,
    encounters,
    links,
    locations,
    maps,
    npcLinks,
  });

  if (profile.profile === "room") {
    return [
      countChip(encounterCount, "encounter"),
      countChip(npcCount, "NPC"),
      countChip(exitCount, "connection"),
    ].filter(isChildPrepChip);
  }

  if (profile.variant === "floor") {
    return [
      countChip(childCount, "room"),
      countChip(encounterCount, "encounter"),
      countChip(npcCount, "NPC"),
    ].filter(isChildPrepChip);
  }

  if (profile.variant === "dungeon") {
    return [
      countChip(childCount, "area", "areas"),
      countChip(encounterCount, "encounter"),
      countChip(npcCount, "NPC"),
    ].filter(isChildPrepChip);
  }

  return [];
}

export function childPrepIssueSummariesFor({
  childLocations,
  encounters,
  links,
  locations,
  maps,
  npcLinks = [],
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
  npcLinks?: CampaignNpcLocationLink[];
}) {
  if (!childLocations.length) return [];
  const totals = childLocations
    .map((child) => childPrepFacts({ child, encounters, links, locations, maps, npcLinks }))
    .reduce(
      (total, fact) => ({
        encounterCount: total.encounterCount + fact.encounterCount,
        npcCount: total.npcCount + fact.npcCount,
      }),
      { encounterCount: 0, npcCount: 0 },
    );
  return [countChip(totals.encounterCount, "encounter"), countChip(totals.npcCount, "NPC")].filter(
    isChildPrepChip,
  );
}

function childPrepFacts({
  child,
  encounters,
  links,
  locations,
  maps,
  npcLinks,
}: {
  child: CampaignLocation;
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
  npcLinks: CampaignNpcLocationLink[];
}) {
  const scope = scopedLocationIDs(locations, child.id);
  return {
    childCount: locations.filter((location) => location.parentLocationId === child.id).length,
    encounterCount: encounters.filter(
      (encounter) => encounter.locationId && scope.has(encounter.locationId),
    ).length,
    exitCount: links.filter(
      (link) => scope.has(link.sourceLocationId) || scope.has(link.targetLocationId),
    ).length,
    npcCount: npcLinks.filter((link) => scope.has(link.locationId)).length,
    hasNotes: Boolean(child.summary || child.publicNotes || child.notes || child.dmNotes),
    hasMapContext:
      Object.keys(child.mapAnchor ?? {}).length > 0 ||
      maps.some((map) => (map.parentLocationId ?? "") === child.id),
  };
}

function scopedLocationIDs(locations: CampaignLocation[], rootID: string) {
  const ids = new Set([rootID]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const location of locations) {
      if (
        location.parentLocationId &&
        ids.has(location.parentLocationId) &&
        !ids.has(location.id)
      ) {
        ids.add(location.id);
        changed = true;
      }
    }
  }
  return ids;
}

function countChip(count: number, singular: string, plural = `${singular}s`) {
  return count > 0
    ? readyChip(`${count} ${count === 1 ? singular : plural}`, countChipTone(singular))
    : null;
}

function countChipTone(singular: string): ChildPrepChip["tone"] {
  if (singular === "encounter") return "primary";
  if (singular === "NPC") return "shared";
  if (singular === "connection") return "tertiary";
  return "secondary";
}

function readyChip(label: string, tone: ChildPrepChip["tone"]): ChildPrepChip {
  return { label, tone };
}

function isChildPrepChip(chip: ChildPrepChip | null): chip is ChildPrepChip {
  return Boolean(chip);
}
