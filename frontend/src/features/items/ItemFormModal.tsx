import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import type { Item, ItemFormState } from "../../types";
import {
  itemCategoryOptions,
  defaultTypeForCategory,
  rarityOptions,
  typeOptionsForCategory,
  valueUnitOptions,
} from "./itemFormOptions";
import { blankItemForm, normalizeFormForCategory, normalizeFormForItemType } from "./itemFormState";
import { categoryKindFor, TypeDetails } from "./ItemFormTypeDetails";

export { blankItemForm };

export function ItemFormModal({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (form: ItemFormState) => Promise<void>;
}) {
  const [form, setForm] = useState(blankItemForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(item ? itemToForm(item) : blankItemForm);
  }, [item, open]);

  const itemTypeOptions = useMemo(() => typeOptionsForCategory(form.category), [form.category]);

  useEffect(() => {
    if (itemTypeOptions.some((option) => option.value === form.itemType)) return;
    setForm((current) =>
      normalizeFormForItemType({
        ...current,
        itemType: defaultTypeForCategory(current.category),
      }),
    );
  }, [form.category, form.itemType, itemTypeOptions]);

  const setField = <Key extends keyof ItemFormState>(key: Key, value: ItemFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setCategory = (category: string) => {
    setForm((current) => normalizeFormForCategory(current, category));
  };

  const setItemType = (itemType: string) => {
    setForm((current) => normalizeFormForItemType({ ...current, itemType }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      className="max-w-5xl p-0"
      title={item ? "Edit item" : "New item"}
      open={open}
      onOpenChange={(next) => !next && onClose()}
      trigger={<span />}
    >
      <form className="grid max-h-[78vh] gap-0 overflow-y-auto" onSubmit={submit}>
        <div className="grid gap-4 border-b border-border bg-background p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_15rem_15rem]">
            <Field label="Name">
              <Input
                value={form.name}
                required
                onChange={(event) => setField("name", event.target.value)}
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                placeholder="Category"
                options={itemCategoryOptions}
                onValueChange={setCategory}
              />
            </Field>
            <Field label="Type">
              <Select
                value={form.itemType}
                placeholder="Type"
                options={itemTypeOptions}
                onValueChange={setItemType}
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_8rem_8rem_8rem]">
            <Field label="Rarity">
              <Select
                value={form.rarity}
                placeholder="Rarity"
                options={rarityOptions}
                onValueChange={(value) => setField("rarity", value)}
              />
            </Field>
            <Field label="Value">
              <Input
                min="0"
                type="number"
                value={form.valueAmount}
                onChange={(event) => setField("valueAmount", event.target.value)}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={form.valueUnit}
                placeholder="Unit"
                options={valueUnitOptions}
                onValueChange={(value) => setField("valueUnit", value)}
              />
            </Field>
            <Field label="Weight">
              <Input
                min="0"
                step="0.01"
                type="number"
                value={form.weight}
                onChange={(event) => setField("weight", event.target.value)}
              />
            </Field>
          </div>
          <Checkbox
            label="Requires attunement"
            checked={form.attunement}
            onChange={(checked) => setField("attunement", checked)}
          />
        </div>

        <div className="grid gap-4 p-4">
          <TypeDetails form={form} setField={setField} />
          <section className="rounded-lg border border-border bg-background p-3">
            <h3 className="font-semibold">Inventory behavior</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Checkbox
                label="Carried"
                checked={form.inventoryCarried}
                onChange={(checked) => setField("inventoryCarried", checked)}
              />
              <Checkbox
                label="Equippable"
                checked={form.inventoryEquippable}
                onChange={(checked) => setField("inventoryEquippable", checked)}
              />
              <Checkbox
                label="Consumable"
                checked={form.inventoryConsumable}
                onChange={(checked) => setField("inventoryConsumable", checked)}
              />
              <Checkbox
                label="Stackable"
                checked={form.inventoryStackable}
                onChange={(checked) => setField("inventoryStackable", checked)}
              />
            </div>
          </section>
          <Field label="Description">
            <Textarea
              rows={6}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </Field>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card p-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function itemToForm(item: Item): ItemFormState {
  const raw = objectValue(item.data.raw);
  const damage = objectValue(item.damage.damage || raw.damage);
  const twoHandedDamage = objectValue(item.damage.two_handed_damage || raw.two_handed_damage);
  const range = objectValue(item.damage.range || raw.range);
  const thrownRange = objectValue(item.damage.throw_range || raw.throw_range);
  const armorClass = objectValue(item.armorClass);
  const inventory = objectValue(item.data.inventory);
  const category = item.category || "Adventuring Gear";
  const itemType = item.itemType || defaultTypeForCategory(category);
  const armorBonus = stringValue(armorClass.bonus);

  return {
    ...blankItemForm,
    ability: stringValue(item.data.ability || raw.ability),
    acBase: stringValue(armorClass.base),
    acBonus: armorBonus,
    acMode: armorBonus ? "bonus" : "base",
    armorCategory:
      stringValue(item.data.armorCategory) || stringAt(raw, "armor_category", "name") || itemType,
    attunement: item.attunement,
    cargo: stringValue(item.data.cargo),
    carryingCapacity: stringValue(item.data.carrying_capacity),
    category,
    charges: stringValue(item.data.charges),
    compatibleWeapon: stringValue(item.data.compatible_weapon),
    consumableType: stringValue(item.data.consumableType) || blankItemForm.consumableType,
    consumeBehavior: stringValue(item.data.consumeBehavior) || blankItemForm.consumeBehavior,
    contents: stringListValue(item.data.contents),
    craftOutputs: stringListValue(item.data.craft_outputs),
    crew: stringValue(item.data.crew),
    damageDice: stringValue(damage.damage_dice),
    damageType: stringAt(damage, "damage_type", "name"),
    description: item.description,
    dexModifier: stringValue(armorClass.dex_modifier) || blankItemForm.dexModifier,
    effect: stringValue(item.data.effect),
    focusFamily: stringValue(item.data.focusFamily) || focusFamilyFrom(item, raw),
    focusUsage: stringValue(item.data.focus_usage),
    focusVariant: stringValue(item.data.variant),
    inventoryCarried: boolValue(inventory.carried, true),
    inventoryConsumable: boolValue(inventory.consumable, categoryKindFor(category) === "food"),
    inventoryEquippable: boolValue(
      inventory.equippable,
      ["armor", "focus", "weapon"].includes(categoryKindFor(category)),
    ),
    inventoryStackable: boolValue(
      inventory.stackable,
      ["ammunition", "pack"].includes(categoryKindFor(category)),
    ),
    itemType,
    longRange: stringValue(range.long),
    mastery: stringValue(item.data.mastery || raw.mastery),
    name: item.name,
    normalRange: stringValue(range.normal),
    passengers: stringValue(item.data.passengers),
    properties: item.properties,
    quality: stringValue(item.data.quality) || blankItemForm.quality,
    quantity: stringValue(item.data.quantity || raw.quantity),
    rarity: item.rarity,
    serviceDuration: stringValue(item.data.serviceDuration),
    shield: boolValue(armorClass.shield, itemType === "Shield"),
    speed: stringValue(item.data.speed),
    stealthDisadvantage: boolValue(armorClass.stealth_disadvantage, false),
    strengthMinimum: stringValue(armorClass.str_minimum || raw.str_minimum),
    thrownLongRange: stringValue(thrownRange.long),
    thrownNormalRange: stringValue(thrownRange.normal),
    toolCategory:
      stringValue(item.data.toolCategory) || stringAt(raw, "tool_category", "name") || itemType,
    twoHandedDamageDice: stringValue(twoHandedDamage.damage_dice),
    uses: stringValue(item.data.uses),
    valueAmount: String(item.valueAmount),
    valueUnit: item.valueUnit || "gp",
    variants: stringListValue(item.data.variants),
    vehicleArmorClass: stringValue(item.data.vehicleArmorClass),
    vehicleHitPoints: stringValue(item.data.vehicleHitPoints),
    weaponCategory:
      stringValue(item.data.weaponCategory) ||
      (itemType.toLowerCase().includes("martial") ? "Martial" : "Simple"),
    weaponRange:
      stringValue(item.data.weaponRange) ||
      (itemType.toLowerCase().includes("ranged") ? "Ranged" : "Melee"),
    weight: String(item.weight),
  };
}

function focusFamilyFrom(item: Item, raw: Record<string, unknown>) {
  const text = [item.category, item.itemType, stringAt(raw, "gear_category", "name")]
    .join(" ")
    .toLowerCase();
  if (text.includes("druidic")) return "Druidic";
  if (text.includes("holy")) return "Holy symbol";
  return "Arcane";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringAt(parent: Record<string, unknown>, key: string, child: string): string {
  return stringValue(objectValue(parent[key])[child]);
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function stringListValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean).join(", ");
  return stringValue(value);
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
