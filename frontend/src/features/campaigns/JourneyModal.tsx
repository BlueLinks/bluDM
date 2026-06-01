import { CalendarDays, CloudSun, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Callout, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import {
  blankJourneyForm,
  climateOptions,
  distanceUnitOptions,
  routeConditionOptions,
  sentenceCase,
  terrainOptions,
  paceOptions,
} from "./journeyOptions";
import type { Journey, JourneyCalculation, JourneyFormState, JourneyWeather } from "./journeyTypes";

export function JourneyModal({
  campaignId,
  journey,
  open,
  onOpenChange,
  onSaved,
}: {
  campaignId: string;
  journey: Journey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<JourneyFormState>(blankJourneyForm);
  const [calculation, setCalculation] = useState<JourneyCalculation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isEditing = Boolean(journey);
  const canCalculate = form.name.trim() !== "" && Number(form.distance) > 0;

  useEffect(() => {
    if (!open) return;
    setError("");
    if (journey) {
      const next = formFromJourney(journey);
      setForm(next);
      setCalculation({
        durationDays: journey.durationDays,
        durationHours: journey.durationHours,
        durationLabel: journey.durationLabel,
        weather: journey.weather,
        assumptions: journey.assumptions,
      });
    } else {
      setForm(blankJourneyForm);
      setCalculation(null);
    }
  }, [journey, open]);

  function setField<K extends keyof JourneyFormState>(field: K, value: JourneyFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setWeather<K extends keyof JourneyWeather>(field: K, value: JourneyWeather[K]) {
    setForm((current) => ({ ...current, weather: { ...current.weather, [field]: value } }));
  }

  async function calculate(rerollWeather = false) {
    setBusy(true);
    setError("");
    try {
      const payload = await api.calculateJourney(campaignId, form, rerollWeather);
      setCalculation(payload.calculation);
      setForm((current) => ({
        ...current,
        weather: payload.calculation.weather,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate journey");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (journey) {
        await api.updateJourney(campaignId, journey.id, form);
      } else {
        await api.createJourney(campaignId, form);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save journey");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit journey" : "Add journey"}
      className="max-w-6xl"
    >
      <form className="grid gap-5" onSubmit={(event) => void save(event)}>
        {error && <Callout tone="danger">{error}</Callout>}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Journey name" className="md:col-span-2">
              <Input
                required
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </Field>
            <Field label="Origin">
              <Input
                value={form.origin}
                onChange={(event) => setField("origin", event.target.value)}
              />
            </Field>
            <Field label="Destination">
              <Input
                value={form.destination}
                onChange={(event) => setField("destination", event.target.value)}
              />
            </Field>
            <Field label="Distance">
              <Input
                min="0"
                step="0.1"
                type="number"
                required
                value={form.distance}
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
            <Field label="DM notes" className="md:col-span-2">
              <Textarea
                rows={5}
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
              />
            </Field>
          </div>
          <aside className="grid content-start gap-4">
            <JourneyDurationSummary calculation={calculation} />
            <JourneyWeatherSummary weather={form.weather} />
            <EditableWeather form={form} setWeather={setWeather} />
            <JourneyAssumptions assumptions={calculation?.assumptions ?? []} />
            <JourneyActions busy={busy} canCalculate={canCalculate} onCalculate={calculate} />
          </aside>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Save journey
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function JourneyAssumptions({ assumptions }: { assumptions: string[] }) {
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

function JourneyActions({
  busy,
  canCalculate,
  onCalculate,
}: {
  busy: boolean;
  canCalculate: boolean;
  onCalculate: (rerollWeather?: boolean) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={!canCalculate || busy}
        onClick={() => void onCalculate(false)}
      >
        Calculate
      </Button>
      <Button
        type="button"
        icon={RefreshCw}
        variant="secondary"
        disabled={!canCalculate || busy}
        onClick={() => void onCalculate(true)}
      >
        Reroll weather
      </Button>
    </div>
  );
}

function JourneyDurationSummary({ calculation }: { calculation: JourneyCalculation | null }) {
  return (
    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-200">
        <CalendarDays className="h-4 w-4" />
        Travel duration
      </div>
      <div className="mt-2 text-3xl font-semibold text-emerald-800 dark:text-emerald-100">
        {calculation?.durationLabel || "Not calculated"}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {calculation
          ? `${calculation.durationHours.toLocaleString()} hours from the current route assumptions.`
          : "Calculate the route to preview travel time before saving."}
      </p>
    </div>
  );
}

function JourneyWeatherSummary({ weather }: { weather: JourneyWeather }) {
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-700 dark:text-sky-200">
            <CloudSun className="h-4 w-4" />
            Generated weather
          </div>
          <h4 className="mt-2 font-semibold">{weather.title || "No weather yet"}</h4>
        </div>
        {weather.severity && <Badge>{sentenceCase(weather.severity)}</Badge>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {weather.text || "Calculate or reroll weather to create an editable forecast."}
      </p>
      {weather.prompt && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <strong>Prompt:</strong> {weather.prompt}
        </p>
      )}
    </div>
  );
}

function EditableWeather({
  form,
  setWeather,
}: {
  form: JourneyFormState;
  setWeather: <K extends keyof JourneyWeather>(field: K, value: JourneyWeather[K]) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Weather title">
        <Input
          value={form.weather.title}
          onChange={(event) => setWeather("title", event.target.value)}
        />
      </Field>
      <Field label="Editable weather text">
        <Textarea
          rows={4}
          value={form.weather.text}
          onChange={(event) => setWeather("text", event.target.value)}
        />
      </Field>
      <Field label="Weather prompt">
        <Textarea
          rows={3}
          value={form.weather.prompt}
          onChange={(event) => setWeather("prompt", event.target.value)}
        />
      </Field>
    </div>
  );
}

function formFromJourney(journey: Journey): JourneyFormState {
  return {
    name: journey.name,
    origin: journey.origin,
    destination: journey.destination,
    distance: String(journey.distance),
    distanceUnit: journey.distanceUnit,
    terrain: journey.terrain,
    pace: journey.pace,
    routeCondition: journey.routeCondition,
    climate: journey.climate,
    weather: journey.weather,
    notes: journey.notes,
  };
}
