import type { Dispatch, SetStateAction } from "react";
import { Button, Field, FormSection, Input, Textarea } from "../../components/ui";
import type { CreatureFeatureFormState, CreatureFormState } from "../../types";

type CreatureFormSetter = Dispatch<SetStateAction<CreatureFormState>>;

export function CreatureFeatureSections({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  function updateTrait(index: number, patch: Partial<CreatureFeatureFormState>) {
    setForm((current) => ({
      ...current,
      traits: current.traits.map((trait, traitIndex) =>
        traitIndex === index ? { ...trait, ...patch } : trait,
      ),
    }));
  }

  return (
    <FormSection
      title="Traits and legendary rules"
      help="Traits are descriptive features. Use the action editor for abilities that need rolls, usage, or a specific action section."
    >
      <div className="grid gap-3">
        {form.traits.map((trait, index) => (
          <div className="grid min-w-0 gap-3 rounded-lg border border-border p-3" key={index}>
            <div className="flex min-w-0 flex-wrap items-end gap-3">
              <Field className="min-w-0 flex-1" label={`Trait ${index + 1} name`}>
                <Input
                  value={trait.name}
                  onChange={(event) => updateTrait(index, { name: event.target.value })}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    traits: current.traits.filter((_, traitIndex) => traitIndex !== index),
                  }))
                }
              >
                Remove
              </Button>
            </div>
            <Field label={`Trait ${index + 1} description`}>
              <Textarea
                rows={3}
                value={trait.description}
                onChange={(event) => updateTrait(index, { description: event.target.value })}
              />
            </Field>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                traits: [...current.traits, { name: "", description: "" }],
              }))
            }
          >
            Add trait
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Legendary action introduction">
          <Textarea
            rows={3}
            value={form.legendaryDescription}
            onChange={(event) => setForm({ ...form, legendaryDescription: event.target.value })}
          />
        </Field>
        <Field label="Mythic action introduction">
          <Textarea
            rows={3}
            value={form.mythicDescription}
            onChange={(event) => setForm({ ...form, mythicDescription: event.target.value })}
          />
        </Field>
      </div>
    </FormSection>
  );
}
