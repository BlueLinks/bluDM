type EncounterDifficultyLike = {
  label: string;
};

export function DifficultyPill({ difficulty }: { difficulty: EncounterDifficultyLike }) {
  return (
    <div
      className={[
        "rounded-md border px-2 py-2 text-center",
        difficultyTone(difficulty.label).border,
      ].join(" ")}
    >
      <div className="text-xs opacity-80">Difficulty</div>
      <div className="font-semibold">{difficulty.label}</div>
    </div>
  );
}
import { difficultyTone } from "../../components/shared/categoryText";
