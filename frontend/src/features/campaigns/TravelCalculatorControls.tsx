import { CloudRain, Thermometer, RefreshCw, Wind as WindIcon } from "lucide-react";
import type { ElementType } from "react";
import { Button, Checkbox, Field, Input, Select } from "../../components/ui";
import {
  distanceUnitOptions,
  paceOptions,
  precipitationOptions,
  temperatureDeltaOptions,
  temperatureOptions,
  terrainOptions,
  windOptions,
} from "./travelOptions";
import type { TravelFormState, TravelWeather, TravelWeatherRollRequest } from "./travelTypes";
import { ComputedRouteDistance, RouteModeToggle, RoutePointField } from "./TravelRouteControls";

export type TravelRollTarget = "temperature" | "wind" | "precipitation" | "weather" | "encounter";

export function TravelInputControls({
  canCalculate,
  destinationMode,
  form,
  locationOptions,
  onDestinationModeChange,
  onFieldChange,
  onOriginModeChange,
  onRoll,
  onTerrainChange,
  onWeatherChange,
  originMode,
  rollingTarget,
}: {
  canCalculate: boolean;
  destinationMode: "saved" | "custom";
  form: TravelFormState;
  locationOptions: Array<{ value: string; label: string }>;
  onDestinationModeChange: (mode: "saved" | "custom") => void;
  onFieldChange: <K extends keyof TravelFormState>(field: K, value: TravelFormState[K]) => void;
  onOriginModeChange: (mode: "saved" | "custom") => void;
  onRoll: (
    target: TravelRollTarget,
    rollWeather: TravelWeatherRollRequest,
    rollEncounterDistance?: boolean,
    nextForm?: TravelFormState,
  ) => Promise<void>;
  onTerrainChange: (value: string) => void;
  onWeatherChange: <K extends keyof TravelWeather>(field: K, value: TravelWeather[K]) => void;
  originMode: "saved" | "custom";
  rollingTarget: TravelRollTarget | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="grid content-start gap-4 rounded-lg border border-border bg-background p-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <RouteModeToggle
            value={form.routeInputMode}
            onChange={(value) => onFieldChange("routeInputMode", value)}
          />
        </div>
        {form.routeInputMode === "route" ? (
          <>
            <RoutePointField
              label="Origin"
              mode={originMode}
              options={locationOptions}
              value={form.origin}
              onModeChange={onOriginModeChange}
              onValueChange={(value) => onFieldChange("origin", value)}
            />
            <RoutePointField
              label="Destination"
              mode={destinationMode}
              options={locationOptions}
              value={form.destination}
              onModeChange={onDestinationModeChange}
              onValueChange={(value) => onFieldChange("destination", value)}
            />
            <ComputedRouteDistance distance={form.distance} distanceUnit={form.distanceUnit} />
          </>
        ) : (
          <>
            <Field label="Distance">
              <Input
                min="0"
                step="0.1"
                type="number"
                value={form.distance}
                placeholder="24"
                onChange={(event) => onFieldChange("distance", event.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={form.distanceUnit}
                placeholder="Unit"
                options={distanceUnitOptions}
                onValueChange={(value) => onFieldChange("distanceUnit", value)}
              />
            </Field>
          </>
        )}
        <Field label="Terrain">
          <Select
            value={form.terrain}
            placeholder="Terrain"
            options={terrainOptions}
            onValueChange={onTerrainChange}
          />
        </Field>
        <Field label="Pace">
          <Select
            value={form.pace}
            placeholder="Pace"
            options={paceOptions}
            onValueChange={(value) => onFieldChange("pace", value)}
          />
        </Field>
        <div className="md:col-span-2">
          <Checkbox
            label="Good roads"
            checked={form.goodRoads}
            onChange={(checked) => onFieldChange("goodRoads", checked)}
          />
        </div>
      </div>
      <div className="grid content-start gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-3 lg:grid-cols-1">
        <WeatherControls
          weather={form.weather}
          canRoll={canCalculate}
          rollingTarget={rollingTarget}
          onWeatherChange={onWeatherChange}
          onRoll={(target, rollWeather) => void onRoll(target, rollWeather)}
        />
        <Button
          type="button"
          icon={RefreshCw}
          variant="secondary"
          className={rollButtonClass(rollingTarget === "weather")}
          disabled={!canCalculate}
          onClick={() =>
            void onRoll("weather", { temperature: true, wind: true, precipitation: true })
          }
        >
          Roll all weather
        </Button>
      </div>
    </div>
  );
}

export function JourneySaveRow({
  canCalculate,
  editing,
  name,
  onNameChange,
  onSave,
}: {
  canCalculate: boolean;
  editing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <Field label="Journey name">
        <Input
          value={name}
          placeholder="Optional; defaults from route or distance"
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      <Button type="button" disabled={!canCalculate} onClick={onSave}>
        {editing ? "Update journey" : "Save journey"}
      </Button>
    </div>
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
