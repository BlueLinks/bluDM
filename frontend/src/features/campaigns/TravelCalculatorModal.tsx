import { RefreshCw } from "lucide-react";
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
import { TravelCalculatorResults, type TravelResultTab } from "./TravelCalculatorResults";

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
  const [activeTab, setActiveTab] = useState<TravelResultTab>("travel");
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
          </div>
          <TravelCalculatorResults
            activeTab={activeTab}
            calculation={calculation}
            canCalculate={canCalculate}
            encounterDistanceFeet={form.encounterDistanceFeet}
            terrain={form.terrain}
            weather={form.weather}
            onEncounterDistanceChange={setEncounterDistance}
            onRollEncounterDistance={() => void calculate(noWeatherRolls, true)}
            onTabChange={setActiveTab}
          />
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
