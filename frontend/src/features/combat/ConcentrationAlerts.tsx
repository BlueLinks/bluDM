import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "../../components/ui";
import type { EncounterRunAlert, EncounterRunCombatant } from "../../types";

export function ConcentrationAlerts({
  alerts,
  combatants,
  onResolve,
}: {
  alerts: EncounterRunAlert[];
  combatants: EncounterRunCombatant[];
  onResolve: (alert: EncounterRunAlert, action: string) => void;
}) {
  if (alerts.length === 0) return null;
  return (
    <div className="grid gap-2">
      {alerts.map((alert) => {
        const actor = combatants.find((combatant) => combatant.id === alert.actorId);
        return (
          <div
            key={alert.id}
            className="rounded-lg border border-warning/50 bg-warning/10 p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-black text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  {alert.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {actor?.displayName ? `${actor.displayName}: ` : ""}
                  {alert.message} DC {alert.dc}.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="success"
                  icon={ShieldCheck}
                  onClick={() => onResolve(alert, "pass")}
                >
                  Passed
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={ShieldX}
                  onClick={() => onResolve(alert, "fail")}
                >
                  Break
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onResolve(alert, "dismiss")}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
