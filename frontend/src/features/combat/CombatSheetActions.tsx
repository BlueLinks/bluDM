import type { CreatureAction, EncounterRunCombatant } from "../../types";
import { profileFeatures } from "../creatures/creatureProfileData";

export function CombatSheetActions({
  combatant,
  notes,
  sheet,
}: {
  combatant: EncounterRunCombatant;
  notes: string;
  sheet: Record<string, unknown>;
}) {
  const snapshotActions = combatant.snapshot.actions;
  const actions = Array.isArray(snapshotActions)
    ? snapshotActions.filter(
        (action: unknown): action is CreatureAction =>
          action !== null &&
          typeof action === "object" &&
          "name" in action &&
          typeof action.name === "string",
      )
    : [];
  const groups = profileFeatures({ statBlock: sheet }, actions);

  if (groups.length === 0 && !notes) {
    return <p className="text-sm text-muted-foreground">No features or combat notes recorded.</p>;
  }

  return (
    <div className="grid gap-4 text-sm">
      {groups.map((group) => (
        <section key={group.title} className="grid gap-2">
          <h3 className="border-b border-border pb-1 font-semibold">{group.title}</h3>
          {group.introduction ? (
            <p className="whitespace-pre-wrap text-muted-foreground">{group.introduction}</p>
          ) : null}
          {group.items.map((item, index) => (
            <div key={`${group.title}-${item.name}-${index}`} className="grid gap-0.5">
              <div className="font-medium">{item.name}</div>
              {item.detail ? (
                <div className="text-xs text-muted-foreground">{item.detail}</div>
              ) : null}
              {item.description ? (
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ))}
      {notes ? (
        <section className="grid gap-2">
          <h3 className="border-b border-border pb-1 font-semibold">Combat notes</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">{notes}</p>
        </section>
      ) : null}
    </div>
  );
}
