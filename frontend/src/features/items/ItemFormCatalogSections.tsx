import { Field, Input, Select, Textarea } from "../../components/ui";
import type { ItemFormState } from "../../types";
import {
  consumeBehaviorOptions,
  consumableTypeOptions,
  foodLodgingQualityOptions,
  mountTypeOptions,
  vehicleTypeOptions,
} from "./itemFormOptions";
import { DetailSection, type SetItemFormField } from "./ItemFormSectionShell";

export function PackFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title="Type details: Pack">
      <Field label="Contents">
        <Textarea
          rows={4}
          placeholder="bedroll, mess kit, 10 torches"
          value={form.contents}
          onChange={(event) => setField("contents", event.target.value)}
        />
      </Field>
    </DetailSection>
  );
}

export function AmmunitionFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title="Type details: Ammunition">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Bundle quantity">
          <Input
            min="0"
            type="number"
            value={form.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </Field>
        <Field label="Compatible weapon">
          <Input
            placeholder="Bow, crossbow, sling"
            value={form.compatibleWeapon}
            onChange={(event) => setField("compatibleWeapon", event.target.value)}
          />
        </Field>
      </div>
    </DetailSection>
  );
}

export function ConsumableFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title="Type details: Consumable">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Consumable type">
          <Select
            value={form.consumableType}
            placeholder="Consumable type"
            options={consumableTypeOptions}
            onValueChange={(value) => setField("consumableType", value)}
          />
        </Field>
        <Field label="Consume behavior">
          <Select
            value={form.consumeBehavior}
            placeholder="Consume behavior"
            options={consumeBehaviorOptions}
            onValueChange={(value) => setField("consumeBehavior", value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Uses">
          <Input
            min="0"
            type="number"
            value={form.uses}
            onChange={(event) => setField("uses", event.target.value)}
          />
        </Field>
        <Field label="Charges">
          <Input
            min="0"
            type="number"
            value={form.charges}
            onChange={(event) => setField("charges", event.target.value)}
          />
        </Field>
        <Field label="Quantity">
          <Input
            min="0"
            type="number"
            value={form.quantity}
            onChange={(event) => setField("quantity", event.target.value)}
          />
        </Field>
      </div>
      <Field label="Effect summary">
        <Input
          placeholder="Restores 2d4 + 2 HP"
          value={form.effect}
          onChange={(event) => setField("effect", event.target.value)}
        />
      </Field>
    </DetailSection>
  );
}

export function FoodLodgingFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title="Type details: Food and Lodging">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Duration or unit">
          <Input
            placeholder="1 day"
            value={form.serviceDuration}
            onChange={(event) => setField("serviceDuration", event.target.value)}
          />
        </Field>
        <Field label="Quality">
          <Select
            value={form.quality}
            placeholder="Quality"
            options={foodLodgingQualityOptions}
            onValueChange={(value) => setField("quality", value)}
          />
        </Field>
        <Field label="Consumable behavior">
          <Select
            value={form.consumeBehavior}
            placeholder="Consumable behavior"
            options={consumeBehaviorOptions}
            onValueChange={(value) => setField("consumeBehavior", value)}
          />
        </Field>
      </div>
      <Field label="Effect or service summary">
        <Input
          placeholder="Daily ration / inn service / meal notes"
          value={form.effect}
          onChange={(event) => setField("effect", event.target.value)}
        />
      </Field>
    </DetailSection>
  );
}

export function MountVehicleFields({
  form,
  mount = false,
  setField,
}: {
  form: ItemFormState;
  mount?: boolean;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title={mount ? "Type details: Mount" : "Type details: Vehicle"}>
      <Field label={mount ? "Mount type" : "Vehicle type"}>
        <Select
          value={form.itemType}
          placeholder={mount ? "Mount type" : "Vehicle type"}
          options={mount ? mountTypeOptions : vehicleTypeOptions}
          onValueChange={(value) => setField("itemType", value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Speed">
          <Input
            placeholder="60 ft"
            value={form.speed}
            onChange={(event) => setField("speed", event.target.value)}
          />
        </Field>
        <Field label="Carrying capacity">
          <Input
            placeholder="480"
            value={form.carryingCapacity}
            onChange={(event) => setField("carryingCapacity", event.target.value)}
          />
        </Field>
        <Field label="AC">
          <Input
            min="0"
            type="number"
            value={form.vehicleArmorClass}
            onChange={(event) => setField("vehicleArmorClass", event.target.value)}
          />
        </Field>
        <Field label="HP">
          <Input
            min="0"
            type="number"
            value={form.vehicleHitPoints}
            onChange={(event) => setField("vehicleHitPoints", event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Crew">
          <Input value={form.crew} onChange={(event) => setField("crew", event.target.value)} />
        </Field>
        <Field label="Passengers">
          <Input
            value={form.passengers}
            onChange={(event) => setField("passengers", event.target.value)}
          />
        </Field>
        <Field label="Cargo">
          <Input value={form.cargo} onChange={(event) => setField("cargo", event.target.value)} />
        </Field>
      </div>
    </DetailSection>
  );
}

export function GenericFields({
  form,
  setField,
}: {
  form: ItemFormState;
  setField: SetItemFormField;
}) {
  return (
    <DetailSection title={`Type details: ${form.category || "Equipment"}`}>
      <Field label="Effect summary">
        <Input value={form.effect} onChange={(event) => setField("effect", event.target.value)} />
      </Field>
    </DetailSection>
  );
}
