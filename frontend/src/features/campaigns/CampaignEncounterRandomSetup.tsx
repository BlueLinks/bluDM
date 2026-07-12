import { Minus, Plus } from "lucide-react";
import { ResponsiveGrid } from "../../components/layout";
import { Button, Field, Select } from "../../components/ui";
import type { Player } from "../../types";
import {
  CombatantActions,
  CombatantQuantityControl,
  CreatureCombatantCard,
  RolledHpToggle,
  creatureRole,
} from "../encounters/EncounterCombatantCard";
import { RandomPreviewPanel } from "./CampaignEncounterRandomPreview";
import { Toggle } from "./CampaignEncounterBuilderSteps";
import { EncounterArchetypeIcon } from "./encounterArchetypeIcons";
import {
  archetypeOptions,
  challengeOptions,
  enemyCountMax,
  enemyCountMin,
  terrainOptions,
  type EncounterBuilderCreatureDraft,
  type EncounterBuilderPreview,
  type EncounterBuilderRandomOptions,
} from "./encounterBuilderGenerator";

export function EncounterSetupStep({
  allyCount,
  enemies,
  options,
  players,
  preview,
  onAddEnemy,
  onOptionsChange,
  onRegenerate,
  onRemoveEnemy,
  onUpdateEnemy,
}: {
  allyCount: number;
  enemies: EncounterBuilderCreatureDraft[];
  options: EncounterBuilderRandomOptions;
  players: Player[];
  preview: EncounterBuilderPreview;
  onAddEnemy: () => void;
  onOptionsChange: (options: EncounterBuilderRandomOptions) => void;
  onRegenerate: () => void;
  onRemoveEnemy: (id: string) => void;
  onUpdateEnemy: (draft: EncounterBuilderCreatureDraft) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Encounter Type</h3>
            <p className="text-sm text-muted-foreground">Choose what the party is fighting.</p>
          </div>
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddEnemy}>
            Add enemy
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {archetypeOptions.map((option) => (
            <ArchetypeCard
              active={options.archetype === option.value}
              key={option.value}
              option={option}
              onChoose={() => onOptionsChange({ ...options, archetype: option.value })}
            />
          ))}
        </div>
        <ChallengeChooser
          value={options.challenge}
          onChange={(challenge) => onOptionsChange({ ...options, challenge })}
        />
        <ResponsiveGrid variant="form2">
          <Field label="Number of enemy groups">
            <EnemyCountStepper
              value={options.enemyCount}
              onChange={(enemyCount) => onOptionsChange({ ...options, enemyCount })}
            />
          </Field>
          <Field label="Terrain / environment">
            <Select
              value={options.terrain}
              placeholder="Terrain"
              options={terrainOptions}
              onValueChange={(terrain) => onOptionsChange({ ...options, terrain })}
            />
          </Field>
        </ResponsiveGrid>
        <div className="flex flex-wrap gap-4 text-sm">
          <Toggle
            checked={options.useLocationTheme}
            label="Use location theme"
            onChange={(useLocationTheme) => onOptionsChange({ ...options, useLocationTheme })}
          />
          <Toggle
            checked={options.useLocationNotes}
            label="Use location notes"
            onChange={(useLocationNotes) => onOptionsChange({ ...options, useLocationNotes })}
          />
          <Toggle
            checked={options.includeBoss}
            label="Include boss"
            onChange={(includeBoss) => onOptionsChange({ ...options, includeBoss })}
          />
          <Toggle
            checked={options.includeMinions}
            label="Include minions"
            onChange={(includeMinions) => onOptionsChange({ ...options, includeMinions })}
          />
          <Toggle
            checked={options.includeHazards}
            label="Include hazards"
            onChange={(includeHazards) => onOptionsChange({ ...options, includeHazards })}
          />
        </div>
        <EnemyDraftList enemies={enemies} onRemove={onRemoveEnemy} onUpdate={onUpdateEnemy} />
      </div>
      <RandomPreviewPanel
        allyCount={allyCount}
        players={players}
        preview={preview}
        onRegenerate={onRegenerate}
      />
    </div>
  );
}

function ArchetypeCard({
  active,
  option,
  onChoose,
}: {
  active: boolean;
  option: (typeof archetypeOptions)[number];
  onChoose: () => void;
}) {
  return (
    <button
      className={[
        "flex min-w-0 items-start gap-3 rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
      ].join(" ")}
      type="button"
      onClick={onChoose}
    >
      <EncounterArchetypeIcon iconKey={option.iconKey} />
      <span className="min-w-0">
        <span className="block font-semibold">{option.label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{option.copy}</span>
      </span>
    </button>
  );
}

function ChallengeChooser({
  value,
  onChange,
}: {
  value: string;
  onChange: (challenge: string) => void;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="font-semibold">Difficulty</h3>
      <div className="grid gap-2 sm:grid-cols-4">
        {challengeOptions.map((option) => (
          <button
            aria-pressed={value === option.value}
            className={[
              "rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              value === option.value
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
            ].join(" ")}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <span className="block text-base font-semibold">{option.label}</span>
            <span className="mt-1 block text-xs">{challengeCopy(option.value)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function challengeCopy(value: string) {
  if (value === "easy") return "Light pressure";
  if (value === "hard") return "Real danger";
  if (value === "deadly") return "Severe threat";
  return "Expected fight";
}

function EnemyCountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const update = (nextValue: number) => {
    onChange(Math.max(enemyCountMin, Math.min(enemyCountMax, nextValue)));
  };
  return (
    <div className="grid gap-1">
      <div className="inline-flex w-fit items-center overflow-hidden rounded-md border border-border bg-surface">
        <button
          aria-label="Decrease enemy count"
          className="grid h-10 w-10 place-items-center text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={value <= enemyCountMin}
          type="button"
          onClick={() => update(value - 1)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          aria-label="Enemy count"
          className="h-10 w-12 border-x border-border bg-card text-center text-sm font-semibold text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          inputMode="numeric"
          max={enemyCountMax}
          min={enemyCountMin}
          type="number"
          value={value}
          onChange={(event) => update(Number(event.target.value) || enemyCountMin)}
        />
        <button
          aria-label="Increase enemy count"
          className="grid h-10 w-10 place-items-center text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={value >= enemyCountMax}
          type="button"
          onClick={() => update(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {enemyCountMin}-{enemyCountMax} generated groups
      </p>
    </div>
  );
}

function EnemyDraftList({
  enemies,
  onRemove,
  onUpdate,
}: {
  enemies: EncounterBuilderCreatureDraft[];
  onRemove: (id: string) => void;
  onUpdate: (draft: EncounterBuilderCreatureDraft) => void;
}) {
  if (!enemies.length) {
    return (
      <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
        Generated enemies will appear here after the preview is ready. Use Add enemy for manual
        adjustments.
      </p>
    );
  }
  return (
    <section className="grid gap-3 rounded-md border border-border bg-card p-3">
      <h3 className="font-semibold">Generated Enemies</h3>
      <div className="grid gap-2">
        {enemies.map((enemy) => (
          <CreatureCombatantCard
            key={enemy.id}
            creature={enemy.creature}
            quantity={
              <CombatantQuantityControl
                value={enemy.quantity}
                onChange={(quantity) => onUpdate({ ...enemy, quantity })}
              />
            }
            role={creatureRole(enemy.creature)}
            actions={
              <>
                <RolledHpToggle
                  checked={enemy.rolledHp}
                  onChange={(rolledHp) => onUpdate({ ...enemy, rolledHp })}
                />
                <CombatantActions onRemove={() => onRemove(enemy.id)} />
              </>
            }
          />
        ))}
      </div>
    </section>
  );
}
