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

export const terrainEncounterDistanceRules: Record<
  string,
  { diceExpression: string; diceCount: number; dieSides: number; multiplier: number }
> = {
  arctic: { diceExpression: "6d6 x 10 feet", diceCount: 6, dieSides: 6, multiplier: 10 },
  coastal: { diceExpression: "2d10 x 10 feet", diceCount: 2, dieSides: 10, multiplier: 10 },
  desert: { diceExpression: "6d6 x 10 feet", diceCount: 6, dieSides: 6, multiplier: 10 },
  forest: { diceExpression: "2d8 x 10 feet", diceCount: 2, dieSides: 8, multiplier: 10 },
  grassland: { diceExpression: "6d6 x 10 feet", diceCount: 6, dieSides: 6, multiplier: 10 },
  hill: { diceExpression: "2d10 x 10 feet", diceCount: 2, dieSides: 10, multiplier: 10 },
  mountain: { diceExpression: "4d10 x 10 feet", diceCount: 4, dieSides: 10, multiplier: 10 },
  swamp: { diceExpression: "2d8 x 10 feet", diceCount: 2, dieSides: 8, multiplier: 10 },
  underdark: { diceExpression: "2d6 x 10 feet", diceCount: 2, dieSides: 6, multiplier: 10 },
  urban: { diceExpression: "2d6 x 10 feet", diceCount: 2, dieSides: 6, multiplier: 10 },
  waterborne: { diceExpression: "6d6 x 10 feet", diceCount: 6, dieSides: 6, multiplier: 10 },
};

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
  encounterDistanceFeet: null,
  weather: blankWeather,
};

export function encounterDistanceOptionsForTerrain(terrain: string) {
  const rule = terrainEncounterDistanceRules[terrain];
  if (!rule) return [];
  const options: Array<{ value: string; label: string }> = [];
  for (let total = rule.diceCount; total <= rule.diceCount * rule.dieSides; total += 1) {
    const feet = total * rule.multiplier;
    options.push({ value: String(feet), label: `${feet} ft` });
  }
  return options;
}

export function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? sentenceCase(value);
}

export function sentenceCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}
