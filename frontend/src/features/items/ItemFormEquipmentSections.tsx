import { Badge, Checkbox, Field, Input, Select } from "../../components/ui";
import type { ItemFormState } from "../../types";
import {
  abilityOptions,
  acModeOptions,
  armorCategoryOptions,
  damageTypeOptions,
  dexModifierOptions,
  focusFamilyOptions,
  masteryOptions,
  toolCategoryOptions,
  weaponCategoryOptions,
  weaponPropertyOptions,
  weaponRangeOptions,
} from "./itemFormOptions";
import { DetailSection, type SetItemFormField } from "./ItemFormSectionShell";

export function WeaponFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  const setWeaponCategory = (weaponCategory: string) => {
    setField("weaponCategory", weaponCategory);
    setField("itemType", weaponItemType(weaponCategory, form.weaponRange));
  };
  const setWeaponRange = (weaponRange: string) => {
    setField("weaponRange", weaponRange);
    setField("itemType", weaponItemType(form.weaponCategory, weaponRange));
  };

  return (
    <DetailSection title="Type details: Weapon">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Weapon kind">
          <Select
            value={form.weaponCategory}
            placeholder="Weapon kind"
            options={weaponCategoryOptions}
            onValueChange={setWeaponCategory}
          />
        </Field>
        <Field label="Range">
          <Select
            value={form.weaponRange}
            placeholder="Range"
            options={weaponRangeOptions}
            onValueChange={setWeaponRange}
          />
        </Field>
        <Field label="Mastery">
          <Select
            value={form.mastery}
            placeholder="Mastery"
            options={masteryOptions}
            onValueChange={(value) => setField("mastery", value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <Field label="Damage dice">
          <Input
            placeholder="1d8"
            value={form.damageDice}
            onChange={(event) => setField("damageDice", event.target.value)}
          />
        </Field>
        <Field label="Damage type">
          <Select
            value={form.damageType}
            placeholder="Damage type"
            options={[{ value: "", label: "None" }, ...damageTypeOptions]}
            onValueChange={(value) => setField("damageType", value)}
          />
        </Field>
        <Field label="Two-handed damage">
          <Input
            placeholder="1d10"
            value={form.twoHandedDamageDice}
            onChange={(event) => setField("twoHandedDamageDice", event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Normal range">
          <Input
            min="0"
            type="number"
            value={form.normalRange}
            onChange={(event) => setField("normalRange", event.target.value)}
          />
        </Field>
        <Field label="Long range">
          <Input
            min="0"
            type="number"
            value={form.longRange}
            onChange={(event) => setField("longRange", event.target.value)}
          />
        </Field>
        <Field label="Thrown normal">
          <Input
            min="0"
            type="number"
            value={form.thrownNormalRange}
            onChange={(event) => setField("thrownNormalRange", event.target.value)}
          />
        </Field>
        <Field label="Thrown long">
          <Input
            min="0"
            type="number"
            value={form.thrownLongRange}
            onChange={(event) => setField("thrownLongRange", event.target.value)}
          />
        </Field>
      </div>
      <ChipSelect
        label="Properties"
        options={weaponPropertyOptions}
        values={form.properties}
        onChange={(properties) => setField("properties", properties)}
      />
    </DetailSection>
  );
}

export function ArmorFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  const isShield = form.armorCategory === "Shield" || form.itemType === "Shield";
  const showArmorConstraints = Boolean(
    !isShield || form.dexModifier !== "none" || form.strengthMinimum || form.stealthDisadvantage,
  );
  const setArmorCategory = (armorCategory: string) => {
    setField("armorCategory", armorCategory);
    setField("itemType", armorCategory);
    if (armorCategory === "Shield") {
      setField("acMode", "bonus");
      setField("acBonus", form.acBonus || "2");
      setField("shield", true);
    } else {
      setField("shield", false);
    }
  };
  const setACMode = (mode: ItemFormState["acMode"]) => {
    setField("acMode", mode);
    if (isShield && mode === "bonus" && !form.acBonus) setField("acBonus", "2");
  };

  return (
    <DetailSection title="Type details: Armor">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Armor category">
          <Select
            value={form.armorCategory}
            placeholder="Armor category"
            options={armorCategoryOptions}
            onValueChange={setArmorCategory}
          />
        </Field>
        <Field label="AC mode">
          <Select
            value={form.acMode}
            placeholder="AC mode"
            options={acModeOptions}
            onValueChange={(value) => setACMode(value as ItemFormState["acMode"])}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {form.acMode === "base" ? (
          <Field label="Base AC">
            <Input
              min="0"
              type="number"
              value={form.acBase}
              onChange={(event) => setField("acBase", event.target.value)}
            />
          </Field>
        ) : (
          <Field label="AC bonus">
            <Input
              min="0"
              type="number"
              value={form.acBonus}
              onChange={(event) => setField("acBonus", event.target.value)}
            />
          </Field>
        )}
        {showArmorConstraints && (
          <>
            <Field label="Dex modifier">
              <Select
                value={form.dexModifier}
                placeholder="Dex modifier"
                options={dexModifierOptions}
                onValueChange={(value) => setField("dexModifier", value)}
              />
            </Field>
            <Field label="Strength minimum">
              <Input
                min="0"
                type="number"
                value={form.strengthMinimum}
                onChange={(event) => setField("strengthMinimum", event.target.value)}
              />
            </Field>
          </>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {showArmorConstraints && (
          <Checkbox
            label="Stealth disadvantage"
            checked={form.stealthDisadvantage}
            onChange={(checked) => setField("stealthDisadvantage", checked)}
          />
        )}
        <Checkbox
          label="Shield behavior"
          checked={form.shield}
          onChange={(checked) => setField("shield", checked)}
        />
      </div>
    </DetailSection>
  );
}

export function ToolFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  const setToolCategory = (toolCategory: string) => {
    setField("toolCategory", toolCategory);
    setField("itemType", toolCategory);
  };

  return (
    <DetailSection title="Type details: Tool">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tool category">
          <Select
            value={form.toolCategory}
            placeholder="Tool category"
            options={toolCategoryOptions}
            onValueChange={setToolCategory}
          />
        </Field>
        <Field label="Ability">
          <Select
            value={form.ability}
            placeholder="Ability"
            options={abilityOptions}
            onValueChange={(value) => setField("ability", value)}
          />
        </Field>
      </div>
      <Field label="Utilize">
        <Input
          placeholder="Pick a lock"
          value={form.utilize}
          onChange={(event) => setField("utilize", event.target.value)}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Craft outputs">
          <Input
            placeholder="keys, traps"
            value={form.craftOutputs}
            onChange={(event) => setField("craftOutputs", event.target.value)}
          />
        </Field>
        <Field label="Variants">
          <Input
            placeholder="variant names"
            value={form.variants}
            onChange={(event) => setField("variants", event.target.value)}
          />
        </Field>
      </div>
    </DetailSection>
  );
}

export function FocusFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  const setFocusFamily = (focusFamily: string) => {
    setField("focusFamily", focusFamily);
    setField("itemType", focusType(focusFamily));
  };

  return (
    <DetailSection title="Type details: Focus">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Focus family">
          <Select
            value={form.focusFamily}
            placeholder="Focus family"
            options={focusFamilyOptions}
            onValueChange={setFocusFamily}
          />
        </Field>
        <Field label="Variant">
          <Input
            placeholder="Wand, amulet, staff"
            value={form.focusVariant}
            onChange={(event) => setField("focusVariant", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Spellcasting focus treatment">
        <Input
          placeholder="Held, worn, displayed, or object-interaction notes"
          value={form.focusUsage}
          onChange={(event) => setField("focusUsage", event.target.value)}
        />
      </Field>
      <Badge tone="custom">Spellcasting focus</Badge>
    </DetailSection>
  );
}

function weaponItemType(weaponCategory: string, weaponRange: string) {
  return `${weaponCategory} ${weaponRange} Weapons`;
}

function focusType(focusFamily: string) {
  if (focusFamily === "Druidic") return "Druidic Focus";
  if (focusFamily === "Holy symbol") return "Holy Symbol";
  return "Arcane Focus";
}

function ChipSelect({
  label,
  onChange,
  options,
  values,
}: {
  label: string;
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  values: string[];
}) {
  const selected = new Set(values);
  return (
    <div className="grid gap-2">
      <div className="text-[0.82rem] font-semibold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              ].join(" ")}
              onClick={() =>
                onChange(
                  active
                    ? values.filter((value) => value !== option.value)
                    : [...values, option.value],
                )
              }
            >
              {active ? `${option.label} x` : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
