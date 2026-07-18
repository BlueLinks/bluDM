import { Dice5, Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select } from "../../components/ui";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { createId } from "../../lib/domain/ids";
import type { EncounterRunCombatant } from "../../types";
import {
  parseDamageFormula,
  rollDamageComponent,
  type ResolutionDamageComponent,
} from "./resolutionModel";

export function ResolutionContextHeader({
  actor,
  sourceName,
  targets,
}: {
  actor: EncounterRunCombatant | null;
  sourceName: string;
  targets: EncounterRunCombatant[];
}) {
  return (
    <div className="grid gap-2 border-b border-border pb-3 sm:grid-cols-2">
      <div className="min-w-0">
        <div className="text-sm font-semibold">Source</div>
        <div className="truncate text-sm text-muted-foreground">
          {actor?.displayName ?? "External effect"} · {sourceName || "Manual save"}
        </div>
      </div>
      <div className="min-w-0 sm:text-right">
        <div className="text-sm font-semibold">
          {targets.length} target{targets.length === 1 ? "" : "s"}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          {targets.map((target) => target.displayName).join(", ")}
        </div>
      </div>
    </div>
  );
}

export function DamageComponentEditor({
  components,
  critical = false,
  onChange,
}: {
  components: ResolutionDamageComponent[];
  critical?: boolean;
  onChange: (components: ResolutionDamageComponent[]) => void;
}) {
  function update(id: string, change: Partial<ResolutionDamageComponent>) {
    onChange(
      components.map((component) =>
        component.id === id ? { ...component, ...change } : component,
      ),
    );
  }

  function roll(id: string) {
    onChange(
      components.map((component) =>
        component.id === id ? (rollDamageComponent(component, critical) ?? component) : component,
      ),
    );
  }

  const canRoll = components.some((component) => parseDamageFormula(component.formula));

  return (
    <section className="grid gap-2" aria-label="Damage components">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Damage components</div>
          <div className="text-xs text-muted-foreground">
            Each type is mitigated separately for every target.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Dice5}
            disabled={!canRoll}
            onClick={() =>
              onChange(
                components.map(
                  (component) => rollDamageComponent(component, critical) ?? component,
                ),
              )
            }
          >
            {critical ? "Roll all critical damage" : "Roll all damage"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() =>
              onChange([
                ...components,
                {
                  id: createId(),
                  source: "Manual",
                  formula: "",
                  amount: 0,
                  damageType: "untyped",
                  rolledValue: 0,
                  criticalRolledValue: 0,
                  modifier: 0,
                  criticalBehavior: "double_dice",
                  mitigation: "apply",
                  manualOverride: false,
                },
              ])
            }
          >
            Add component
          </Button>
        </div>
      </div>
      {components.map((component, index) => (
        <DamageComponentRow
          key={component.id}
          component={component}
          index={index}
          onRemove={() => onChange(components.filter((item) => item.id !== component.id))}
          onRoll={() => roll(component.id)}
          onUpdate={(change) => update(component.id, change)}
        />
      ))}
      {components.length === 0 && (
        <div className="border-t border-dashed border-border py-3 text-sm text-muted-foreground">
          No damage will be applied. Saves may still apply conditions or notes.
        </div>
      )}
    </section>
  );
}

function DamageComponentRow({
  component,
  index,
  onRemove,
  onRoll,
  onUpdate,
}: {
  component: ResolutionDamageComponent;
  index: number;
  onRemove: () => void;
  onRoll: () => void;
  onUpdate: (change: Partial<ResolutionDamageComponent>) => void;
}) {
  const hasRoll = Boolean(component.rolledValue || component.criticalRolledValue);
  return (
    <div className="grid min-w-0 gap-2 border-t border-border pt-2 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <Field label={`Component ${index + 1} formula`}>
        <Input
          placeholder="2d6 + 3"
          value={component.formula}
          onChange={(event) => onUpdate({ formula: event.target.value, manualOverride: false })}
        />
      </Field>
      <Field label="Rolled total">
        <Input
          aria-label="Rolled total"
          inputMode="numeric"
          min={0}
          type="number"
          value={component.amount}
          onChange={(event) =>
            onUpdate({ amount: Number(event.target.value) || 0, manualOverride: true })
          }
        />
        <div className="mt-1 text-xs text-muted-foreground">{damageRollBreakdown(component)}</div>
      </Field>
      <Field label="Damage type">
        <Select
          value={component.damageType}
          placeholder="Damage type"
          options={[{ value: "untyped", label: "Untyped" }, ...damageTypeOptions()]}
          onValueChange={(damageType) => onUpdate({ damageType })}
        />
      </Field>
      <Field label="Critical">
        <Select
          value={component.criticalBehavior ?? "double_dice"}
          placeholder="Critical behavior"
          options={[
            { value: "double_dice", label: "Double dice" },
            { value: "normal", label: "Do not double" },
          ]}
          onValueChange={(criticalBehavior) =>
            onUpdate({ criticalBehavior: criticalBehavior as "double_dice" | "normal" })
          }
        />
      </Field>
      <Field label="Defenses">
        <Select
          value={component.mitigation ?? "apply"}
          placeholder="Defense behavior"
          options={[
            { value: "apply", label: "Apply defenses" },
            { value: "ignore", label: "Ignore defenses" },
          ]}
          onValueChange={(mitigation) => onUpdate({ mitigation: mitigation as "apply" | "ignore" })}
        />
      </Field>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={Dice5}
          disabled={!parseDamageFormula(component.formula)}
          aria-label={`${hasRoll ? "Reroll" : "Roll"} damage component ${index + 1}`}
          onClick={onRoll}
        >
          {hasRoll ? "Reroll" : "Roll"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Remove damage component ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function damageRollBreakdown(component: ResolutionDamageComponent) {
  if (component.manualOverride) return "Manual total override";
  if (!component.rolledValue && !component.criticalRolledValue && !component.modifier) {
    return "Enter a total or roll the formula";
  }
  const values = [`Dice ${component.rolledValue ?? 0}`];
  if (component.criticalRolledValue) values.push(`critical ${component.criticalRolledValue}`);
  if (component.modifier)
    values.push(`modifier ${component.modifier > 0 ? "+" : ""}${component.modifier}`);
  return values.join(" · ");
}
