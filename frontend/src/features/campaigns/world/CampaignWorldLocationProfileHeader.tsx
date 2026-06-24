import { Boxes, FilePenLine, Map as MapIcon, MapPin, Plus, Swords, Trash2 } from "lucide-react";
import type React from "react";
import { ActionRow, CardSection } from "../../../components/layout";
import { Button } from "../../../components/ui";
import { LocationIcon } from "./CampaignWorldLocationIcon";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import {
  defaultTypeForProfileAction,
  labelForProfileAction,
  type LocationProfileInfo,
} from "./locationProfiles";
import type { CampaignLocation } from "./travelTypes";

export function LocationProfileHeader({
  childCount,
  location,
  parentLocation,
  profile,
  onAddChild,
  onDeleteLocation,
  onEdit,
  onGenerateEncounter,
  onLinkExit,
  onOpenMaps,
  onSelectLocation,
  onStockOpen,
}: {
  childCount: number;
  location: CampaignLocation;
  parentLocation?: CampaignLocation;
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
  onDeleteLocation: () => void;
  onEdit: () => void;
  onGenerateEncounter: () => void;
  onLinkExit: () => void;
  onOpenMaps: () => void;
  onSelectLocation: (locationID: string) => void;
  onStockOpen: () => void;
}) {
  const primaryActions = new Set(profile.primaryActions);
  return (
    <CardSection className="p-4" tone="background">
      <ActionRow align="start" gap="md" justify="between">
        <div className="min-w-0">
          <LocationPath location={location} onSelectLocation={onSelectLocation} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge location={location} />
            <Chip>{profile.badge}</Chip>
          </div>
          <h4 className="mt-2 flex min-w-0 items-center gap-2 text-xl font-semibold">
            <LocationIcon
              className="h-5 w-5 shrink-0 text-accent"
              locationType={location.locationType}
            />
            <span className="min-w-0 [overflow-wrap:anywhere]">{location.name}</span>
          </h4>
          {parentLocation ? (
            <button
              className="mt-2 text-left text-sm text-muted-foreground transition hover:text-accent hover:underline"
              type="button"
              onClick={() => onSelectLocation(parentLocation.id)}
            >
              Parent: {locationPathLabel(parentLocation)}
            </button>
          ) : null}
          <LocationChips childCount={childCount} location={location} />
        </div>
        <div className="grid w-full justify-items-start gap-2 sm:w-auto sm:justify-items-end">
          <PrimaryActions
            profile={profile}
            onAddChild={onAddChild}
            onGenerateEncounter={onGenerateEncounter}
            onLinkExit={onLinkExit}
            onOpenMaps={onOpenMaps}
            onStockOpen={onStockOpen}
          />
          <ActionRow className="w-full sm:w-auto sm:justify-end" justify="start">
            {!primaryActions.has("open-map") ? (
              <Button
                type="button"
                icon={MapIcon}
                size="sm"
                variant="secondary"
                onClick={onOpenMaps}
              >
                Open Map
              </Button>
            ) : null}
            <Button
              type="button"
              icon={Plus}
              size="sm"
              variant="secondary"
              onClick={() => onAddChild()}
            >
              Add child
            </Button>
            {!primaryActions.has("link-exit") ? (
              <Button
                type="button"
                icon={MapPin}
                size="sm"
                variant="secondary"
                onClick={onLinkExit}
              >
                Link
              </Button>
            ) : null}
            <Button
              type="button"
              icon={Swords}
              size="sm"
              variant="secondary"
              onClick={onGenerateEncounter}
            >
              Generate encounter
            </Button>
            <Button type="button" icon={FilePenLine} size="sm" variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button
              type="button"
              icon={Trash2}
              size="sm"
              variant="danger"
              onClick={onDeleteLocation}
            >
              Delete
            </Button>
          </ActionRow>
        </div>
      </ActionRow>
    </CardSection>
  );
}

function PrimaryActions({
  profile,
  onAddChild,
  onGenerateEncounter,
  onLinkExit,
  onOpenMaps,
  onStockOpen,
}: {
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
  onGenerateEncounter: () => void;
  onLinkExit: () => void;
  onOpenMaps: () => void;
  onStockOpen: () => void;
}) {
  return (
    <ActionRow className="w-full sm:w-auto sm:justify-end" justify="start">
      {profile.primaryActions.slice(0, 2).map((action) => {
        if (action === "add-stock") {
          return (
            <Button key={action} type="button" icon={Boxes} size="sm" onClick={onStockOpen}>
              {labelForProfileAction(action)}
            </Button>
          );
        }
        if (action === "add-encounter") {
          return (
            <Button
              key={action}
              type="button"
              icon={Swords}
              size="sm"
              onClick={onGenerateEncounter}
            >
              {labelForProfileAction(action)}
            </Button>
          );
        }
        if (action === "link-exit") {
          return (
            <Button key={action} type="button" icon={MapPin} size="sm" onClick={onLinkExit}>
              {labelForProfileAction(action)}
            </Button>
          );
        }
        if (action === "open-map") {
          return (
            <Button key={action} type="button" icon={MapIcon} size="sm" onClick={onOpenMaps}>
              {labelForProfileAction(action)}
            </Button>
          );
        }
        return (
          <Button
            key={action}
            type="button"
            icon={Plus}
            size="sm"
            onClick={() => onAddChild(defaultTypeForProfileAction(action))}
          >
            {labelForProfileAction(action)}
          </Button>
        );
      })}
    </ActionRow>
  );
}

function LocationPath({
  location,
  onSelectLocation,
}: {
  location: CampaignLocation;
  onSelectLocation: (locationID: string) => void;
}) {
  if (!location.path?.length)
    return <p className="text-xs font-bold uppercase text-accent">{location.name}</p>;
  return (
    <nav aria-label="Location path" className="flex flex-wrap gap-x-1 text-xs font-bold uppercase">
      {location.path.map((segment, index) => {
        const current = index === location.path!.length - 1;
        return (
          <span
            className="flex flex-wrap items-center gap-x-1"
            key={segment.id || `${segment.name}-${index}`}
          >
            {current ? (
              <span className="text-accent">{segment.name}</span>
            ) : (
              <button
                className="text-accent transition hover:text-accent/80 hover:underline"
                type="button"
                onClick={() => onSelectLocation(segment.id)}
              >
                {segment.name}
              </button>
            )}
            {!current ? <span className="text-muted-foreground">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}

function TypeBadge({ location }: { location: CampaignLocation }) {
  return (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-bold uppercase text-emerald-700 dark:text-emerald-200">
      {location.customTypeLabel || location.locationType || "custom"}
    </span>
  );
}

function LocationChips({
  childCount,
  location,
}: {
  childCount: number;
  location: CampaignLocation;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {childCount ? <Chip>{childCount} child locations</Chip> : null}
      {(location.tags ?? []).map((tag) => (
        <Chip key={tag}>{tag}</Chip>
      ))}
      <Chip tone="map">
        {Object.keys(location.mapAnchor ?? {}).length ? "Map anchor placed" : "Map pin not placed"}
      </Chip>
    </div>
  );
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "map";
}) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase",
        tone === "map"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : "border-border bg-muted text-muted-foreground",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
