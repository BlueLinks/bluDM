import type { ElementType } from "react";
import { Field, Input } from "../../components/ui";

export function ActionNumberInput({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label={
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          {label}
        </span>
      }
    >
      <Input
        className="h-10 min-h-0 text-center font-semibold"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
