import { Field } from "../../../components/ui";

export function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Currency">
      <select
        className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="cp">cp</option>
        <option value="sp">sp</option>
        <option value="ep">ep</option>
        <option value="gp">gp</option>
        <option value="pp">pp</option>
      </select>
    </Field>
  );
}

export function AvailabilitySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Availability">
      <select
        className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="in-stock">In stock</option>
        <option value="limited">Limited</option>
        <option value="special-order">Special order</option>
        <option value="hidden">Hidden</option>
        <option value="sold-out">Sold out</option>
      </select>
    </Field>
  );
}
