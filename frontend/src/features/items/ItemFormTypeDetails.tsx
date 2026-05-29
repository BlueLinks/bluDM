import type { ItemFormState } from "../../types";
import {
  AmmunitionFields,
  ConsumableFields,
  FoodLodgingFields,
  GenericFields,
  MountVehicleFields,
  PackFields,
} from "./ItemFormCatalogSections";
import { ArmorFields, FocusFields, ToolFields, WeaponFields } from "./ItemFormEquipmentSections";
import type { SetItemFormField } from "./ItemFormSectionShell";

export function TypeDetails({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  const kind = categoryKindFor(form.category);
  if (kind === "weapon") return <WeaponFields form={form} setField={setField} />;
  if (kind === "armor") return <ArmorFields form={form} setField={setField} />;
  if (kind === "tool") return <ToolFields form={form} setField={setField} />;
  if (kind === "focus") return <FocusFields form={form} setField={setField} />;
  if (kind === "pack") return <PackFields form={form} setField={setField} />;
  if (kind === "ammunition") return <AmmunitionFields form={form} setField={setField} />;
  if (kind === "consumable") return <ConsumableFields form={form} setField={setField} />;
  if (kind === "food") return <FoodLodgingFields form={form} setField={setField} />;
  if (kind === "mount") return <MountVehicleFields form={form} setField={setField} mount />;
  if (kind === "vehicle") return <MountVehicleFields form={form} setField={setField} />;
  return <GenericFields form={form} setField={setField} />;
}

export function categoryKindFor(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("weapon")) return "weapon";
  if (normalized.includes("armor")) return "armor";
  if (normalized.includes("tool")) return "tool";
  if (normalized.includes("focus")) return "focus";
  if (normalized.includes("pack")) return "pack";
  if (normalized.includes("ammunition")) return "ammunition";
  if (normalized.includes("food")) return "food";
  if (normalized.includes("mount")) return "mount";
  if (normalized.includes("vehicle")) return "vehicle";
  if (normalized.includes("wondrous")) return "consumable";
  return "generic";
}
