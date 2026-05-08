import { Swords } from "lucide-react";
import { SectionPanel, StatPill } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import { DifficultyPill } from "./DifficultyPill";

export function EncounterDifficultyPanel({
  difficulty,
}: {
  difficulty: ReturnType<typeof calculateEncounterDifficulty>;
}) {
  return (
    <SectionPanel title="Difficulty" icon={Swords}>
      <div className="grid gap-3 md:grid-cols-4">
        <DifficultyPill difficulty={difficulty} />
        <StatPill label="Enemy XP" value={difficulty.enemyXP} />
        <StatPill label="Adjusted XP" value={difficulty.adjustedXP} />
        <StatPill label="Multiplier" value={`${difficulty.multiplier}x`} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Thresholds for this party: Easy {difficulty.thresholds.easy}, Medium{" "}
        {difficulty.thresholds.medium}, Hard {difficulty.thresholds.hard}, Deadly{" "}
        {difficulty.thresholds.deadly}.
      </p>
    </SectionPanel>
  );
}
