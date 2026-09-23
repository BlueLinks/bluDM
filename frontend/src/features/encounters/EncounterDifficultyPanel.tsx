import { Shield, Skull } from "lucide-react";
import { difficultyTone } from "../../components/shared/categoryText";
import type { EncounterDifficulty } from "../../lib/domain/combat";
import { encounterRuleset2024 } from "../../lib/domain/encounterRulesets";

export function EncounterDifficultyPanel({
  compact = false,
  dense = false,
  difficulty,
}: {
  compact?: boolean;
  dense?: boolean;
  difficulty: EncounterDifficulty;
}) {
  const tone = difficultyTone(difficulty.label);
  const reference = difficultyReference(difficulty);
  const usesBudget = difficulty.ruleset === encounterRuleset2024;
  const Icon = dense ? Shield : Skull;
  return (
    <section
      className={["rounded-md border border-border bg-card", dense ? "min-h-[4.5625rem]" : ""].join(
        " ",
      )}
    >
      <div
        className={[
          "grid min-w-0 gap-0",
          compact
            ? "sm:grid-cols-2"
            : dense
              ? "md:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))]"
              : usesBudget
                ? "md:grid-cols-[1.15fr_repeat(4,minmax(0,0.8fr))]"
                : "md:grid-cols-[1.15fr_repeat(5,minmax(0,0.8fr))]",
        ].join(" ")}
      >
        <div
          className={[
            "flex min-w-0 items-center gap-3",
            dense ? "p-3.5" : compact ? "p-3" : "p-4",
            compact ? "sm:col-span-2" : "",
            tone.surface,
          ].join(" ")}
        >
          <span
            className={[
              "grid shrink-0 place-items-center rounded-md border",
              compact || dense ? "h-9 w-9" : "h-10 w-10",
              tone.icon,
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Difficulty</h2>
            <div
              className={[dense ? "text-base" : "text-lg", "font-semibold", tone.text].join(" ")}
            >
              {difficulty.label}
            </div>
            {!dense ? (
              <div className="text-xs text-muted-foreground">
                {usesBudget ? "Budget" : "Threshold"}: {reference.value.toLocaleString()} XP
              </div>
            ) : null}
          </div>
        </div>
        {dense ? (
          <DifficultyMetric
            dense
            label={usesBudget ? "XP Budget" : "Threshold"}
            value={`${reference.value.toLocaleString()} XP`}
          />
        ) : null}
        {usesBudget ? (
          <>
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="XP Spent"
              value={difficulty.xpSpent.toLocaleString()}
            />
            {!dense ? (
              <DifficultyMetric
                compact={compact}
                label="XP Budget"
                value={difficulty.xpBudget.toLocaleString()}
              />
            ) : null}
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="Remaining"
              value={Math.max(0, difficulty.xpBudget - difficulty.xpSpent).toLocaleString()}
            />
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="Band"
              value={reference.label}
            />
          </>
        ) : (
          <>
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="Enemy XP"
              value={difficulty.enemyXP.toLocaleString()}
            />
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="Adjusted XP"
              value={difficulty.adjustedXP.toLocaleString()}
            />
            <DifficultyMetric
              compact={compact}
              dense={dense}
              label="Multiplier"
              value={`${difficulty.multiplier}x`}
            />
            {!dense ? (
              <>
                <DifficultyMetric
                  compact={compact}
                  label="Threshold"
                  value={`${reference.value.toLocaleString()} XP`}
                />
                <DifficultyMetric compact={compact} label="Crossed" value={reference.label} />
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function DifficultyMetric({
  compact = false,
  dense = false,
  label,
  value,
}: {
  compact?: boolean;
  dense?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={[
        "grid content-center border-t border-border",
        compact
          ? "p-[0.6875rem] sm:border-l sm:border-t-0"
          : dense
            ? "p-3 md:border-l md:border-t-0"
            : "p-4 md:border-l md:border-t-0",
      ].join(" ")}
    >
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={["mt-1 font-semibold", compact || dense ? "text-base" : "text-xl"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function difficultyReference(difficulty: EncounterDifficulty) {
  if (difficulty.ruleset === encounterRuleset2024) {
    return { label: difficulty.label, value: difficulty.xpBudget };
  }
  if (difficulty.label === "Over Deadly") {
    return { label: "Over Deadly", value: Math.round(difficulty.thresholds.deadly * 1.5) };
  }
  if (difficulty.label === "Deadly") {
    return { label: "Deadly", value: difficulty.thresholds.deadly };
  }
  if (difficulty.label === "Hard") {
    return { label: "Hard", value: difficulty.thresholds.hard };
  }
  if (difficulty.label === "Medium") {
    return { label: "Medium", value: difficulty.thresholds.medium };
  }
  if (difficulty.label === "Easy") {
    return { label: "Easy", value: difficulty.thresholds.easy };
  }
  return { label: "None", value: 0 };
}
