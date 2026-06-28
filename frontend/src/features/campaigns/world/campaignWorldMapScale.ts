import type {
  CampaignMap,
  CampaignMapDistance,
  CampaignMapDistanceUnit,
  CampaignMapInput,
} from "./travelTypes";

export function mapInputFromMap(
  map: CampaignMap,
  overrides: Partial<CampaignMapInput> = {},
): CampaignMapInput {
  return {
    parentLocationId: map.parentLocationId,
    name: map.name,
    description: map.description,
    mapType: map.mapType,
    mode: map.mode,
    imageAssetId: map.imageAssetId,
    width: map.width,
    height: map.height,
    scaleDistancePerPixel: map.scaleDistancePerPixel,
    scaleDistanceUnit: map.scaleDistanceUnit,
    calibrationPixelLength: map.calibrationPixelLength,
    calibrationDistance: map.calibrationDistance,
    metadata: map.metadata,
    ...overrides,
  };
}

export function scaleMapDistance(
  distance: CampaignMapDistance,
  scaleDistancePerPixel: number,
  unit: CampaignMapDistanceUnit,
): CampaignMapDistance {
  const realDistance = distance.pixelDistance * scaleDistancePerPixel;
  const travel = mapDistanceForTravel(realDistance, unit);
  return {
    ...distance,
    distance: realDistance,
    distanceUnit: unit,
    travelDistance: travel.distance,
    travelDistanceUnit: travel.unit,
  };
}

export function relativeCoordinate(value: number, previousSize: number, nextSize: number) {
  if (previousSize <= 0) return clamp(value, 0, nextSize);
  return clamp((value / previousSize) * nextSize, 0, nextSize);
}

function mapDistanceForTravel(distance: number, unit: CampaignMapDistanceUnit) {
  if (unit === "feet") return { distance: distance / 5280, unit: "miles" as const };
  if (unit === "kilometers" || unit === "kilometres") {
    return { distance, unit: "kilometers" as const };
  }
  return { distance, unit: "miles" as const };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
