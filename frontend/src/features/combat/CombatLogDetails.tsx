import type { CombatLogEvent, EncounterRunCombatant } from "../../types";

export function CombatLogDetails({
  combatants,
  event,
}: {
  combatants: EncounterRunCombatant[];
  event: CombatLogEvent;
}) {
  const payload = event.payload ?? {};
  const results = arrayRecords(payload.results);
  const resource = recordValue(payload.resource);
  const notes = textValue(payload.notes);
  if (results.length === 0 && Object.keys(resource).length === 0 && !notes) return null;

  return (
    <div className="mt-2 grid gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
      {event.actorId && <Detail label="Actor" value={combatantName(event.actorId, combatants)} />}
      {results.map((result, index) => (
        <TargetResolutionDetail key={`${textValue(result.targetId)}-${index}`} result={result} />
      ))}
      {Object.keys(resource).length > 0 && (
        <Detail
          label="Resource"
          value={
            textValue(resource.kind) === "spell_slot"
              ? `Level ${numberValue(resource.spellLevel)} slot · ${numberValue(resource.before)} → ${numberValue(resource.after)}`
              : textValue(resource.kind) || "Updated"
          }
        />
      )}
      {notes && <Detail label="Note" value={notes} />}
    </div>
  );
}

function TargetResolutionDetail({ result }: { result: Record<string, unknown> }) {
  const components = arrayRecords(result.damageComponents);
  const conditions = arrayRecords(result.conditions)
    .map((condition) => textValue(condition.name))
    .filter(Boolean);
  const rollTotal = numberValue(result.rollTotal);
  return (
    <div className="grid gap-1 border-l-2 border-border pl-2">
      <div className="font-semibold text-foreground">
        {textValue(result.targetName) || "Target"}
        {textValue(result.outcome) && ` · ${textValue(result.outcome)}`}
        {rollTotal > 0 && ` · ${rollTotal}`}
      </div>
      {components.map((component, index) => (
        <div className="grid gap-0.5" key={`${textValue(component.id)}-${index}`}>
          <div>
            {textValue(component.formula) || numberValue(component.amount)}{" "}
            {textValue(component.damageType)}
            {textValue(component.defense) && ` · ${textValue(component.defense)}`}
            {` · ${numberValue(component.amount)} → ${numberValue(component.finalAmount)}`}
          </div>
          {(numberValue(component.rolledValue) > 0 ||
            numberValue(component.criticalRolledValue) > 0 ||
            Boolean(component.manualOverride)) && (
            <div>
              {component.manualOverride ? "Manual total override" : damageRollDetail(component)}
            </div>
          )}
        </div>
      ))}
      {numberValue(result.finalDamage) > 0 && (
        <Detail
          label="Damage"
          value={`${numberValue(result.rawDamage)} raw · ${numberValue(result.finalDamage)} applied`}
        />
      )}
      {numberValue(result.healing) > 0 && (
        <Detail label="Healing" value={`${numberValue(result.healing)} applied`} />
      )}
      {result.temporaryHitPoints != null && (
        <Detail
          label="Temporary HP"
          value={`${numberValue(result.temporaryHitPoints)} · ${textValue(result.temporaryHitPointsMode) || "keep higher"}`}
        />
      )}
      {conditions.length > 0 && <Detail label="Conditions" value={conditions.join(", ")} />}
    </div>
  );
}

function damageRollDetail(component: Record<string, unknown>) {
  const parts = [`dice ${numberValue(component.rolledValue)}`];
  if (numberValue(component.criticalRolledValue) > 0) {
    parts.push(`critical ${numberValue(component.criticalRolledValue)}`);
  }
  if (numberValue(component.modifier) !== 0) {
    const modifier = numberValue(component.modifier);
    parts.push(`modifier ${modifier > 0 ? "+" : ""}${modifier}`);
  }
  return parts.join(" · ");
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold text-foreground">{label}:</span> {value}
    </div>
  );
}

function combatantName(id: string, combatants: EncounterRunCombatant[]) {
  return combatants.find((combatant) => combatant.id === id)?.displayName ?? "Unknown combatant";
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(recordValue) : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
