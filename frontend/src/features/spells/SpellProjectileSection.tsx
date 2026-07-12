import { Checkbox, Field, FormSection, Input } from "../../components/ui";
import type { SpellFormState } from "../../types";
import { SpellNotice, SpellSubsection } from "./SpellFormLayout";
import { blankProjectileScaling } from "./spellFormState";
import { ordinal, scalingPhrase, SpellScalingFields } from "./SpellScalingFields";

export function ProjectileSection({
  form,
  setForm,
}: {
  form: SpellFormState;
  setForm: (form: SpellFormState) => void;
}) {
  const scaling = form.projectileScaling;
  const targetConfig = scaling ?? blankProjectileScaling();
  const cantripTargetScaling = hasCantripTargetScaling(targetConfig);
  const scalingMode = cantripTargetScaling ? "cantrip" : "traditional";
  const targetScalingEnabled =
    !!scaling && (scaling.scalingType !== "none" || cantripTargetScaling);
  const setTargetConfig = (projectileScaling: NonNullable<SpellFormState["projectileScaling"]>) =>
    setForm({ ...form, projectileScaling });
  return (
    <FormSection
      title="Targets"
      help="Use this when one casting can affect several targets or create several projectiles."
    >
      <div className="grid gap-4 md:grid-cols-[minmax(10rem,14rem)_1fr] md:items-end">
        <Field
          label="Targets"
          help="How many targets or projectiles the spell can affect before any scaling."
        >
          <Input
            type="number"
            min="1"
            value={targetConfig.baseProjectiles}
            onChange={(event) =>
              setTargetConfig({ ...targetConfig, baseProjectiles: event.target.value })
            }
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{projectileSummary(targetConfig)}</p>
        </div>
      </div>
      <SpellSubsection
        title="Target Scaling"
        description="Enable only when higher scaling changes how many targets or projectiles can be affected."
      >
        <Checkbox
          label="Targets scale"
          checked={targetScalingEnabled}
          onChange={(checked) =>
            setTargetConfig({
              ...targetConfig,
              scalingType: checked ? "spell_level" : "none",
              scaleFromLevel: checked ? targetConfig.scaleFromLevel : "0",
              additionalProjectiles: checked ? targetConfig.additionalProjectiles : "0",
              stepSize: checked ? targetConfig.stepSize : "1",
              description: checked ? targetConfig.description : "",
              cantrip5Targets: checked ? targetConfig.cantrip5Targets : "0",
              cantrip11Targets: checked ? targetConfig.cantrip11Targets : "0",
              cantrip17Targets: checked ? targetConfig.cantrip17Targets : "0",
            })
          }
        />
        {targetScalingEnabled ? (
          <>
            <TargetScalingModeTabs
              mode={scalingMode}
              onChange={(mode) =>
                setTargetConfig(
                  mode === "cantrip"
                    ? asCantripTargetScaling(targetConfig)
                    : asTraditionalTargetScaling(targetConfig),
                )
              }
            />
            {scalingMode === "traditional" ? (
              <SpellScalingFields
                value={targetConfig}
                onChange={(next) => setTargetConfig({ ...targetConfig, ...next })}
                amount={
                  <Field
                    label="Additional targets"
                    help="How many targets or projectiles are added each scaling step."
                  >
                    <Input
                      type="number"
                      value={targetConfig.additionalProjectiles}
                      onChange={(event) =>
                        setTargetConfig({
                          ...targetConfig,
                          additionalProjectiles: event.target.value,
                        })
                      }
                    />
                  </Field>
                }
                generated={projectileScalingDescription(targetConfig)}
                label="Target scaling"
              />
            ) : (
              <CantripTargetScalingFields value={targetConfig} onChange={setTargetConfig} />
            )}
            <Field
              label="At higher levels description"
              help="Leave blank to use the generated wording."
            >
              <Input
                value={targetConfig.description}
                placeholder={projectileScalingDescription(targetConfig)}
                onChange={(event) =>
                  setTargetConfig({ ...targetConfig, description: event.target.value })
                }
              />
            </Field>
          </>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">
            Enable only for spells that add more targets or projectiles at higher slot, character,
            or spell scale values.
          </p>
        )}
      </SpellSubsection>
    </FormSection>
  );
}

function projectileScalingDescription(value: NonNullable<SpellFormState["projectileScaling"]>) {
  const scalingType = value.scalingType || "none";
  const base = Number(value.baseProjectiles) || 1;
  if (hasCantripTargetScaling(value)) {
    return cantripTargetScalingDescription(value);
  }
  const from = Number(value.scaleFromLevel) || 1;
  const added = Number(value.additionalProjectiles) || 1;
  const step = Math.max(1, Number(value.stepSize) || 1);
  if (scalingType === "none") {
    return `The spell can affect ${targetLabel(base)}.`;
  }
  return scalingPhrase({
    scalingType,
    from,
    step,
    effect: `the spell can affect ${targetLabel(added)} more`,
  });
}

function projectileSummary(value: NonNullable<SpellFormState["projectileScaling"]>) {
  const base = Number(value.baseProjectiles) || 1;
  if (hasCantripTargetScaling(value)) {
    return `${targetLabel(base)}, ${cantripTargetParts(value).join(", ")}`;
  }
  const added = Number(value.additionalProjectiles) || 0;
  const from = Number(value.scaleFromLevel) || 0;
  if (value.scalingType === "none" || added <= 0 || from <= 0) {
    return targetLabel(base);
  }
  return `${targetLabel(base)}, +${targetLabel(added)} from ${ordinal(from)}`;
}

function targetLabel(count: number) {
  return `${count} target${count === 1 ? "" : "s"}`;
}

function TargetScalingModeTabs({
  mode,
  onChange,
}: {
  mode: "traditional" | "cantrip";
  onChange: (mode: "traditional" | "cantrip") => void;
}) {
  return (
    <div className="grid w-full grid-cols-2 rounded-md border border-border bg-card p-1">
      {[
        { value: "traditional", label: "Traditional" },
        { value: "cantrip", label: "Cantrip" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          className={[
            "rounded px-3 py-2 text-sm font-semibold transition",
            mode === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          ].join(" ")}
          onClick={() => onChange(option.value as "traditional" | "cantrip")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CantripTargetScalingFields({
  onChange,
  value,
}: {
  onChange: (value: NonNullable<SpellFormState["projectileScaling"]>) => void;
  value: NonNullable<SpellFormState["projectileScaling"]>;
}) {
  return (
    <SpellSubsection
      title="Cantrip Breakpoints"
      description="Set exact character-level target or projectile counts."
    >
      <Field
        label="Cantrip target counts"
        help="Use exact character-level breakpoints for cantrips whose target or projectile count changes."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <CantripTargetField
            label="5th level"
            value={value.cantrip5Targets}
            onChange={(cantrip5Targets) => onChange({ ...value, cantrip5Targets })}
          />
          <CantripTargetField
            label="11th level"
            value={value.cantrip11Targets}
            onChange={(cantrip11Targets) => onChange({ ...value, cantrip11Targets })}
          />
          <CantripTargetField
            label="17th level"
            value={value.cantrip17Targets}
            onChange={(cantrip17Targets) => onChange({ ...value, cantrip17Targets })}
          />
        </div>
      </Field>
      <SpellNotice>{cantripTargetScalingDescription(value)}</SpellNotice>
    </SpellSubsection>
  );
}

function CantripTargetField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function hasCantripTargetScaling(value: NonNullable<SpellFormState["projectileScaling"]>) {
  return (
    Number(value.cantrip5Targets) > 0 ||
    Number(value.cantrip11Targets) > 0 ||
    Number(value.cantrip17Targets) > 0
  );
}

function asCantripTargetScaling(value: NonNullable<SpellFormState["projectileScaling"]>) {
  return {
    ...value,
    scalingType: "character_level",
    additionalProjectiles: "0",
    cantrip5Targets: value.cantrip5Targets !== "0" ? value.cantrip5Targets : "2",
    cantrip11Targets: value.cantrip11Targets !== "0" ? value.cantrip11Targets : "3",
    cantrip17Targets: value.cantrip17Targets !== "0" ? value.cantrip17Targets : "4",
  };
}

function asTraditionalTargetScaling(value: NonNullable<SpellFormState["projectileScaling"]>) {
  return {
    ...value,
    scalingType: value.scalingType === "none" ? "spell_level" : value.scalingType,
    cantrip5Targets: "0",
    cantrip11Targets: "0",
    cantrip17Targets: "0",
  };
}

function cantripTargetScalingDescription(value: NonNullable<SpellFormState["projectileScaling"]>) {
  const parts = cantripTargetParts(value);
  if (parts.length === 0) return "No exact cantrip target breakpoints configured.";
  return `This cantrip can affect ${parts.join(", ")}. Each target or projectile should be resolved separately in combat.`;
}

function cantripTargetParts(value: NonNullable<SpellFormState["projectileScaling"]>) {
  return [
    cantripTargetPart("5th", value.cantrip5Targets),
    cantripTargetPart("11th", value.cantrip11Targets),
    cantripTargetPart("17th", value.cantrip17Targets),
  ].filter(Boolean);
}

function cantripTargetPart(label: string, value: string) {
  const count = Number(value) || 0;
  return count > 0 ? `${targetLabel(count)} at ${label} level` : "";
}
