import { useEffect, useState } from "react";
import { Callout, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import { blankTravelForm } from "./travelOptions";
import {
  JourneySaveRow,
  TravelInputControls,
  type TravelRollTarget,
} from "./TravelCalculatorControls";
import type {
  CampaignJourney,
  CampaignLocation,
  TravelCalculation,
  TravelFormState,
  TravelWeather,
  TravelWeatherRollRequest,
} from "./travelTypes";
import { TravelCalculatorResults } from "./TravelCalculatorResults";

const noWeatherRolls = { temperature: false, wind: false, precipitation: false };

export function TravelCalculatorModal({
  campaignId,
  editingJourney,
  locations,
  onJourneySaved,
  open,
  onEditComplete,
  onOpenChange,
}: {
  campaignId: string;
  editingJourney?: CampaignJourney | null;
  locations: CampaignLocation[];
  onJourneySaved: () => Promise<void>;
  open: boolean;
  onEditComplete?: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<TravelFormState>(blankTravelForm);
  const [calculation, setCalculation] = useState<TravelCalculation | null>(null);
  const [originMode, setOriginMode] = useState<"saved" | "custom">("saved");
  const [destinationMode, setDestinationMode] = useState<"saved" | "custom">("saved");
  const [journeyName, setJourneyName] = useState("");
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

  useEffect(() => {
    if (!open || !editingJourney) return;
    setForm(journeyToForm(editingJourney));
    setJourneyName(editingJourney.name);
    setCalculation(null);
  }, [editingJourney, open]);

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

  async function saveJourney() {
    if (!canCalculate) return;
    setError("");
    try {
      if (editingJourney) {
        await api.updateCampaignJourney(campaignId, editingJourney.id, form, journeyName);
      } else {
        await api.createCampaignJourney(campaignId, form, journeyName);
      }
      setJourneyName("");
      await onJourneySaved();
      onEditComplete?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save journey");
    }
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
          <TravelInputControls
            canCalculate={canCalculate}
            destinationMode={destinationMode}
            form={form}
            locationOptions={locationOptions}
            originMode={originMode}
            rollingTarget={rollingTarget}
            onDestinationModeChange={setDestinationMode}
            onFieldChange={setField}
            onOriginModeChange={setOriginMode}
            onRoll={rollWithAnimation}
            onTerrainChange={setTerrain}
            onWeatherChange={setWeather}
          />
          <JourneySaveRow
            canCalculate={canCalculate}
            editing={Boolean(editingJourney)}
            name={journeyName}
            onNameChange={setJourneyName}
            onSave={() => void saveJourney()}
          />
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

function journeyToForm(journey: CampaignJourney): TravelFormState {
  return {
    routeInputMode: journey.routeInputMode,
    origin: journey.origin,
    destination: journey.destination,
    distance: String(journey.distance),
    distanceUnit: journey.distanceUnit,
    terrain: journey.terrain,
    pace: journey.pace,
    goodRoads: journey.goodRoads,
    encounterDistanceFeet: journey.encounterDistanceFeet,
    weather: journey.weather,
  };
}
