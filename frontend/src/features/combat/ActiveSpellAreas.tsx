import { Move, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, SectionPanel, Select } from "../../components/ui";
import type { EncounterRunCombatant, EncounterRunEffect, RollMode } from "../../types";

export function ActiveSpellAreas({
  combatants,
  effects,
  onApply,
  onEnd,
  onMove,
}: {
  combatants: EncounterRunCombatant[];
  effects: EncounterRunEffect[];
  onApply: (area: EncounterRunEffect, targetIds: string[], rollMode: RollMode) => void;
  onEnd: (area: EncounterRunEffect) => void;
  onMove: (area: EncounterRunEffect) => void;
}) {
  const areas = useMemo(() => effects.filter(isActiveArea), [effects]);
  if (areas.length === 0) return null;
  return (
    <SectionPanel
      title="Active Areas"
      icon={Sparkles}
      className="combat-panel border-sky-500/40 bg-sky-500/8 p-2 sm:p-3"
      bodyClassName="grid gap-2"
    >
      {areas.map((area) => (
        <ActiveSpellAreaCard
          key={area.id}
          area={area}
          combatants={combatants}
          onApply={onApply}
          onEnd={onEnd}
          onMove={onMove}
        />
      ))}
    </SectionPanel>
  );
}

function ActiveSpellAreaCard({
  area,
  combatants,
  onApply,
  onEnd,
  onMove,
}: {
  area: EncounterRunEffect;
  combatants: EncounterRunCombatant[];
  onApply: (area: EncounterRunEffect, targetIds: string[], rollMode: RollMode) => void;
  onEnd: (area: EncounterRunEffect) => void;
  onMove: (area: EncounterRunEffect) => void;
}) {
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [rollMode, setRollMode] = useState<RollMode>("normal");
  useEffect(() => setTargetIds([]), [area.id]);
  const caster = combatants.find((combatant) => combatant.id === area.casterId);
  const payload = area.payload ?? {};
  const shape = text(payload.shape, "area");
  const radius = numberText(payload.radiusFeet);
  const height = numberText(payload.heightFeet);
  const move = numberText(payload.moveDistanceFeet);
  const damage = layerDamage(payload);
  const trigger = triggerLabel(text(payload.triggerRules, ""));
  const layers = objectRows(payload.layers);
  const tableRows = objectRows(payload.rows);
  const eligibleTargets = combatants.filter((combatant) => !combatant.defeated);
  return (
    <div className="rounded-lg border border-sky-500/30 bg-background/80 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-sky-700 dark:text-sky-200">
            {area.spellName}
          </div>
          <div className="font-semibold">
            {shapeLabel(shape)} {radius && `${radius} ft radius`}
            {height && `, ${height} ft high`}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {caster?.displayName ? `Caster: ${caster.displayName}. ` : ""}
            {damage ? `${damage}. ` : ""}
            {trigger}
          </div>
          {text(payload.riderText, "") && (
            <div className="mt-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
              {text(payload.riderText, "")}
            </div>
          )}
          {layers.length > 0 && <LayerSummary layers={layers} />}
          {tableRows.length > 0 && <RollTableSummary rows={tableRows} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={Move} onClick={() => onMove(area)}>
            Move {move || "area"} ft
          </Button>
          <Button size="sm" variant="danger" icon={X} onClick={() => onEnd(area)}>
            End
          </Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {eligibleTargets.map((combatant) => (
            <Checkbox
              key={combatant.id}
              label={combatant.displayName}
              checked={targetIds.includes(combatant.id)}
              onChange={(checked) =>
                setTargetIds((current) =>
                  checked
                    ? [...new Set([...current, combatant.id])]
                    : current.filter((id) => id !== combatant.id),
                )
              }
            />
          ))}
        </div>
        <div className="grid content-start gap-2">
          <Select
            value={rollMode}
            placeholder="Roll mode"
            options={[
              { value: "normal", label: "Normal" },
              { value: "advantage", label: "Advantage" },
              { value: "disadvantage", label: "Disadvantage" },
            ]}
            onValueChange={(value) => setRollMode(value as RollMode)}
          />
          <Button
            type="button"
            icon={Sparkles}
            disabled={targetIds.length === 0}
            onClick={() => onApply(area, targetIds, rollMode)}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function isActiveArea(effect: EncounterRunEffect) {
  return (
    (effect.effectKind === "battlefield_object" || effect.effectKind === "layered_effect") &&
    effect.payload?.areaSpell === true
  );
}

function LayerSummary({ layers }: { layers: Record<string, unknown>[] }) {
  return (
    <div className="mt-2 grid gap-1">
      {layers.map((layer, index) => (
        <div
          key={`${text(layer.color, "Layer")}-${index}`}
          className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
        >
          <span className="font-semibold">
            {numberText(layer.order) || index + 1}. {text(layer.color, "Layer")}
          </span>
          {layerDamage(layer) && <span> · {layerDamage(layer)}</span>}
          {text(layer.effectText || layer.effect, "") && (
            <span> · {text(layer.effectText || layer.effect, "")}</span>
          )}
          {text(layer.removal, "") && <span> Removal: {text(layer.removal, "")}</span>}
        </div>
      ))}
    </div>
  );
}

function RollTableSummary({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div className="mt-2 grid gap-1">
      {rows.map((row, index) => (
        <div
          key={`${text(row.name, "Outcome")}-${index}`}
          className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
        >
          <span className="font-semibold">
            {numberText(row.roll) || index + 1}. {text(row.name, "Outcome")}
          </span>
          {layerDamage(row) && <span> · {layerDamage(row)}</span>}
          {text(row.effectText || row.effect, "") && (
            <span> · {text(row.effectText || row.effect, "")}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberText(value: unknown) {
  if (typeof value === "number" && value > 0) return String(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
  }
  return "";
}

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
}

function layerDamage(row: Record<string, unknown>) {
  const dice = numberText(row.diceCount);
  const die = numberText(row.dieSize);
  const damageType = text(row.damageType, "");
  return dice && die && damageType ? `${dice}d${die} ${damageType}` : "";
}

function shapeLabel(value: string) {
  return value === "cylinder" ? "Cylinder" : value;
}

function triggerLabel(value: string) {
  if (value === "appear_move_enter_or_end_turn") {
    return "Apply when it appears, moves into a creature, a creature enters, or a creature ends its turn there.";
  }
  if (value === "enter_or_start_turn") {
    return "Apply when a creature enters for the first time on a turn or starts its turn there.";
  }
  return "Apply to creatures currently in the area.";
}
