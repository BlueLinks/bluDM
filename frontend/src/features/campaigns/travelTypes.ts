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
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
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
