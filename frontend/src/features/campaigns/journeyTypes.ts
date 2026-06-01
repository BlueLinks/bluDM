export type JourneyWeather = {
  severity: string;
  title: string;
  text: string;
  prompt: string;
};

export type Journey = {
  id: string;
  campaignId: string;
  name: string;
  origin: string;
  destination: string;
  distance: number;
  distanceUnit: string;
  terrain: string;
  pace: string;
  routeCondition: string;
  climate: string;
  durationHours: number;
  durationDays: number;
  durationLabel: string;
  weather: JourneyWeather;
  assumptions: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type JourneyCalculation = {
  durationHours: number;
  durationDays: number;
  durationLabel: string;
  weather: JourneyWeather;
  assumptions: string[];
};

export type JourneyFormState = {
  name: string;
  origin: string;
  destination: string;
  distance: string;
  distanceUnit: string;
  terrain: string;
  pace: string;
  routeCondition: string;
  climate: string;
  weather: JourneyWeather;
  notes: string;
};
