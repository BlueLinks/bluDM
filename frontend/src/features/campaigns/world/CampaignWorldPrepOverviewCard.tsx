import { CheckCircle2, FilePenLine, MapPin, Route, Swords } from "lucide-react";
import type React from "react";
import { CardSection, ResponsiveGrid, SectionHeader } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { Encounter } from "../../../types";
import { MapStat } from "./CampaignWorldLocationProfileCards";
import type { CampaignLocation, CampaignLocationLink, CampaignMap } from "./travelTypes";

export function PrepOverviewCard({
  childLocations,
  encounters,
  links,
  location,
  maps,
  showEncounterAction = true,
  showRoomNextSteps = false,
  onAddEncounter,
  onEditNotes,
  onLinkExit,
  onOpenMaps,
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  links: CampaignLocationLink[];
  location: CampaignLocation;
  maps: CampaignMap[];
  showEncounterAction?: boolean;
  showRoomNextSteps?: boolean;
  onAddEncounter: () => void;
  onEditNotes?: () => void;
  onLinkExit?: () => void;
  onOpenMaps?: () => void;
}) {
  const hasNotes = Boolean(
    location.summary || location.publicNotes || location.notes || location.dmNotes,
  );
  const hasMap = maps.some((map) => (map.parentLocationId ?? "") === location.id);
  const hasPlacement = Object.keys(location.mapAnchor ?? {}).length > 0;
  const hasMapContext = hasMap || hasPlacement;
  const nextSteps = showRoomNextSteps
    ? roomNextSteps({
        hasMapContext,
        hasNotes,
        encounterCount: encounters.length,
        exitCount: links.length,
        onAddEncounter,
        onEditNotes,
        onLinkExit,
        onOpenMaps,
      })
    : [];
  const runningCues = runningCuesFor({
    childLocations,
    encounters,
    hasMapContext,
    hasNotes,
    links,
    location,
  });

  return (
    <CardSection>
      <SectionHeader
        action={
          showEncounterAction ? (
            <Button
              type="button"
              icon={Swords}
              size="sm"
              variant="secondary"
              onClick={onAddEncounter}
            >
              Add encounter
            </Button>
          ) : undefined
        }
        icon={CheckCircle2}
        title="Prep overview"
        meta="Ready-to-run signals"
      />
      <ResponsiveGrid className="mt-3" variant="stats3">
        <MapStat label="Encounters" value={encounters.length} />
        <MapStat label="Exits/links" value={links.length} />
        <MapStat label="Child spaces" value={childLocations.length} />
      </ResponsiveGrid>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        <PrepSignal label="Notes" ready={hasNotes} readyText="Prepared" emptyText="Needs notes" />
        <PrepSignal
          label="Map"
          ready={hasMap || hasPlacement}
          readyText={hasMap ? "Map attached" : "Position placed"}
          emptyText="No map context yet"
        />
      </div>
      <RunningCues cues={runningCues} />
      {nextSteps.length ? <RoomNextSteps steps={nextSteps} /> : null}
    </CardSection>
  );
}

function RunningCues({ cues }: { cues: RunningCue[] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Running cues</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {cues.map((cue) => (
          <div className="min-w-0 rounded-md border border-border px-3 py-2" key={cue.label}>
            <div className="text-xs font-bold uppercase text-muted-foreground">{cue.label}</div>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {cue.copy}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomNextSteps({ steps }: { steps: RoomNextStep[] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Next prep steps</div>
      <div className="grid gap-2">
        {steps.map((step) => (
          <div
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            key={step.label}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{step.label}</div>
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {step.prompt}
              </p>
            </div>
            <Button
              type="button"
              icon={step.icon}
              size="sm"
              variant="secondary"
              onClick={step.onClick}
            >
              {step.actionLabel}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function roomNextSteps({
  encounterCount,
  exitCount,
  hasMapContext,
  hasNotes,
  onAddEncounter,
  onEditNotes,
  onLinkExit,
  onOpenMaps,
}: {
  encounterCount: number;
  exitCount: number;
  hasMapContext: boolean;
  hasNotes: boolean;
  onAddEncounter: () => void;
  onEditNotes?: () => void;
  onLinkExit?: () => void;
  onOpenMaps?: () => void;
}): RoomNextStep[] {
  const steps: Array<RoomNextStep | null> = [
    encounterCount === 0
      ? {
          actionLabel: "Add an encounter",
          icon: Swords,
          label: "Threat or scene beat",
          prompt: "What changes if the party waits, searches, or makes noise here?",
          onClick: onAddEncounter,
        }
      : null,
    exitCount === 0 && onLinkExit
      ? {
          actionLabel: "Link an exit",
          icon: Route,
          label: "Player routes",
          prompt: "Where can the party go next, and what door, stair, or passage shows it?",
          onClick: onLinkExit,
        }
      : null,
    !hasNotes && onEditNotes
      ? {
          actionLabel: "Add room notes",
          icon: FilePenLine,
          label: "Read-aloud and secrets",
          prompt: "What should players notice first, and what can they discover with care?",
          onClick: onEditNotes,
        }
      : null,
    !hasMapContext && onOpenMaps
      ? {
          actionLabel: "Place on map",
          icon: MapPin,
          label: "Map position",
          prompt: "Where does this room sit relative to the floor and nearby exits?",
          onClick: onOpenMaps,
        }
      : null,
  ];
  return steps.filter(isRoomNextStep);
}

function PrepSignal({
  emptyText,
  label,
  ready,
  readyText,
}: {
  emptyText: string;
  label: string;
  ready: boolean;
  readyText: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <span className="font-semibold text-foreground">{label}</span>
      <span className={ready ? "text-emerald-700 dark:text-emerald-200" : "text-muted-foreground"}>
        {ready ? readyText : emptyText}
      </span>
    </div>
  );
}

function runningCuesFor({
  childLocations,
  encounters,
  hasMapContext,
  hasNotes,
  links,
  location,
}: {
  childLocations: CampaignLocation[];
  encounters: Encounter[];
  hasMapContext: boolean;
  hasNotes: boolean;
  links: CampaignLocationLink[];
  location: CampaignLocation;
}): RunningCue[] {
  const plannedEncounters = encounters.filter((encounter) =>
    ["active", "planned", "ready", "running"].includes((encounter.status || "").toLowerCase()),
  );
  const namedExits = links.filter((link) => link.label || link.linkType);
  return [
    {
      label: "Scene focus",
      copy:
        location.summary ||
        location.publicNotes ||
        location.notes ||
        "No table-facing focus yet. Add the first impression, clue, or pressure point before play.",
    },
    {
      label: "Threats",
      copy: encounters.length
        ? `${plannedEncounters.length || encounters.length} of ${encounters.length} encounter${encounters.length === 1 ? "" : "s"} ${plannedEncounters.length ? "planned to run" : "already resolved or need review"}.`
        : "No encounter is attached; run this as exploration or add a creature, hazard, or complication.",
    },
    {
      label: "Routes",
      copy: links.length
        ? `${namedExits.length || links.length} exit${links.length === 1 ? "" : "s"} can move players onward.`
        : childLocations.length
          ? `${childLocations.length} child space${childLocations.length === 1 ? "" : "s"} exist; add exits when routes matter at the table.`
          : "No exits or child spaces yet; add a route before this blocks exploration.",
    },
    {
      label: "References",
      copy: `${hasNotes ? "Notes are ready" : "Notes need a pass"}; ${
        hasMapContext ? "map context is available" : "map context is missing"
      }.`,
    },
  ];
}

type RunningCue = {
  copy: string;
  label: string;
};

type RoomNextStep = {
  actionLabel: string;
  icon: React.ElementType;
  label: string;
  prompt: string;
  onClick: () => void;
};

function isRoomNextStep(step: RoomNextStep | null): step is RoomNextStep {
  return Boolean(step);
}
