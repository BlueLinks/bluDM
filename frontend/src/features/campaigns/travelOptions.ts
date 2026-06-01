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

export const travelWeatherOptions = [
  {
    value: "clear-traveling-sky",
    severity: "calm",
    title: "Clear Traveling Sky",
    text: "High clouds drift above the route, leaving the road bright and easy to read.",
    prompt: "Good visibility makes navigation straightforward unless local hazards interfere.",
  },
  {
    value: "cool-rain",
    severity: "notable",
    title: "Cool Rain",
    text: "A steady rain follows the road through the afternoon. Cloaks and bedrolls are damp by nightfall, and tracks are easier to spot in the mud.",
    prompt: "Offer advantage to tracking checks, but make open fires harder to keep.",
  },
  {
    value: "crosswind-front",
    severity: "harsh",
    title: "Crosswind Front",
    text: "A restless wind leans against the party for most of the day, carrying grit, leaves, and the smell of distant rain.",
    prompt: "Ranged signals and exposed camp chores take longer than expected.",
  },
  {
    value: "thunderhead-break",
    severity: "dangerous",
    title: "Thunderhead Break",
    text: "A dark line of storm clouds overtakes the route with hard rain and close thunder.",
    prompt: "Ask whether the party seeks shelter or presses on through poor visibility.",
  },
  {
    value: "pale-winter-sun",
    severity: "calm",
    title: "Pale Winter Sun",
    text: "Cold light hangs over the route, crisp and quiet, with firm ground underfoot.",
    prompt: "The party can travel normally if they have adequate cold-weather gear.",
  },
  {
    value: "needle-snow",
    severity: "notable",
    title: "Needle Snow",
    text: "Fine snow blows across the path and softens distant landmarks.",
    prompt: "Navigation checks may be needed where the route is poorly marked.",
  },
  {
    value: "icy-nightfall",
    severity: "harsh",
    title: "Icy Nightfall",
    text: "The day ends with a sudden freeze that coats stones, rope, and wagon fittings.",
    prompt: "Camp setup and vehicle handling are slower unless precautions are taken.",
  },
  {
    value: "whiteout-squall",
    severity: "dangerous",
    title: "Whiteout Squall",
    text: "A wall of snow collapses over the route, swallowing sound and distance.",
    prompt: "Pressing on risks separation, lost time, or exhaustion.",
  },
  {
    value: "dry-bright-morning",
    severity: "calm",
    title: "Dry Bright Morning",
    text: "The air is hot but stable, and the horizon stays sharp all day.",
    prompt: "Water tracking matters, but travel is otherwise predictable.",
  },
  {
    value: "heat-haze",
    severity: "notable",
    title: "Heat Haze",
    text: "Wavering air blurs the path ahead and makes distant shapes unreliable.",
    prompt: "Landmark-based navigation becomes less certain during the hottest hours.",
  },
  {
    value: "scouring-dust",
    severity: "harsh",
    title: "Scouring Dust",
    text: "Dust rides the wind in low sheets, stinging eyes and finding every pack seam.",
    prompt: "Exposed rests recover less comfort unless the party finds cover.",
  },
  {
    value: "punishing-heat",
    severity: "dangerous",
    title: "Punishing Heat",
    text: "The route bakes under still air, turning armor, stone, and tools painfully hot.",
    prompt: "Consider exhaustion risk if the party travels through midday.",
  },
  {
    value: "soft-mist",
    severity: "calm",
    title: "Soft Mist",
    text: "Mist clings to low ground and beads on grass without becoming a true rain.",
    prompt: "Sounds carry strangely, making nearby movement harder to place.",
  },
  {
    value: "heavy-fog",
    severity: "notable",
    title: "Heavy Fog",
    text: "A thick fog settles into hollows and over water, turning the route into a chain of short, uncertain views.",
    prompt: "Navigation and ambush awareness both become more tense.",
  },
  {
    value: "soaking-rain",
    severity: "harsh",
    title: "Soaking Rain",
    text: "Rain falls long enough to flood ruts, swell streams, and make dry rest difficult.",
    prompt: "Travel continues, but gear care and morale need attention.",
  },
  {
    value: "flash-flood-warning",
    severity: "dangerous",
    title: "Flash Flood Warning",
    text: "Water rises fast in ditches, gullies, and low crossings after a violent burst of rain.",
    prompt: "Crossings may become obstacles or force a detour.",
  },
  {
    value: "thin-clear-air",
    severity: "calm",
    title: "Thin Clear Air",
    text: "The heights are cold and clear, giving the party long views over the route ahead.",
    prompt: "Good visibility may reveal landmarks, smoke, or movement far away.",
  },
  {
    value: "slope-winds",
    severity: "notable",
    title: "Slope Winds",
    text: "Wind pours down the slopes in uneven gusts and makes exposed ledges feel narrower.",
    prompt: "Loose items and campfires need extra care.",
  },
  {
    value: "rockfall-weather",
    severity: "harsh",
    title: "Rockfall Weather",
    text: "Rain and wind loosen gravel above the path, sending occasional stones skittering down.",
    prompt: "The party may need to slow down or choose safer switchbacks.",
  },
  {
    value: "high-pass-storm",
    severity: "dangerous",
    title: "High Pass Storm",
    text: "Clouds swallow the pass and bring hard wind, cold rain, and sudden darkness.",
    prompt: "Pressing forward may require checks to avoid losing the trail.",
  },
] satisfies Array<TravelWeather & { value: string }>;

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
