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
    windows: number;
  };
  weather: TravelWeather;
  assumptions: string[];
};

export type TravelFormState = {
  origin: string;
  destination: string;
  distance: string;
  distanceUnit: string;
  terrain: string;
  pace: string;
  goodRoads: boolean;
  weather: TravelWeather;
};

export type TravelWeatherRollRequest = {
  temperature: boolean;
  wind: boolean;
  precipitation: boolean;
};
