import { Minus, Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
import { Field, Input } from "../../components/ui";
import {
  effectiveCharacterLevel,
  levelFromExperience,
  levelXpThresholds,
} from "../../lib/domain/progression";
import type { PlayerFormState } from "../../types";

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

export function CharacterProgressFields({
  form,
  setForm,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  const xpLevel = levelFromExperience(Number(form.experiencePoints) || 0);
  const effectiveLevel = effectiveCharacterLevel(form.level, form.experiencePoints);
  const overrideActive = form.level.trim() !== "";
  const setLevel = (level: number) =>
    setForm({ ...form, level: String(Math.min(20, Math.max(1, level))) });
  const setLevelMode = (mode: "xp" | "level") => {
    if (mode === "xp") {
      setForm({ ...form, level: "" });
      return;
    }
    setLevel(effectiveLevel);
  };

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(180px,220px)_minmax(240px,360px)]">
      <div className="grid gap-2 self-start">
        <div className="inline-grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card text-xs font-bold uppercase text-muted-foreground">
          <button
            type="button"
            className={[
              "px-3 py-2 transition",
              !overrideActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            ].join(" ")}
            onClick={() => setLevelMode("xp")}
          >
            Use XP
          </button>
          <button
            type="button"
            className={[
              "border-l border-border px-3 py-2 transition",
              overrideActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            ].join(" ")}
            onClick={() => setLevelMode("level")}
          >
            Set level
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{overrideActive ? "Set level" : "XP level"}</span>
          <span className="text-2xl font-black leading-none text-foreground">{effectiveLevel}</span>
        </div>
      </div>
      {!overrideActive ? (
        <XpProgressFields form={form} setForm={setForm} xpLevel={xpLevel} />
      ) : (
        <LevelOverrideField form={form} setForm={setForm} effectiveLevel={effectiveLevel} />
      )}
    </div>
  );
}

function XpProgressFields({
  form,
  setForm,
  xpLevel,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
  xpLevel: number;
}) {
  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(150px,200px)_minmax(120px,150px)]">
      <Field
        className="min-w-0"
        label={
          <span className="inline-flex items-center gap-2">
            XP
            <InfoHelpButton title="XP needed by level">
              <XpThresholdList />
            </InfoHelpButton>
          </span>
        }
      >
        <Input
          type="number"
          min={0}
          value={form.experiencePoints}
          onChange={(event) => setForm({ ...form, experiencePoints: event.target.value })}
        />
      </Field>
      <div className="grid gap-1 self-end rounded-md border border-border bg-background px-3 py-2">
        <span className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
          Level
        </span>
        <span className="text-3xl font-black leading-none text-foreground">{xpLevel}</span>
      </div>
    </div>
  );
}

function LevelOverrideField({
  form,
  setForm,
  effectiveLevel,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
  effectiveLevel: number;
}) {
  const setLevel = (level: number) =>
    setForm({ ...form, level: String(Math.min(20, Math.max(1, level))) });

  return (
    <div className="grid min-w-0 gap-2">
      <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">
        Level
        <InfoHelpButton title="XP needed by level">
          <XpThresholdList />
        </InfoHelpButton>
      </span>
      <div className="grid max-w-[136px] grid-cols-[2.25rem_4rem_2.25rem] overflow-hidden rounded-md border border-border bg-background">
        <button
          className="flex h-10 w-9 shrink-0 appearance-none items-center justify-center border-r border-border p-0 leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
          type="button"
          onClick={() => setLevel(effectiveLevel - 1)}
          aria-label="Decrease level"
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          className="h-10 min-h-0 w-16 rounded-none border-0 text-center font-semibold focus:ring-0"
          type="number"
          min={1}
          max={20}
          value={form.level}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") {
              setForm({ ...form, level: "" });
              return;
            }
            setLevel(Number(value) || 1);
          }}
        />
        <button
          className="flex h-10 w-9 shrink-0 appearance-none items-center justify-center border-l border-border p-0 leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
          type="button"
          onClick={() => setLevel(effectiveLevel + 1)}
          aria-label="Increase level"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        className="justify-self-start text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        type="button"
        onClick={() => setForm({ ...form, level: "" })}
      >
        Use XP instead
      </button>
    </div>
  );
}

function XpThresholdList() {
  return (
    <div className="grid max-h-72 grid-cols-2 gap-x-4 overflow-y-auto pr-1 text-xs">
      {levelXpThresholds.map((xp, index) => (
        <div key={xp} className="flex justify-between gap-3 border-b border-border/60 py-1">
          <span className="font-semibold">Level {index + 1}</span>
          <span className="tabular-nums text-muted-foreground">{xp.toLocaleString()} XP</span>
        </div>
      ))}
    </div>
  );
}
