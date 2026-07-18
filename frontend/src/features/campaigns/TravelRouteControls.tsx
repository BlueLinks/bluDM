import { Input, Select } from "../../components/ui";
import { distanceUnitOptions, labelFor } from "./world/travelOptions";
import type { RouteInputMode } from "./world/travelTypes";

export function RouteModeToggle({
  onChange,
  value,
}: {
  onChange: (value: RouteInputMode) => void;
  value: RouteInputMode;
}) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-md border border-border bg-surface p-1 text-sm font-semibold sm:w-auto">
      {[
        { value: "route", label: "Route" },
        { value: "distance", label: "Direct distance" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          className={[
            "flex-1 rounded px-3 py-1.5 text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:flex-none",
            value === option.value ? "bg-primary text-primary-foreground shadow-sm" : "",
          ].join(" ")}
          onClick={() => onChange(option.value as RouteInputMode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function RoutePointField({
  label,
  mode,
  onModeChange,
  onValueChange,
  options,
  value,
}: {
  label: string;
  mode: "saved" | "custom";
  onModeChange: (mode: "saved" | "custom") => void;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border bg-surface text-xs font-semibold">
          <button
            className={[
              "px-2 py-1 text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              mode === "saved" ? "bg-primary text-primary-foreground shadow-sm" : "",
            ].join(" ")}
            type="button"
            onClick={() => onModeChange("saved")}
          >
            Saved
          </button>
          <button
            className={[
              "px-2 py-1 text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              mode === "custom" ? "bg-primary text-primary-foreground shadow-sm" : "",
            ].join(" ")}
            type="button"
            onClick={() => onModeChange("custom")}
          >
            Custom
          </button>
        </div>
      </div>
      {mode === "saved" ? (
        <Select
          value={value}
          placeholder={options.length ? "Select location" : "No saved locations"}
          options={options}
          onValueChange={onValueChange}
        />
      ) : (
        <Input
          aria-label={label}
          value={value}
          placeholder="Type a place"
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function ComputedRouteDistance({
  distance,
  distanceUnit,
}: {
  distance: string;
  distanceUnit: string;
}) {
  const label = distance
    ? `${distance} ${labelFor(distanceUnitOptions, distanceUnit)}`
    : "No route distance computed";
  return (
    <div className="md:col-span-2">
      <div className="grid gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
        <span className="text-[0.82rem] font-semibold text-muted-foreground">
          Computed distance
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}
