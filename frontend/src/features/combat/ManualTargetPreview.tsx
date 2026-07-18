import { Check, X } from "lucide-react";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { Button, Input } from "../../components/ui";
import type { EncounterRunCombatant } from "../../types";
import { previewResolutionTarget, type ResolutionTarget } from "./resolutionModel";

export function ManualTargetPreview({
  combatants,
  results,
  onChange,
}: {
  combatants: EncounterRunCombatant[];
  results: ResolutionTarget[];
  onChange: (result: ResolutionTarget) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-max text-sm">
        <thead className="bg-surface text-left text-xs text-surface-foreground">
          <tr>
            <th className="px-2 py-2">Target</th>
            <th className="px-2 py-2">Current</th>
            <th className="px-2 py-2">Multiplier</th>
            <th className="px-2 py-2">Damage</th>
            <th className="px-2 py-2">Projected</th>
            <th className="px-2 py-2">
              <span className="sr-only">Include</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const combatant = combatants.find((target) => target.id === result.targetId);
            if (!combatant) return null;
            const preview = previewResolutionTarget(combatant, result);
            return (
              <tr
                key={result.targetId}
                className={
                  result.included ? "border-t border-border" : "border-t border-border opacity-50"
                }
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <InitialsAvatar
                      name={combatant.displayName}
                      src={combatant.avatarUrl}
                      size="sm"
                    />
                    <span className="max-w-40 truncate font-medium">{combatant.displayName}</span>
                  </div>
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {combatant.currentHitPoints} HP · {combatant.temporaryHitPoints} temp
                </td>
                <td className="px-2 py-2">
                  <Input
                    aria-label={`${combatant.displayName} damage multiplier`}
                    className="w-20"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step="0.25"
                    type="number"
                    value={result.damageMultiplier}
                    onChange={(event) =>
                      onChange({ ...result, damageMultiplier: Number(event.target.value) || 0 })
                    }
                  />
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {preview.rawDamage} raw · {preview.finalDamage} final
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {preview.projectedHitPoints} HP · {preview.projectedTemporaryHitPoints} temp
                </td>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`${result.included ? "Exclude" : "Include"} ${combatant.displayName}`}
                    onClick={() => onChange({ ...result, included: !result.included })}
                  >
                    {result.included ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
