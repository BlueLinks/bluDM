import type { TravelFormState, TravelWeather } from "./travelTypes";

export const distanceUnitOptions = [
  { value: "miles", label: "Miles" },
  { value: "kilometers", label: "Kilometers" },
  { value: "hexes", label: "Hexes" },
];

export const terrainOptions = [
  { value: "arctic", label: "Arctic" },
  { value: "coastal", label: "Coastal" },
  { value: "desert", label: "Desert" },
  { value: "forest", label: "Forest" },
  { value: "grassland", label: "Grassland" },
  { value: "hill", label: "Hill" },
  { value: "mountain", label: "Mountain" },
  { value: "swamp", label: "Swamp" },
  { value: "underdark", label: "Underdark" },
  { value: "urban", label: "Urban" },
  { value: "waterborne", label: "Waterborne" },
];

export const paceOptions = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

export const temperatureOptions = [
  { value: "normal", label: "Normal for season" },
  { value: "colder", label: "Colder" },
  { value: "warmer", label: "Warmer" },
];

export const temperatureDeltaOptions = [
  { value: "10", label: "10°F" },
  { value: "20", label: "20°F" },
  { value: "30", label: "30°F" },
  { value: "40", label: "40°F" },
];

export const windOptions = [
  { value: "none", label: "None" },
  { value: "light", label: "Light" },
  { value: "strong", label: "Strong" },
];

export const precipitationOptions = [
  { value: "none", label: "None" },
  { value: "light-rain-or-heavy-snow", label: "Light rain or heavy snow" },
  { value: "heavy-rain-or-heavy-snow", label: "Heavy rain or heavy snow" },
];

export const blankWeather: TravelWeather = {
  temperature: "normal",
  temperatureDeltaF: null,
  wind: "none",
  precipitation: "none",
};

export const blankTravelForm: TravelFormState = {
  origin: "",
  destination: "",
  distance: "",
  distanceUnit: "miles",
  terrain: "grassland",
  pace: "normal",
  goodRoads: false,
  weather: blankWeather,
};

export function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? sentenceCase(value);
}

export function sentenceCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}
