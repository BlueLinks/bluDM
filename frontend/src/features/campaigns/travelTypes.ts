export type TravelWeather = {
  severity: string;
  title: string;
  text: string;
  prompt: string;
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
  routeCondition: string;
  climate: string;
  weather: TravelWeather;
};
