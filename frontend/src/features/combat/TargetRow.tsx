import { HeartPulse, Shield, Skull } from "lucide-react";
import type React from "react";
import { Badge, Button, DeathSaveTrack } from "../../components/ui";
import { effectiveAC, effectiveMaxHP, hpBarColor, hpPercent } from "../../lib/domain/combat";
import { defaultCombatantColor } from "../../lib/domain/options";
import { friendlyEffectLabel } from "../../lib/domain/spellMessaging";
import type { EncounterRunCombatant, EncounterRunEffect } from "../../types";
import { RunCombatantAvatar as Avatar } from "./RunCombatantAvatar";

export function TargetRow({
  active = false,
  activeEffects = [],
  down = false,
  combatant,
  selected,
  onSelect,
  onEdit,
  onDeathSave,
}: {
  active?: boolean;
  activeEffects?: EncounterRunEffect[];
  down?: boolean;
  combatant: EncounterRunCombatant;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeathSave?: (
    combatant: EncounterRunCombatant,
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) => void;
}) {
  const pct = hpPercent(combatant);
  const showDeathSaves = combatant.sourceType === "player" && combatant.currentHitPoints <= 0;
  const colorStyle = combatantColorStyle(combatant.colorLabel);
  const sideTone =
    active && selected
      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
      : active
        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
        : selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
          : down
            ? "border-destructive/30 bg-destructive/5 opacity-80"
            : combatant.side === "enemy"
              ? "border-destructive/25 bg-destructive/5"
              : combatant.side === "friendly"
                ? "border-companion-shared/25 bg-companion-shared/5"
                : "border-border bg-background";
  return (
    <div className="combatant-row grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-1 xl:grid-cols-[2.25rem_minmax(0,1fr)]">
      <div
        className={[
          "mt-4 grid h-7 w-7 place-items-center rounded-full border text-xs font-black xl:h-8 xl:w-8 xl:text-sm",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground",
        ].join(" ")}
      >
        {combatant.initiativeSet ? combatant.initiative : "-"}
      </div>
      <div
        className={["target-row-card min-w-0 rounded-lg border p-1.5 xl:p-2", sideTone].join(" ")}
        style={colorStyle}
      >
        <div className="flex min-w-0 items-center gap-1.5 xl:gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left xl:gap-3"
            onClick={onSelect}
          >
            <Avatar combatant={combatant} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
                <div
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-companion-metadata/30 bg-companion-metadata/10 text-companion-metadata xl:h-10 xl:w-10"
                  title="Armor Class"
                >
                  <Shield className="absolute h-7 w-7 opacity-20 xl:h-8 xl:w-8" />
                  <span className="relative text-base font-black xl:text-lg">
                    {effectiveACForRow(combatant, activeEffects)}
                  </span>
                </div>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div
                    className={[
                      "min-w-0 flex-1 truncate font-semibold",
                      combatant.side === "enemy"
                        ? "text-destructive"
                        : combatant.side === "friendly"
                          ? "text-companion-shared"
                          : "",
                    ].join(" ")}
                  >
                    {combatant.displayName}
                  </div>
                  <div className="flex min-w-0 justify-end gap-1">
                    {active && <StateBadge tone="acting">Acting</StateBadge>}
                    {selected && <StateBadge tone="target">Target</StateBadge>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {down && (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <Skull className="h-3.5 w-3.5" /> Down
                  </span>
                )}
              </div>
            </div>
          </button>
          <Button className="px-1.5" type="button" size="sm" variant="ghost" onClick={onEdit}>
            ...
          </Button>
        </div>
        {showDeathSaves ? (
          <div className="mt-2">
            <DeathSaveTrack
              successes={combatant.deathSaveSuccesses}
              failures={combatant.deathSaveFailures}
              onUndoSuccess={onDeathSave ? () => onDeathSave(combatant, "undo-success") : undefined}
              onUndoFailure={onDeathSave ? () => onDeathSave(combatant, "undo-failure") : undefined}
            />
          </div>
        ) : (
          <div
            key={`${combatant.id}-${combatant.currentHitPoints}-${combatant.temporaryHitPoints}`}
            className={[
              "mt-2 h-2 overflow-hidden rounded-full bg-muted",
              combatant.currentHitPoints <= 0 ? "hp-drop-zero" : "hp-bar-pulse",
            ].join(" ")}
          >
            <div
              className="hp-bar-fill h-full"
              style={{ width: `${pct}%`, backgroundColor: hpBarColor(pct) }}
            />
          </div>
        )}
        <div className="mt-1 flex min-w-0 flex-wrap gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HeartPulse className="h-3.5 w-3.5" /> {combatant.currentHitPoints}/
            {effectiveMaxHP(combatant)} HP
          </span>
          {combatant.conditions.map((condition) => (
            <Badge key={condition} tone="warning">
              {condition}
            </Badge>
          ))}
          {activeEffects.map((effect) => (
            <Badge key={effect.id} tone="info">
              {friendlyEffectLabel(effect)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function effectiveACForRow(combatant: EncounterRunCombatant, effects: EncounterRunEffect[]) {
  const base = effectiveAC(combatant);
  return effects.reduce((total, effect) => {
    if (effect.effectKind === "ac_bonus") return total + (Number(effect.amount) || 0);
    if (effect.effectKind === "base_ac") return Math.max(total, Number(effect.amount) || total);
    return total;
  }, base);
}

function StateBadge({ tone, children }: { tone: "acting" | "target"; children: React.ReactNode }) {
  return (
    <span
      className={[
        "rounded-md px-1.5 py-0.5 text-[0.62rem] font-black uppercase",
        tone === "acting" ? "bg-primary/15 text-primary" : "bg-primary/20 text-primary",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function combatantColorStyle(colorLabel: string): React.CSSProperties | undefined {
  const color = colorLabel.trim();
  if (!color || color === defaultCombatantColor || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return undefined;
  }
  return {
    borderColor: color,
    boxShadow: `inset 0 0 0 1px ${color}55`,
  };
}
