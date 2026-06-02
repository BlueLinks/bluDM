import { CalendarDays, CloudSun, RefreshCw, Route } from "lucide-react";
import { Badge, Button, Field, Select } from "../../components/ui";
import {
  encounterDistanceOptionsForTerrain,
  labelFor,
  paceOptions,
  precipitationOptions,
  windOptions,
} from "./travelOptions";
import type { TravelCalculation, TravelWeather } from "./travelTypes";

export type TravelResultTab = "travel" | "encounters" | "weather";

export function TravelCalculatorResults({
  activeTab,
  animationKey,
  calculation,
  canCalculate,
  encounterDistanceFeet,
  onEncounterDistanceChange,
  onRollEncounterDistance,
  onTabChange,
  rollingEncounter,
  terrain,
  weather,
}: {
  activeTab: TravelResultTab;
  animationKey: number;
  calculation: TravelCalculation | null;
  canCalculate: boolean;
  encounterDistanceFeet: number | null;
  onEncounterDistanceChange: (value: string) => void;
  onRollEncounterDistance: () => void;
  onTabChange: (tab: TravelResultTab) => void;
  rollingEncounter: boolean;
  terrain: string;
  weather: TravelWeather;
}) {
  const tabs: Array<{ value: TravelResultTab; label: string }> = [
    { value: "travel", label: "Travel" },
    { value: "encounters", label: "Encounters" },
    { value: "weather", label: "Weather" },
  ];
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-3 grid grid-cols-3 gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={[
              "rounded-md border px-3 py-2 text-sm font-semibold transition",
              activeTab === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            onClick={() => onTabChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {activeTab === "travel" && (
          <TravelDurationSummary
            key={`travel-${calculation?.durationLabel ?? "empty"}-${animationKey}`}
            calculation={calculation}
          />
        )}
        {activeTab === "encounters" && (
          <EncounterSummary
            key={`encounter-${calculation?.encounterDistance.rolledFeet ?? "empty"}-${animationKey}`}
            calculation={calculation}
            canCalculate={canCalculate}
            encounterDistanceFeet={encounterDistanceFeet}
            rolling={rollingEncounter}
            terrain={terrain}
            onEncounterDistanceChange={onEncounterDistanceChange}
            onRollEncounterDistance={onRollEncounterDistance}
          />
        )}
        {activeTab === "weather" && (
          <TravelWeatherSummary
            key={`weather-${weatherSummary(weather)}-${animationKey}`}
            weather={weather}
          />
        )}
      </div>
    </section>
  );
}

function TravelDurationSummary({ calculation }: { calculation: TravelCalculation | null }) {
  const capped =
    calculation && calculation.effectivePace !== "" && calculation.effectivePace !== undefined;
  return (
    <div className="action-roll-card rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-200">
        <CalendarDays className="h-4 w-4" />
        Travel time
      </div>
      <div className="action-roll-value mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-100">
        {calculation?.durationLabel || "Enter a distance"}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {calculation
          ? `${calculation.durationHours.toLocaleString()} hours at ${labelFor(paceOptions, calculation.effectivePace)} pace.`
          : "Travel time updates when distance, terrain, pace, or road quality changes."}
      </p>
      {capped && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Terrain max: {labelFor(paceOptions, calculation.terrainMaximumPace)}</Badge>
          <Badge>Road max: {labelFor(paceOptions, calculation.goodRoadsMaximumPace)}</Badge>
        </div>
      )}
    </div>
  );
}

function EncounterSummary({
  calculation,
  canCalculate,
  encounterDistanceFeet,
  onEncounterDistanceChange,
  onRollEncounterDistance,
  rolling,
  terrain,
}: {
  calculation: TravelCalculation | null;
  canCalculate: boolean;
  encounterDistanceFeet: number | null;
  onEncounterDistanceChange: (value: string) => void;
  onRollEncounterDistance: () => void;
  rolling: boolean;
  terrain: string;
}) {
  const distanceOptions = encounterDistanceOptionsForTerrain(terrain);
  return (
    <div className="action-roll-card grid gap-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700 dark:text-amber-200">
          <Route className="h-4 w-4" />
          Encounter distance
        </div>
        <div className="action-roll-value mt-2 text-xl font-semibold text-amber-800 dark:text-amber-100">
          {calculation
            ? `${calculation.encounterDistance.encounterCount.toLocaleString()} possible encounters`
            : "Choose a route"}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {calculation
            ? `${calculation.encounterDistance.diceExpression} rolled ${calculation.encounterDistance.rolledFeet.toLocaleString()} feet.`
            : "The terrain sets how far apart creatures might notice each other."}
        </p>
        {calculation?.encounterDistance.rolls?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Rolls: {calculation.encounterDistance.rolls.join(", ")}
          </p>
        ) : null}
      </div>
      <div className="grid content-start gap-3">
        <Field label="Encounter distance">
          <Select
            value={encounterDistanceFeet ? String(encounterDistanceFeet) : ""}
            placeholder="Roll or select"
            options={distanceOptions}
            onValueChange={onEncounterDistanceChange}
          />
        </Field>
        <Button
          type="button"
          icon={RefreshCw}
          variant="secondary"
          className={
            rolling
              ? "travel-roll-button -translate-y-px shadow-[0_0_0_3px_hsl(var(--primary)/14%)] [&>svg]:rotate-[360deg] [&>svg]:scale-110 [&>svg]:transition-transform [&>svg]:duration-500"
              : "travel-roll-button"
          }
          disabled={!canCalculate}
          onClick={onRollEncounterDistance}
        >
          Roll encounter distance
        </Button>
      </div>
    </div>
  );
}

function TravelWeatherSummary({ weather }: { weather: TravelWeather }) {
  return (
    <div className="action-roll-card rounded-lg border border-sky-500/25 bg-sky-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700 dark:text-sky-200">
        <CloudSun className="h-4 w-4" />
        Weather
      </div>
      <h4 className="action-roll-value mt-2 font-semibold">{weatherSummary(weather)}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{weatherRollSummary(weather)}</p>
    </div>
  );
}

function weatherSummary(weather: TravelWeather) {
  return [
    temperatureLabel(weather),
    `${labelFor(windOptions, weather.wind)} wind`,
    labelFor(precipitationOptions, weather.precipitation),
  ].join(", ");
}

function temperatureLabel(weather: TravelWeather) {
  if (weather.temperature === "normal") return "Normal for season";
  const delta = weather.temperatureDeltaF ?? 10;
  return `${delta}°F ${weather.temperature}`;
}

function weatherRollSummary(weather: TravelWeather) {
  if (!weather.rolls) return "Set manually, or roll each weather component.";
  const rolls = [
    weather.rolls.temperatureD20 ? `temperature d20: ${weather.rolls.temperatureD20}` : "",
    weather.rolls.temperatureD4 ? `temperature d4: ${weather.rolls.temperatureD4}` : "",
    weather.rolls.windD20 ? `wind d20: ${weather.rolls.windD20}` : "",
    weather.rolls.precipitationD20 ? `precipitation d20: ${weather.rolls.precipitationD20}` : "",
  ].filter(Boolean);
  return rolls.length ? `Rolled ${rolls.join(", ")}.` : "Weather set manually.";
}
