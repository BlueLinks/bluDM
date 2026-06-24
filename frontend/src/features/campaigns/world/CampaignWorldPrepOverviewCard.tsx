import { CheckCircle2, FilePenLine, MapPin, Route, Swords } from "lucide-react";
import type React from "react";
import { ActionRow, CardSection, ResponsiveGrid, SectionHeader } from "../../../components/layout";
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
  const nextSteps = showRoomNextSteps
    ? roomNextSteps({
        hasMapContext: hasMap || hasPlacement,
        hasNotes,
        encounterCount: encounters.length,
        exitCount: links.length,
        onAddEncounter,
        onEditNotes,
        onLinkExit,
        onOpenMaps,
      })
    : [];

  return (
    <CardSection>
      <SectionHeader
        action={
          <Button
            type="button"
            icon={Swords}
            size="sm"
            variant="secondary"
            onClick={onAddEncounter}
          >
            Add encounter
          </Button>
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
      {nextSteps.length ? <RoomNextSteps steps={nextSteps} /> : null}
    </CardSection>
  );
}

function RoomNextSteps({ steps }: { steps: RoomNextStep[] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Next prep steps</div>
      <ActionRow>
        {steps.map((step) => (
          <Button
            key={step.label}
            type="button"
            icon={step.icon}
            size="sm"
            variant="secondary"
            onClick={step.onClick}
          >
            {step.label}
          </Button>
        ))}
      </ActionRow>
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
      ? { label: "Add an encounter", icon: Swords, onClick: onAddEncounter }
      : null,
    exitCount === 0 && onLinkExit
      ? { label: "Link an exit", icon: Route, onClick: onLinkExit }
      : null,
    !hasNotes && onEditNotes
      ? { label: "Add room notes", icon: FilePenLine, onClick: onEditNotes }
      : null,
    !hasMapContext && onOpenMaps
      ? { label: "Place on map", icon: MapPin, onClick: onOpenMaps }
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

type RoomNextStep = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
};

function isRoomNextStep(step: RoomNextStep | null): step is RoomNextStep {
  return Boolean(step);
}
