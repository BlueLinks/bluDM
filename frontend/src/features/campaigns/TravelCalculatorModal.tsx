import { CalendarDays, CloudSun, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, Callout, Field, Input, Modal, Select } from "../../components/ui";
import { api } from "../../lib/api";
import {
  blankTravelForm,
  climateOptions,
  distanceUnitOptions,
  paceOptions,
  routeConditionOptions,
  terrainOptions,
  travelWeatherOptions,
  sentenceCase,
} from "./travelOptions";
import type {
  CampaignLocation,
  TravelCalculation,
  TravelFormState,
  TravelWeather,
} from "./travelTypes";

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
    const timer = window.setTimeout(() => void calculate(false), 250);
    return () => window.clearTimeout(timer);
  }, [
    open,
    form.origin,
    form.destination,
    form.distance,
    form.distanceUnit,
    form.terrain,
    form.pace,
    form.routeCondition,
    form.climate,
  ]);

  function setField<K extends keyof TravelFormState>(field: K, value: TravelFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function calculate(rerollWeather = false) {
    if (!canCalculate) return;
    setError("");
    try {
      const payload = await api.calculateTravel(campaignId, form, rerollWeather);
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
  const selectedWeather = travelWeatherOptions.find(
    (option) => option.title === form.weather.title,
  );

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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
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
            <Field label="Route condition">
              <Select
                value={form.routeCondition}
                placeholder="Route condition"
                options={routeConditionOptions}
                onValueChange={(value) => setField("routeCondition", value)}
              />
            </Field>
            <Field label="Climate / season">
              <Select
                value={form.climate}
                placeholder="Climate / season"
                options={climateOptions}
                onValueChange={(value) => setField("climate", value)}
              />
            </Field>
          </div>
          <aside className="grid content-start gap-4">
            <TravelDurationSummary calculation={calculation} />
            <TravelWeatherSummary weather={form.weather} />
            <Field label="Weather">
              <Select
                value={selectedWeather?.value ?? ""}
                placeholder="Choose weather"
                options={travelWeatherOptions.map((option) => ({
                  value: option.value,
                  label: `${option.title} (${sentenceCase(option.severity)})`,
                }))}
                onValueChange={(value) => {
                  const weather = travelWeatherOptions.find((option) => option.value === value);
                  if (weather) {
                    setField("weather", {
                      severity: weather.severity,
                      title: weather.title,
                      text: weather.text,
                      prompt: weather.prompt,
                    });
                  }
                }}
              />
            </Field>
            <TravelAssumptions assumptions={calculation?.assumptions ?? []} />
            <Button
              type="button"
              icon={RefreshCw}
              variant="secondary"
              disabled={!canCalculate}
              onClick={() => void calculate(true)}
            >
              Random weather
            </Button>
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
          ? `${calculation.durationHours.toLocaleString()} hours from the current route assumptions.`
          : "Travel time updates when distance, pace, terrain, or route conditions change."}
      </p>
    </div>
  );
}

function TravelWeatherSummary({ weather }: { weather: TravelWeather }) {
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700 dark:text-sky-200">
            <CloudSun className="h-4 w-4" />
            Weather
          </div>
          <h4 className="mt-2 font-semibold">{weather.title || "Choose or randomize weather"}</h4>
        </div>
        {weather.severity && <Badge>{sentenceCase(weather.severity)}</Badge>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {weather.text || "Select weather from the list, or click Random weather."}
      </p>
      {weather.prompt && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <strong>Prompt:</strong> {weather.prompt}
        </p>
      )}
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
