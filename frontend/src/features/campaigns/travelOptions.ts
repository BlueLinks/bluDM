import type { TravelFormState, TravelWeather } from "./travelTypes";

export const distanceUnitOptions = [
  { value: "miles", label: "Miles" },
  { value: "kilometers", label: "Kilometers" },
  { value: "hexes", label: "Hexes" },
];

export const terrainOptions = [
  { value: "road", label: "Road" },
  { value: "plains", label: "Plains" },
  { value: "forest", label: "Forest" },
  { value: "swamp", label: "Swamp" },
  { value: "mountains", label: "Mountains" },
  { value: "desert", label: "Desert" },
  { value: "arctic", label: "Arctic" },
  { value: "coastal", label: "Coastal" },
  { value: "underground", label: "Underground" },
  { value: "urban", label: "Urban" },
  { value: "water", label: "Water" },
  { value: "custom", label: "Custom" },
];

export const paceOptions = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

export const routeConditionOptions = [
  { value: "road-or-trail", label: "Road or trail" },
  { value: "trackless", label: "Trackless" },
  { value: "difficult-terrain", label: "Difficult terrain" },
  { value: "hazardous-terrain", label: "Hazardous terrain" },
  { value: "forced-march", label: "Forced march" },
  { value: "mounted", label: "Mounted" },
  { value: "vehicle", label: "Vehicle" },
  { value: "boat", label: "Boat" },
  { value: "flight", label: "Flight" },
  { value: "magic-assisted", label: "Magic-assisted" },
];

export const climateOptions = [
  { value: "temperate", label: "Temperate" },
  { value: "hot", label: "Hot" },
  { value: "cold", label: "Cold" },
  { value: "wet", label: "Wet" },
  { value: "dry", label: "Dry" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
];

export const blankWeather: TravelWeather = { severity: "", title: "", text: "", prompt: "" };

export const blankTravelForm: TravelFormState = {
  origin: "",
  destination: "",
  distance: "",
  distanceUnit: "miles",
  terrain: "road",
  pace: "normal",
  routeCondition: "road-or-trail",
  climate: "temperate",
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
