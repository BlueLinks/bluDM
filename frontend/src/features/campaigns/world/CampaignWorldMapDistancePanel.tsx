import { Ruler } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Input, Select } from "../../../components/ui";
import { formatMapDistance } from "./campaignMapDistance";
import type { CampaignMap, CampaignMapDistance, CampaignMapDistanceUnit } from "./travelTypes";

const scaleUnitOptions = [
  { value: "feet", label: "Feet" },
  { value: "miles", label: "Miles" },
  { value: "kilometers", label: "Kilometers" },
  { value: "kilometres", label: "Kilometres" },
];

export function CampaignWorldMapDistancePanel({
  activeMap,
  distance,
  distanceFromId,
  distanceLoading,
  distanceToId,
  options,
  scaleSaving,
  onCalibrateScale,
  onDistanceFromChange,
  onDistanceToChange,
}: {
  activeMap: CampaignMap;
  distance: CampaignMapDistance | null;
  distanceFromId: string;
  distanceLoading: boolean;
  distanceToId: string;
  options: Array<{ value: string; label: string }>;
  scaleSaving: boolean;
  onCalibrateScale: (distance: number, unit: CampaignMapDistanceUnit) => Promise<void>;
  onDistanceFromChange: (locationID: string) => void;
  onDistanceToChange: (locationID: string) => void;
}) {
  const [calibrationDistance, setCalibrationDistance] = useState("");
  const [calibrationUnit, setCalibrationUnit] = useState<CampaignMapDistanceUnit>(
    activeMap.scaleDistanceUnit,
  );
  const parsedCalibrationDistance = Number(calibrationDistance);

  useEffect(() => {
    setCalibrationUnit(activeMap.scaleDistanceUnit);
  }, [activeMap.id, activeMap.scaleDistanceUnit]);

  return (
    <div className="grid gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Ruler className="h-4 w-4 text-accent" /> Distance
      </div>
      <Select
        value={distanceFromId}
        placeholder="From"
        options={options}
        onValueChange={onDistanceFromChange}
      />
      <Select
        value={distanceToId}
        placeholder="To"
        options={options}
        onValueChange={onDistanceToChange}
      />
      <p className="text-xs text-muted-foreground">
        {distanceFromId && distanceToId
          ? distanceFromId === distanceToId
            ? "Choose two different pins."
            : distanceLoading
              ? "Calculating…"
              : "Distance updates automatically from the selected pins."
          : "Select two placed pins to measure the map."}
      </p>
      {distance ? (
        <>
          <p className="text-sm text-muted-foreground">
            {formatMapDistance(distance.distance, distance.distanceUnit)} (
            {distance.pixelDistance.toFixed(1)} px). Travel calculator uses{" "}
            {distance.travelDistance.toFixed(2)} {distance.travelDistanceUnit}.
          </p>
          <div className="grid gap-2 rounded-md border border-dashed border-border bg-background p-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Set scale from pins</p>
              <p className="text-xs text-muted-foreground">
                If these two places have a known distance, enter it once to calibrate this map.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <Field label="Known distance">
                <Input
                  min="0.0001"
                  step="0.0001"
                  type="number"
                  value={calibrationDistance}
                  onChange={(event) => setCalibrationDistance(event.target.value)}
                />
              </Field>
              <Field label="Unit">
                <Select
                  value={calibrationUnit}
                  placeholder="Unit"
                  options={scaleUnitOptions}
                  onValueChange={(value) => setCalibrationUnit(value as CampaignMapDistanceUnit)}
                />
              </Field>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={
                !Number.isFinite(parsedCalibrationDistance) ||
                parsedCalibrationDistance <= 0 ||
                scaleSaving
              }
              onClick={() => void onCalibrateScale(parsedCalibrationDistance, calibrationUnit)}
            >
              {scaleSaving ? "Saving scale…" : "Use this distance"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Current scale:{" "}
              {formatMapDistance(activeMap.scaleDistancePerPixel, activeMap.scaleDistanceUnit)} per
              pixel.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
