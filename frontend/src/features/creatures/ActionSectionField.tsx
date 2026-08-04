import { Field, Select } from "../../components/ui";
import type { ActionFormState } from "../../types";

const actionSectionOptions = [
  { value: "trait", label: "Trait" },
  { value: "action", label: "Action" },
  { value: "bonus_action", label: "Bonus action" },
  { value: "reaction", label: "Reaction" },
  { value: "legendary_action", label: "Legendary action" },
  { value: "mythic_action", label: "Mythic action" },
  { value: "lair_action", label: "Lair action" },
];

export function ActionSectionField({
  value,
  onChange,
}: {
  value: ActionFormState["displaySection"];
  onChange: (value: ActionFormState["displaySection"]) => void;
}) {
  return (
    <Field label="Stat-block section">
      <Select
        options={actionSectionOptions}
        placeholder="Section"
        value={value}
        onValueChange={(next) => onChange(next as ActionFormState["displaySection"])}
      />
    </Field>
  );
}
