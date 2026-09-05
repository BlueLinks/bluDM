import { damageTypes } from "../../components/shared/damageTypes";
import type { CreatureFormState } from "../../types";
const columns = [
  {
    field: "damageVulnerabilities",
    label: "Vulnerable",
    tone: "text-destructive",
    accent: "accent-destructive",
  },
  {
    field: "damageResistances",
    label: "Resistant",
    tone: "text-warning",
    accent: "accent-warning",
  },
  { field: "damageImmunities", label: "Immune", tone: "text-success", accent: "accent-success" },
] as const;
export function CreatureDamageMatrix({
  form,
  onChange,
}: {
  form: CreatureFormState;
  onChange: (field: (typeof columns)[number]["field"], value: string, checked: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">Damage type defenses</caption>
        <thead className="bg-surface text-surface-foreground">
          <tr>
            <th scope="col" className="p-2 text-left">
              Damage
            </th>
            {columns.map((column) => (
              <th key={column.field} scope="col" className={`p-2 text-xs ${column.tone}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {damageTypes.map((damage) => (
            <tr key={damage.id} className="border-t border-border hover:bg-surface">
              <th scope="row" className="p-2 text-left font-medium">
                <span className={`flex items-center gap-2 ${damage.tone}`}>
                  <damage.icon className="h-4 w-4" />
                  {damage.label}
                </span>
              </th>
              {columns.map((column) => (
                <td key={column.field} className="text-center">
                  <label className="flex min-h-10 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      className={`h-4 w-4 ${column.accent}`}
                      aria-label={`${damage.label} ${column.label.toLowerCase()}`}
                      checked={form[column.field].includes(damage.id)}
                      onChange={(event) => onChange(column.field, damage.id, event.target.checked)}
                    />
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
