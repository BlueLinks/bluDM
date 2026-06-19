export type TravelWeather = {
  temperature: "normal" | "colder" | "warmer";
  temperatureDeltaF: number | null;
  wind: "none" | "light" | "strong";
  precipitation: "none" | "light-rain-or-heavy-snow" | "heavy-rain-or-heavy-snow";
  rolls?: {
    temperatureD20?: number;
    temperatureD4?: number;
    windD20?: number;
    precipitationD20?: number;
  };
};

export type CampaignLocation = {
  id: string;
  campaignId: string;
  parentLocationId?: string;
  name: string;
  locationType?: string;
  customTypeLabel?: string;
  summary?: string;
  notes: string;
  publicNotes?: string;
  dmNotes?: string;
  tags?: string[];
  sortOrder?: number;
  status?: string;
  mapAnchor?: Record<string, unknown>;
  path?: CampaignLocationPathSegment[];
  createdAt?: string;
  updatedAt?: string;
};

export type CampaignLocationPathSegment = {
  id: string;
  name: string;
  locationType: string;
};

export type CampaignLocationInput = {
  parentLocationId?: string;
  name: string;
  locationType?: string;
  customTypeLabel?: string;
  summary?: string;
  notes?: string;
  publicNotes?: string;
  dmNotes?: string;
  tags?: string[];
  sortOrder?: number;
  status?: string;
  mapAnchor?: Record<string, unknown>;
};

export type CampaignLocationLink = {
  id: string;
  campaignId: string;
  sourceLocationId: string;
  targetLocationId: string;
  linkType: string;
  label: string;
  direction: string;
  visibility: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignLocationLinkInput = {
  sourceLocationId: string;
  targetLocationId: string;
  linkType?: string;
  label?: string;
  direction?: string;
  visibility?: string;
  notes?: string;
};

export type CampaignNpcLocationLink = {
  id: string;
  campaignId: string;
  creatureId: string;
  locationId: string;
  linkType: string;
  visibility: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CampaignNpcLocationLinkInput = {
  creatureId: string;
  locationId: string;
  linkType?: string;
  visibility?: string;
  notes?: string;
};

export type CampaignLocationStock = {
  id: string;
  campaignId: string;
  locationId: string;
  itemId: string;
  librarySource: "user" | "standard";
  quantity: number;
  priceAmount: number;
  priceUnit: string;
  availability: string;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignLocationStockInput = {
  locationId: string;
  itemId: string;
  librarySource: "user" | "standard";
  quantity?: number;
  priceAmount?: number;
  priceUnit?: string;
  availability?: string;
  notes?: string;
  sortOrder?: number;
};

export type CampaignMapType = "world" | "region" | "settlement" | "dungeon" | "floor" | "custom";
export type CampaignMapMode = "image" | "blank";
export type CampaignMapDistanceUnit = "feet" | "miles" | "kilometers" | "kilometres";

export type CampaignMap = {
  id: string;
  campaignId: string;
  parentLocationId?: string;
  name: string;
  description: string;
  mapType: CampaignMapType;
  mode: CampaignMapMode;
  imageAssetId?: string;
  imageUrl?: string;
  width: number;
  height: number;
  scaleDistancePerPixel: number;
  scaleDistanceUnit: CampaignMapDistanceUnit;
  calibrationPixelLength: number;
  calibrationDistance: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CampaignMapInput = {
  parentLocationId?: string;
  name: string;
  description?: string;
  mapType: CampaignMapType;
  mode: CampaignMapMode;
  imageAssetId?: string;
  width: number;
  height: number;
  scaleDistancePerPixel: number;
  scaleDistanceUnit: CampaignMapDistanceUnit;
  calibrationPixelLength?: number;
  calibrationDistance?: number;
  metadata?: Record<string, unknown>;
};

export type CampaignMapPin = {
  id: string;
  campaignId: string;
  mapId: string;
  locationId: string;
  x: number;
  y: number;
  labelOverride: string;
  visibility: string;
  state: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CampaignMapPinInput = {
  locationId: string;
  x: number;
  y: number;
  labelOverride?: string;
  visibility?: string;
  state?: string;
  metadata?: Record<string, unknown>;
};

export type CampaignMapDistance = {
  mapId: string;
  originLocationId: string;
  targetLocationId: string;
  pixelDistance: number;
  distance: number;
  distanceUnit: CampaignMapDistanceUnit;
  travelDistance: number;
  travelDistanceUnit: "miles" | "kilometers";
};

export type RouteInputMode = "route" | "distance";

export type CampaignJourney = {
  id: string;
  campaignId: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
  distanceUnit: string;
  terrain: string;
  pace: string;
  goodRoads: boolean;
  encounterDistanceFeet: number | null;
  weather: TravelWeather;
  routeInputMode: RouteInputMode;
  createdAt: string;
  updatedAt: string;
};

export type TravelCalculation = {
  durationHours: number;
  durationDays: number;
  durationLabel: string;
  effectivePace: string;
  terrainMaximumPace: string;
  goodRoadsMaximumPace: string;
  encounterDistance: {
    diceExpression: string;
    averageFeet: number;
    rolledFeet: number;
    rolls?: number[] | null;
  };
  weather: TravelWeather;
  assumptions: string[];
};

export type TravelFormState = {
  routeInputMode: RouteInputMode;
  origin: string;
  destination: string;
  distance: string;
  distanceUnit: string;
  terrain: string;
  pace: string;
  goodRoads: boolean;
  encounterDistanceFeet: number | null;
  weather: TravelWeather;
};

export type TravelWeatherRollRequest = {
  temperature: boolean;
  wind: boolean;
  precipitation: boolean;
};
