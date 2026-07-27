import { useState, type ReactNode } from "react";
import { sheetRecord, stringArrayFromSheet } from "../../lib/domain/combat";

type SheetTab = "overview" | "actions" | "defenses";

export function CombatSheetTabs({
  actions,
  overview,
  sheet,
}: {
  actions: ReactNode;
  overview: ReactNode;
  sheet: Record<string, unknown>;
}) {
  const [tab, setTab] = useState<SheetTab>("overview");
  return (
    <div className="grid gap-2">
      <div
        className="grid grid-cols-3 border-b border-border"
        role="tablist"
        aria-label="Combatant sheet sections"
      >
        {(["overview", "actions", "defenses"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            className={[
              "min-h-9 border-b-2 px-1 py-1.5 text-xs font-semibold capitalize",
              tab === option
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setTab(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {tab === "overview" ? overview : null}
      {tab === "actions" ? actions : null}
      {tab === "defenses" ? <DefenseDetails sheet={sheet} /> : null}
    </div>
  );
}

function DefenseDetails({ sheet }: { sheet: Record<string, unknown> }) {
  const senses = senseValues(sheetRecord(sheet.senses));
  const groups = [
    ["Resistances", stringArrayFromSheet(sheet.damageResistances)],
    ["Immunities", stringArrayFromSheet(sheet.damageImmunities)],
    ["Vulnerabilities", stringArrayFromSheet(sheet.damageVulnerabilities)],
    ["Condition immunities", stringArrayFromSheet(sheet.conditionImmunities)],
    ["Senses", senses],
  ] as const;
  return (
    <dl className="grid text-sm">
      {groups.map(([label, values]) => (
        <div
          key={label}
          className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 border-b border-border py-2 last:border-b-0"
        >
          <dt className="font-semibold">{label}</dt>
          <dd className="min-w-0 text-muted-foreground">
            {values.length > 0 ? values.join(", ") : "None recorded"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function senseValues(senses: Record<string, unknown>) {
  return Object.entries(senses).flatMap(([name, raw]) => {
    const sense = sheetRecord(raw);
    if (!sense.enabled) return [];
    const range =
      typeof sense.range === "number" || typeof sense.range === "string" ? sense.range : "";
    return [`${name}${range ? ` ${range} ft.` : ""}`];
  });
}
