import { ArrowUpRight, Trash2 } from "lucide-react";
import { ActionRow } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import { formatMapDistance, realMapDistance } from "./campaignMapDistance";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";

export function CampaignWorldPinnedLocations({
  locationById,
  map,
  onRemove,
  onSelectLocation,
  pins,
}: {
  locationById: Map<string, CampaignLocation>;
  map: CampaignMap;
  onRemove: (pin: CampaignMapPin) => void;
  onSelectLocation: (locationID: string) => void;
  pins: CampaignMapPin[];
}) {
  if (!pins.length) return <EmptyMini copy="No pins on this map yet." />;
  return (
    <div className="grid gap-2" aria-label="Pinned locations on selected map">
      {pins.map((pin) => {
        const location = locationById.get(pin.locationId);
        return (
          <div
            key={pin.id}
            className="grid gap-2 rounded-md border border-border bg-card p-2 text-sm"
          >
            <ActionRow justify="between" align="start">
              <button
                className="min-w-0 text-left font-semibold text-accent hover:underline disabled:text-muted-foreground disabled:no-underline"
                type="button"
                disabled={!location}
                title={location ? `Open ${pin.labelOverride || location.name}` : undefined}
                onClick={() => location && onSelectLocation(location.id)}
              >
                {pin.labelOverride || location?.name || "Pinned location"}
              </button>
              <ActionRow justify="end" className="w-full sm:w-auto">
                <Button
                  type="button"
                  icon={ArrowUpRight}
                  size="sm"
                  variant="ghost"
                  disabled={!location}
                  title={location ? `Open ${pin.labelOverride || location.name}` : undefined}
                  onClick={() => location && onSelectLocation(location.id)}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  icon={Trash2}
                  size="sm"
                  variant="ghost"
                  title={`Remove pin for ${pin.labelOverride || location?.name || "Pinned location"}`}
                  onClick={() => onRemove(pin)}
                >
                  Remove
                </Button>
              </ActionRow>
            </ActionRow>
            <span className="text-xs text-muted-foreground">
              {Math.round(pin.x)}, {Math.round(pin.y)} ·{" "}
              {location ? locationPathLabel(location) : "Unknown location"}
              {pins.length > 1 ? ` · ${formatNearestDistance(pin, pins, map)}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatNearestDistance(pin: CampaignMapPin, pins: CampaignMapPin[], map: CampaignMap) {
  const distances = pins
    .filter((other) => other.id !== pin.id)
    .map((other) => realMapDistance(map, pin, other));
  if (!distances.length) return "no nearby pins";
  return `nearest ${formatMapDistance(Math.min(...distances), map.scaleDistanceUnit)}`;
}
