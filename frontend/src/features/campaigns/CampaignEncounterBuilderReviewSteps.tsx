import { Check, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { ActionRow, ResponsiveGrid } from "../../components/layout";
import { Button, Field, FloatingInput, Select, Textarea } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import { encounterRuleset2014, type EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Player } from "../../types";
import {
  CreatureCombatantCard,
  PlayerCombatantCard,
  creatureRole,
} from "../encounters/EncounterCombatantCard";
import { EncounterDifficultyPanel } from "../encounters/EncounterDifficultyPanel";
import type {
  EncounterBuilderCreatureDraft,
  EncounterBuilderMetaDraft,
  EncounterBuilderStep,
} from "./encounterBuilderGenerator";
import { previewCombatantsFromDrafts, terrainOptions } from "./encounterBuilderGenerator";
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";

export function ReviewCreateStep({
  allies,
  difficultyRuleset = encounterRuleset2014,
  enemies,
  locations,
  meta,
  players,
  onLocationChange,
  onMetaChange,
}: {
  allies: EncounterBuilderCreatureDraft[];
  difficultyRuleset?: EncounterRuleset;
  enemies: EncounterBuilderCreatureDraft[];
  locations: CampaignLocation[];
  meta: EncounterBuilderMetaDraft;
  players: Player[];
  onLocationChange: (locationId: string) => void;
  onMetaChange: (meta: EncounterBuilderMetaDraft) => void;
}) {
  const difficulty = calculateEncounterDifficulty(
    players,
    previewCombatantsFromDrafts(enemies),
    difficultyRuleset,
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
      <div className="grid content-start gap-4">
        <section className="grid gap-3 rounded-md border border-border bg-card p-3">
          <h3 className="font-semibold">Encounter Details</h3>
          <FloatingInput
            label="Encounter name"
            value={meta.name}
            onChange={(name) => onMetaChange({ ...meta, name })}
            required
          />
          <ResponsiveGrid variant="form2">
            <Field label="World location">
              <select
                className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
                value={meta.locationId}
                onChange={(event) => onLocationChange(event.target.value)}
              >
                <option value="">No structured location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {locationPathLabel(location)}
                  </option>
                ))}
              </select>
            </Field>
            <FloatingInput
              label="Location label"
              value={meta.location}
              onChange={(location) => onMetaChange({ ...meta, location })}
            />
            <FloatingInput
              label="Room"
              value={meta.roomNumber}
              onChange={(roomNumber) => onMetaChange({ ...meta, roomNumber })}
            />
          </ResponsiveGrid>
          <ResponsiveGrid variant="form2">
            <Field label="Environment">
              <Select
                value={meta.environment}
                placeholder="Environment"
                options={terrainOptions}
                onValueChange={(environment) => onMetaChange({ ...meta, environment })}
              />
            </Field>
            <FloatingInput
              label="Time"
              value={meta.timeOfDay}
              onChange={(timeOfDay) => onMetaChange({ ...meta, timeOfDay })}
            />
          </ResponsiveGrid>
          <Field label="Description">
            <Textarea
              rows={4}
              value={meta.description}
              onChange={(event) => onMetaChange({ ...meta, description: event.target.value })}
            />
          </Field>
          <Field label="DM notes">
            <Textarea
              rows={3}
              value={meta.dmNotes}
              onChange={(event) => onMetaChange({ ...meta, dmNotes: event.target.value })}
            />
          </Field>
        </section>
        <EncounterDifficultyPanel compact difficulty={difficulty} />
      </div>
      <section className="grid content-start gap-3 rounded-md border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h3 className="font-semibold">Review Participants</h3>
        </div>
        <ReviewList title={`Players (${players.length})`}>
          {players.map((player) => (
            <PlayerCombatantCard compact key={player.id} player={player} />
          ))}
        </ReviewList>
        <ReviewList title={`Allies (${allies.length})`}>
          {allies.map((ally) => (
            <CreatureCombatantCard
              compact
              key={ally.id}
              creature={ally.creature}
              quantity={ally.quantity > 1 ? `Qty ${ally.quantity}` : undefined}
            />
          ))}
        </ReviewList>
        <ReviewList title={`Enemies (${enemies.length} groups)`}>
          {enemies.map((enemy) => (
            <CreatureCombatantCard
              compact
              key={enemy.id}
              creature={enemy.creature}
              quantity={`Qty ${enemy.quantity}`}
              role={creatureRole(enemy.creature)}
            />
          ))}
        </ReviewList>
      </section>
    </div>
  );
}

function ReviewList({ children, title }: { children: ReactNode; title: string }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="grid gap-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
      {items.length ? items : <p className="text-sm text-muted-foreground">None</p>}
    </div>
  );
}

export function FooterActions({
  canAdvance,
  canSave,
  saving,
  step,
  onBack,
  onCancel,
  onNext,
  onSave,
}: {
  canAdvance: boolean;
  canSave: boolean;
  saving: boolean;
  step: EncounterBuilderStep;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  return (
    <ActionRow
      className="z-20 border-t border-border bg-card py-[0.6875rem] pl-[1.875rem] pr-7"
      justify="between"
    >
      <ActionRow className="gap-5">
        <Button className="w-24 !py-1" size="sm" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {step !== "party" ? (
          <Button className="w-20 !py-1" size="sm" type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </ActionRow>
      <ActionRow justify="end">
        {step !== "review" ? (
          <Button
            className="w-[11.125rem] whitespace-nowrap !py-1"
            size="sm"
            type="button"
            disabled={!canAdvance}
            onClick={onNext}
          >
            {step === "party" ? "Next: Encounter Setup" : "Next: Review & Create"}
          </Button>
        ) : null}
        {step === "review" ? (
          <Button
            className="!py-1"
            size="sm"
            type="button"
            icon={Check}
            disabled={!canSave || saving}
            onClick={onSave}
          >
            {saving ? "Saving..." : "Create encounter"}
          </Button>
        ) : null}
      </ActionRow>
    </ActionRow>
  );
}
