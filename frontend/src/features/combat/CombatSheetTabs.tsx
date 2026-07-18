import { useState, type ReactNode } from "react";
import { Badge, Button, DeathSaveTrack } from "../../components/ui";
import { sheetRecord, stringArrayFromSheet } from "../../lib/domain/combat";
import { friendlyEffectLabel } from "../../lib/domain/spellMessaging";
import type { EncounterRunCombatant, EncounterRunEffect } from "../../types";

type SheetTab = "overview" | "defenses" | "conditions" | "notes";

export function CombatSheetTabs({
  activeEffects,
  combatant,
  overview,
  sheet,
  onEdit,
}: {
  activeEffects: EncounterRunEffect[];
  combatant: EncounterRunCombatant;
  overview: ReactNode;
  sheet: Record<string, unknown>;
  onEdit?: () => void;
}) {
  const [tab, setTab] = useState<SheetTab>("overview");
  return (
    <div className="grid gap-2">
      <div
        className="grid grid-cols-4 border-b border-border"
        role="tablist"
        aria-label="Combatant sheet sections"
      >
        {(["overview", "defenses", "conditions", "notes"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            className={[
              "border-b-2 px-1 py-2 text-xs font-semibold capitalize",
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
      {tab === "overview" && overview}
      {tab === "defenses" && <DefenseDetails sheet={sheet} />}
      {tab === "conditions" && (
        <ConditionDetails combatant={combatant} effects={activeEffects} onEdit={onEdit} />
      )}
      {tab === "notes" && <NotesDetails sheet={sheet} onEdit={onEdit} />}
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
    <div className="grid gap-2 text-sm">
      {groups.map(([label, values]) => (
        <div
          key={label}
          className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 border-b border-border py-2 last:border-b-0"
        >
          <div className="font-semibold">{label}</div>
          <div className="min-w-0 text-muted-foreground">
            {values.length > 0 ? values.join(", ") : "None recorded"}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConditionDetails({
  combatant,
  effects,
  onEdit,
}: {
  combatant: EncounterRunCombatant;
  effects: EncounterRunEffect[];
  onEdit?: () => void;
}) {
  const concentrating = effects.find((effect) => effect.concentration);
  return (
    <div className="grid gap-3 text-sm">
      {concentrating && (
        <div className="border-l-2 border-primary pl-2">
          <div className="font-semibold">Concentrating</div>
          <div className="text-muted-foreground">
            {concentrating.spellName || friendlyEffectLabel(concentrating)}
          </div>
        </div>
      )}
      <div>
        <div className="font-semibold">Active conditions</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {combatant.conditions.length > 0 ? (
            combatant.conditions.map((condition) => (
              <Badge key={condition} tone="warning">
                {condition}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </div>
      </div>
      {effects.length > 0 && (
        <div className="grid gap-2">
          <div className="font-semibold">Active effects</div>
          {effects.map((effect) => (
            <div key={effect.id} className="border-l-2 border-border pl-2">
              <div>{friendlyEffectLabel(effect)}</div>
              <div className="text-xs text-muted-foreground">
                {effect.timing || "Manual expiry"}
                {effect.concentration ? " · Concentration" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      {combatant.sourceType === "player" && combatant.currentHitPoints <= 0 && (
        <DeathSaveTrack
          successes={combatant.deathSaveSuccesses}
          failures={combatant.deathSaveFailures}
        />
      )}
      {onEdit && (
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
          Edit conditions
        </Button>
      )}
    </div>
  );
}

function NotesDetails({ sheet, onEdit }: { sheet: Record<string, unknown>; onEdit?: () => void }) {
  const notes = textValue(sheet.notes) || textValue(sheet.description);
  const features = stringArrayFromSheet(sheet.feats ?? sheet.features ?? sheet.traits);
  return (
    <div className="grid gap-3 text-sm">
      <div>
        <div className="font-semibold">Combat notes</div>
        <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {notes || "No combat notes recorded."}
        </div>
      </div>
      {features.length > 0 && (
        <div>
          <div className="font-semibold">Key features</div>
          <div className="mt-1 text-muted-foreground">{features.join(", ")}</div>
        </div>
      )}
      {onEdit && (
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
          Open full editor
        </Button>
      )}
    </div>
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

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
