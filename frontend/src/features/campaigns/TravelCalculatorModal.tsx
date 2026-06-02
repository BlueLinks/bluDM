import { CalendarDays, CloudSun, RefreshCw, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Callout, Checkbox, Field, Input, Modal, Select } from "../../components/ui";
import { api } from "../../lib/api";
import {
  blankTravelForm,
  distanceUnitOptions,
  labelFor,
  paceOptions,
  precipitationOptions,
  temperatureDeltaOptions,
  temperatureOptions,
  terrainOptions,
  windOptions,
} from "./travelOptions";
import type {
  CampaignLocation,
  TravelCalculation,
  TravelFormState,
  TravelWeather,
  TravelWeatherRollRequest,
} from "./travelTypes";

const noWeatherRolls = { temperature: false, wind: false, precipitation: false };

export function TravelCalculatorModal({
  campaignId,
  locations,
  open,
  onOpenChange,
}: {
  campaignId: string;
  locations: CampaignLocation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<TravelFormState>(blankTravelForm);
  const [calculation, setCalculation] = useState<TravelCalculation | null>(null);
  const [originMode, setOriginMode] = useState<"saved" | "custom">("saved");
  const [destinationMode, setDestinationMode] = useState<"saved" | "custom">("saved");
  const [error, setError] = useState("");
  const canCalculate = Number(form.distance) > 0;

  useEffect(() => {
    if (!open || !canCalculate) {
      setCalculation(null);
      return;
    }
    const timer = window.setTimeout(() => void calculate(noWeatherRolls), 250);
    return () => window.clearTimeout(timer);
  }, [
    open,
    form.origin,
    form.destination,
    form.distance,
    form.distanceUnit,
    form.terrain,
    form.pace,
    form.goodRoads,
  ]);

  function setField<K extends keyof TravelFormState>(field: K, value: TravelFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setWeather<K extends keyof TravelWeather>(field: K, value: TravelWeather[K]) {
    setForm((current) => ({ ...current, weather: { ...current.weather, [field]: value } }));
  }

  async function calculate(rollWeather: TravelWeatherRollRequest) {
    if (!canCalculate) return;
    setError("");
    try {
      const payload = await api.calculateTravel(campaignId, form, rollWeather);
      setCalculation(payload.calculation);
      setForm((current) => ({ ...current, weather: payload.calculation.weather }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate travel");
    }
  }

  const locationOptions = locations.map((location) => ({
    value: location.name,
    label: location.name,
  }));

  return (
    <Modal
      title="Travel calculator"
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-6xl"
      trigger={null}
    >
      <div className="grid gap-5">
        {error && <Callout tone="danger">{error}</Callout>}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="grid content-start gap-4 md:grid-cols-2">
            <RoutePointField
              label="Origin"
              mode={originMode}
              options={locationOptions}
              value={form.origin}
              onModeChange={setOriginMode}
              onValueChange={(value) => setField("origin", value)}
            />
            <RoutePointField
              label="Destination"
              mode={destinationMode}
              options={locationOptions}
              value={form.destination}
              onModeChange={setDestinationMode}
              onValueChange={(value) => setField("destination", value)}
            />
            <Field label="Distance">
              <Input
                min="0"
                step="0.1"
                type="number"
                value={form.distance}
                placeholder="24"
                onChange={(event) => setField("distance", event.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={form.distanceUnit}
                placeholder="Unit"
                options={distanceUnitOptions}
                onValueChange={(value) => setField("distanceUnit", value)}
              />
            </Field>
            <Field label="Terrain">
              <Select
                value={form.terrain}
                placeholder="Terrain"
                options={terrainOptions}
                onValueChange={(value) => setField("terrain", value)}
              />
            </Field>
            <Field label="Pace">
              <Select
                value={form.pace}
                placeholder="Pace"
                options={paceOptions}
                onValueChange={(value) => setField("pace", value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Checkbox
                label="Good roads"
                checked={form.goodRoads}
                onChange={(checked) => setField("goodRoads", checked)}
              />
            </div>
          </div>
          <aside className="grid content-start gap-4">
            <TravelDurationSummary calculation={calculation} />
            <EncounterSummary calculation={calculation} />
            <TravelWeatherSummary weather={form.weather} />
            <div className="grid gap-3">
              <WeatherControls
                weather={form.weather}
                canRoll={canCalculate}
                onWeatherChange={setWeather}
                onRoll={(rollWeather) => void calculate(rollWeather)}
              />
              <Button
                type="button"
                icon={RefreshCw}
                variant="secondary"
                disabled={!canCalculate}
                onClick={() =>
                  void calculate({ temperature: true, wind: true, precipitation: true })
                }
              >
                Roll all weather
              </Button>
            </div>
            <TravelAssumptions assumptions={calculation?.assumptions ?? []} />
          </aside>
        </div>
      </div>
    </Modal>
  );
}

function RoutePointField({
  label,
  mode,
  onModeChange,
  onValueChange,
  options,
  value,
}: {
  label: string;
  mode: "saved" | "custom";
  onModeChange: (mode: "saved" | "custom") => void;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-background text-xs font-semibold">
          <button
            className={
              mode === "saved" ? "bg-primary px-2 py-1 text-primary-foreground" : "px-2 py-1"
            }
            type="button"
            onClick={() => onModeChange("saved")}
          >
            Saved
          </button>
          <button
            className={
              mode === "custom" ? "bg-primary px-2 py-1 text-primary-foreground" : "px-2 py-1"
            }
            type="button"
            onClick={() => onModeChange("custom")}
          >
            Custom
          </button>
        </div>
      </div>
      {mode === "saved" ? (
        <Select
          value={value}
          placeholder={options.length ? "Select location" : "No saved locations"}
          options={options}
          onValueChange={onValueChange}
        />
      ) : (
        <Input
          aria-label={label}
          value={value}
          placeholder="Type a place"
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    </div>
  );
}

function TravelDurationSummary({ calculation }: { calculation: TravelCalculation | null }) {
  const capped =
    calculation && calculation.effectivePace !== "" && calculation.effectivePace !== undefined;
  return (
    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-200">
        <CalendarDays className="h-4 w-4" />
        Travel time
      </div>
      <div className="mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-100">
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

function EncounterSummary({ calculation }: { calculation: TravelCalculation | null }) {
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700 dark:text-amber-200">
        <Route className="h-4 w-4" />
        Encounter distance
      </div>
      <div className="mt-2 text-xl font-semibold text-amber-800 dark:text-amber-100">
        {calculation?.encounterDistance.diceExpression || "Choose a route"}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {calculation
          ? `${calculation.encounterDistance.windows.toLocaleString()} possible encounter-distance windows using an average of ${calculation.encounterDistance.averageFeet.toLocaleString()} feet.`
          : "The terrain sets how far apart creatures might notice each other."}
      </p>
    </div>
  );
}

function TravelWeatherSummary({ weather }: { weather: TravelWeather }) {
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700 dark:text-sky-200">
        <CloudSun className="h-4 w-4" />
        Weather
      </div>
      <h4 className="mt-2 font-semibold">{weatherSummary(weather)}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{weatherRollSummary(weather)}</p>
    </div>
  );
}

function WeatherControls({
  canRoll,
  onRoll,
  onWeatherChange,
  weather,
}: {
  canRoll: boolean;
  onRoll: (rollWeather: TravelWeatherRollRequest) => void;
  onWeatherChange: <K extends keyof TravelWeather>(field: K, value: TravelWeather[K]) => void;
  weather: TravelWeather;
}) {
  return (
    <>
      <div className="grid gap-2 rounded-lg border border-border bg-background p-3">
        <Field label="Temperature">
          <Select
            value={weather.temperature}
            placeholder="Temperature"
            options={temperatureOptions}
            onValueChange={(value) => {
              onWeatherChange("temperature", value as TravelWeather["temperature"]);
              onWeatherChange("temperatureDeltaF", value === "normal" ? null : 10);
            }}
          />
        </Field>
        {weather.temperature !== "normal" && (
          <Field label="Temperature shift">
            <Select
              value={String(weather.temperatureDeltaF ?? 10)}
              placeholder="Degrees"
              options={temperatureDeltaOptions}
              onValueChange={(value) => onWeatherChange("temperatureDeltaF", Number(value))}
            />
          </Field>
        )}
        <Button
          type="button"
          icon={RefreshCw}
          variant="secondary"
          disabled={!canRoll}
          onClick={() => onRoll({ temperature: true, wind: false, precipitation: false })}
        >
          Roll temperature
        </Button>
      </div>
      <WeatherSelectRow
        label="Wind"
        buttonLabel="Roll wind"
        canRoll={canRoll}
        options={windOptions}
        value={weather.wind}
        onChange={(value) => onWeatherChange("wind", value as TravelWeather["wind"])}
        onRoll={() => onRoll({ temperature: false, wind: true, precipitation: false })}
      />
      <WeatherSelectRow
        label="Precipitation"
        buttonLabel="Roll precipitation"
        canRoll={canRoll}
        options={precipitationOptions}
        value={weather.precipitation}
        onChange={(value) =>
          onWeatherChange("precipitation", value as TravelWeather["precipitation"])
        }
        onRoll={() => onRoll({ temperature: false, wind: false, precipitation: true })}
      />
    </>
  );
}

function WeatherSelectRow({
  buttonLabel,
  canRoll,
  label,
  onChange,
  onRoll,
  options,
  value,
}: {
  buttonLabel: string;
  canRoll: boolean;
  label: string;
  onChange: (value: string) => void;
  onRoll: () => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-3">
      <Field label={label}>
        <Select value={value} placeholder={label} options={options} onValueChange={onChange} />
      </Field>
      <Button
        type="button"
        icon={RefreshCw}
        variant="secondary"
        disabled={!canRoll}
        onClick={onRoll}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function TravelAssumptions({ assumptions }: { assumptions: string[] }) {
  if (assumptions.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs font-bold uppercase text-muted-foreground">Assumptions</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
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
