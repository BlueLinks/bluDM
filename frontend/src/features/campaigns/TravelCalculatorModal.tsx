import { CloudRain, Thermometer, RefreshCw, Wind as WindIcon } from "lucide-react";
import type { ElementType } from "react";
import { useEffect, useState } from "react";
import { Button, Callout, Checkbox, Field, Input, Modal, Select } from "../../components/ui";
import { api } from "../../lib/api";
import {
  blankTravelForm,
  distanceUnitOptions,
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
import { TravelCalculatorResults } from "./TravelCalculatorResults";
import {
  ComputedRouteDistance,
  RouteModeToggle,
  RoutePointField,
  type RouteInputMode,
} from "./TravelRouteControls";

const noWeatherRolls = { temperature: false, wind: false, precipitation: false };
type TravelRollTarget = "temperature" | "wind" | "precipitation" | "weather" | "encounter";

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
  const [routeInputMode, setRouteInputMode] = useState<RouteInputMode>("route");
  const [originMode, setOriginMode] = useState<"saved" | "custom">("saved");
  const [destinationMode, setDestinationMode] = useState<"saved" | "custom">("saved");
  const [rollAnimationKey, setRollAnimationKey] = useState(0);
  const [rollingTarget, setRollingTarget] = useState<TravelRollTarget | null>(null);
  const [error, setError] = useState("");
  const canCalculate = Number(form.distance) > 0;

  useEffect(() => {
    if (!open || !canCalculate) {
      setCalculation(null);
      return;
    }
    const timer = window.setTimeout(
      () => void calculate(noWeatherRolls, form.encounterDistanceFeet === null),
      250,
    );
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

  async function calculate(
    rollWeather: TravelWeatherRollRequest,
    rollEncounterDistance = false,
    nextForm = form,
  ) {
    if (Number(nextForm.distance) <= 0) return;
    setError("");
    try {
      const payload = await api.calculateTravel(
        campaignId,
        nextForm,
        rollWeather,
        rollEncounterDistance,
      );
      setCalculation(payload.calculation);
      setForm((current) => ({
        ...current,
        encounterDistanceFeet: payload.calculation.encounterDistance.rolledFeet,
        weather: payload.calculation.weather,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate travel");
    }
  }

  async function rollWithAnimation(
    target: TravelRollTarget,
    rollWeather: TravelWeatherRollRequest,
    rollEncounterDistance = false,
    nextForm = form,
  ) {
    setRollingTarget(target);
    await calculate(rollWeather, rollEncounterDistance, nextForm);
    setRollAnimationKey((current) => current + 1);
    window.setTimeout(() => setRollingTarget(null), 520);
  }

  function setTerrain(value: string) {
    setForm((current) => ({ ...current, terrain: value, encounterDistanceFeet: null }));
  }

  function setEncounterDistance(value: string) {
    const nextForm = { ...form, encounterDistanceFeet: Number(value) };
    setForm(nextForm);
    void calculate(noWeatherRolls, false, nextForm);
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
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="grid content-start gap-4 rounded-lg border border-border bg-background p-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <RouteModeToggle value={routeInputMode} onChange={setRouteInputMode} />
              </div>
              {routeInputMode === "route" && (
                <>
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
                  <ComputedRouteDistance
                    distance={form.distance}
                    distanceUnit={form.distanceUnit}
                  />
                </>
              )}
              {routeInputMode === "distance" && (
                <>
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
                </>
              )}
              <Field label="Terrain">
                <Select
                  value={form.terrain}
                  placeholder="Terrain"
                  options={terrainOptions}
                  onValueChange={setTerrain}
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
            <div className="grid content-start gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-3 lg:grid-cols-1">
              <WeatherControls
                weather={form.weather}
                canRoll={canCalculate}
                rollingTarget={rollingTarget}
                onWeatherChange={setWeather}
                onRoll={(target, rollWeather) => void rollWithAnimation(target, rollWeather)}
              />
              <Button
                type="button"
                icon={RefreshCw}
                variant="secondary"
                className={rollButtonClass(rollingTarget === "weather")}
                disabled={!canCalculate}
                onClick={() =>
                  void rollWithAnimation("weather", {
                    temperature: true,
                    wind: true,
                    precipitation: true,
                  })
                }
              >
                Roll all weather
              </Button>
            </div>
          </div>
          <TravelCalculatorResults
            animationKey={rollAnimationKey}
            calculation={calculation}
            canCalculate={canCalculate}
            encounterDistanceFeet={form.encounterDistanceFeet}
            terrain={form.terrain}
            weather={form.weather}
            onEncounterDistanceChange={setEncounterDistance}
            onRollEncounterDistance={() =>
              void rollWithAnimation("encounter", noWeatherRolls, true)
            }
            rollingEncounter={rollingTarget === "encounter"}
          />
        </div>
      </div>
    </Modal>
  );
}

function WeatherControls({
  canRoll,
  onRoll,
  onWeatherChange,
  rollingTarget,
  weather,
}: {
  canRoll: boolean;
  onRoll: (target: TravelRollTarget, rollWeather: TravelWeatherRollRequest) => void;
  onWeatherChange: <K extends keyof TravelWeather>(field: K, value: TravelWeather[K]) => void;
  rollingTarget: TravelRollTarget | null;
  weather: TravelWeather;
}) {
  return (
    <>
      <div className="grid gap-2 rounded-lg border border-border bg-background p-3">
        <Field label={<WeatherLabel icon={Thermometer} label="Temperature" />}>
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
          className={rollButtonClass(rollingTarget === "temperature")}
          disabled={!canRoll}
          onClick={() =>
            onRoll("temperature", { temperature: true, wind: false, precipitation: false })
          }
        >
          Roll temperature
        </Button>
      </div>
      <WeatherSelectRow
        icon={WindIcon}
        label="Wind"
        buttonLabel="Roll wind"
        canRoll={canRoll}
        rolling={rollingTarget === "wind"}
        options={windOptions}
        value={weather.wind}
        onChange={(value) => onWeatherChange("wind", value as TravelWeather["wind"])}
        onRoll={() => onRoll("wind", { temperature: false, wind: true, precipitation: false })}
      />
      <WeatherSelectRow
        icon={CloudRain}
        label="Precipitation"
        buttonLabel="Roll precipitation"
        canRoll={canRoll}
        rolling={rollingTarget === "precipitation"}
        options={precipitationOptions}
        value={weather.precipitation}
        onChange={(value) =>
          onWeatherChange("precipitation", value as TravelWeather["precipitation"])
        }
        onRoll={() =>
          onRoll("precipitation", { temperature: false, wind: false, precipitation: true })
        }
      />
    </>
  );
}

function WeatherSelectRow({
  buttonLabel,
  canRoll,
  icon: Icon,
  label,
  onChange,
  onRoll,
  options,
  rolling,
  value,
}: {
  buttonLabel: string;
  canRoll: boolean;
  icon: ElementType;
  label: string;
  onChange: (value: string) => void;
  onRoll: () => void;
  options: Array<{ value: string; label: string }>;
  rolling: boolean;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-3">
      <Field label={<WeatherLabel icon={Icon} label={label} />}>
        <Select value={value} placeholder={label} options={options} onValueChange={onChange} />
      </Field>
      <Button
        type="button"
        icon={RefreshCw}
        variant="secondary"
        className={rollButtonClass(rolling)}
        disabled={!canRoll}
        onClick={onRoll}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function WeatherLabel({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function rollButtonClass(rolling: boolean) {
  return rolling
    ? "travel-roll-button -translate-y-px shadow-[0_0_0_3px_hsl(var(--primary)/14%)] [&>svg]:rotate-[360deg] [&>svg]:scale-110 [&>svg]:transition-transform [&>svg]:duration-500"
    : "travel-roll-button";
}
