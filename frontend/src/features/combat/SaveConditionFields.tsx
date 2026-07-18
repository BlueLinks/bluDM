import { Field, Input, Select } from "../../components/ui";
import type { ResolutionCondition } from "./resolutionModel";

export function SaveConditionFields({
  failure,
  success,
  onFailureChange,
  onSuccessChange,
}: {
  failure: ResolutionCondition;
  success: ResolutionCondition;
  onFailureChange: (condition: ResolutionCondition) => void;
  onSuccessChange: (condition: ResolutionCondition) => void;
}) {
  return (
    <div className="grid gap-3 border-t border-border pt-3">
      <ConditionRow label="failed" condition={failure} onChange={onFailureChange} />
      <ConditionRow label="successful" condition={success} onChange={onSuccessChange} />
    </div>
  );
}

function ConditionRow({
  condition,
  label,
  onChange,
}: {
  condition: ResolutionCondition;
  label: "failed" | "successful";
  onChange: (condition: ResolutionCondition) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label={`Condition on ${label} save`}>
        <Input
          placeholder="Optional"
          value={condition.name}
          onChange={(event) => onChange({ ...condition, name: event.target.value })}
        />
      </Field>
      <Field label={`${label === "failed" ? "Failure" : "Success"} duration`}>
        <Input
          placeholder="For example, 1 minute"
          value={condition.duration}
          onChange={(event) => onChange({ ...condition, duration: event.target.value })}
        />
      </Field>
      <Field label={`${label === "failed" ? "Failure" : "Success"} expiry`}>
        <Select
          value={condition.expiry}
          placeholder="Expiry"
          options={[
            { value: "manual", label: "Manual removal" },
            { value: "start_turn", label: "Start of turn" },
            { value: "end_turn", label: "End of turn" },
            { value: "save_ends", label: "Save ends" },
            { value: "repeated_save", label: "Repeated save" },
            { value: "concentration", label: "Concentration-linked" },
          ]}
          onValueChange={(expiry) => onChange({ ...condition, expiry })}
        />
      </Field>
    </div>
  );
}
