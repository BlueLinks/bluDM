type EncounterDifficultyLike = {
  label: string;
};

export function DifficultyPill({ difficulty }: { difficulty: EncounterDifficultyLike }) {
  const tones: Record<string, string> = {
    Trivial: "border-slate-300 bg-slate-500/10 text-slate-700 dark:text-slate-200",
    Easy: "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    Medium: "border-sky-300 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    Hard: "border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-200",
    Deadly: "border-red-300 bg-red-500/10 text-red-700 dark:text-red-200",
    "Over Deadly": "border-fuchsia-300 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200"
  };
  return (
    <div className={["rounded-md border px-2 py-2 text-center", tones[difficulty.label] ?? tones.Trivial].join(" ")}>
      <div className="text-xs opacity-80">Difficulty</div>
      <div className="font-semibold">{difficulty.label}</div>
    </div>
  );
}
