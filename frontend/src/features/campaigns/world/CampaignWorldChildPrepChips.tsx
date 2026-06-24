import type { Encounter } from "../../../types";
import { locationProfile } from "./locationProfiles";
import type { CampaignLocation, CampaignLocationLink, CampaignMap } from "./travelTypes";

export type ChildPrepChip = {
  label: string;
  tone: "ready" | "warning";
};

export function ChildPrepChips({ chips }: { chips?: ChildPrepChip[] }) {
  if (!chips?.length) return null;
  return (
    <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          className={[
            "rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase",
            chip.tone === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
          ].join(" ")}
          key={chip.label}
        >
          {chip.label}
        </span>
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
}: {
  child: CampaignLocation;
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
}) {
  const profile = locationProfile(child);
  const { childCount, encounterCount, exitCount, hasMapContext, hasNotes } = childPrepFacts({
    child,
    encounters,
    links,
    locations,
    maps,
  });

  if (profile.profile === "room") {
    return [
      countChip(encounterCount, "encounter"),
      countChip(exitCount, "exit"),
      hasNotes ? readyChip("Notes") : warningChip("Needs notes"),
      hasMapContext ? readyChip("Mapped") : warningChip("Unmapped"),
    ];
  }

  if (profile.variant === "floor") {
    return [
      countChip(childCount, "room"),
      countChip(encounterCount, "encounter"),
      hasMapContext ? readyChip("Mapped") : warningChip("Unmapped"),
    ];
  }

  if (profile.variant === "dungeon") {
    return [
      countChip(childCount, "area", "areas"),
      countChip(encounterCount, "encounter"),
      hasMapContext ? readyChip("Mapped") : warningChip("Unmapped"),
    ];
  }

  return [];
}

export function childPrepIssueSummariesFor({
  childLocations,
  encounters,
  links,
  locations,
  maps,
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
}) {
  if (!childLocations.length) return [];
  const facts = childLocations.map((child) =>
    childPrepFacts({ child, encounters, links, locations, maps }),
  );
  const label = aggregateChildLabel(childLocations);
  return [
    issueChip(
      countWhere(facts, (fact) => fact.encounterCount === 0),
      label,
      {
        singular: "has no encounters",
        plural: "have no encounters",
      },
    ),
    issueChip(
      countWhere(facts, (fact) => fact.exitCount === 0),
      label,
      {
        singular: "has no exits",
        plural: "have no exits",
      },
    ),
    issueChip(
      countWhere(facts, (fact) => !fact.hasNotes),
      label,
      {
        singular: "needs notes",
        plural: "need notes",
      },
    ),
    issueChip(
      countWhere(facts, (fact) => !fact.hasMapContext),
      label,
      {
        singular: "is unmapped",
        plural: "are unmapped",
      },
    ),
  ].filter(isChildPrepChip);
}

function childPrepFacts({
  child,
  encounters,
  links,
  locations,
  maps,
}: {
  child: CampaignLocation;
  encounters: Encounter[];
  links: CampaignLocationLink[];
  locations: CampaignLocation[];
  maps: CampaignMap[];
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
    ? readyChip(`${count} ${count === 1 ? singular : plural}`)
    : warningChip(`No ${plural}`);
}

function readyChip(label: string): ChildPrepChip {
  return { label, tone: "ready" };
}

function warningChip(label: string): ChildPrepChip {
  return { label, tone: "warning" };
}

function countWhere<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length;
}

function aggregateChildLabel(childLocations: CampaignLocation[]) {
  const profiles = childLocations.map((location) => locationProfile(location));
  if (profiles.every((profile) => profile.profile === "room")) return "room";
  if (profiles.every((profile) => profile.variant === "floor")) return "floor";
  if (profiles.every((profile) => profile.variant === "dungeon")) return "dungeon";
  return "area";
}

function issueChip(
  count: number,
  label: string,
  copy: { singular: string; plural: string },
): ChildPrepChip | null {
  if (!count) return null;
  const noun = count === 1 ? label : `${label}s`;
  return warningChip(`${count} ${noun} ${count === 1 ? copy.singular : copy.plural}`);
}

function isChildPrepChip(chip: ChildPrepChip | null): chip is ChildPrepChip {
  return Boolean(chip);
}
