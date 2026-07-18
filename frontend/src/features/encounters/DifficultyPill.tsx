type EncounterDifficultyLike = {
  label: string;
};

export function DifficultyPill({ difficulty }: { difficulty: EncounterDifficultyLike }) {
  const tones: Record<string, string> = {
    Trivial: "border-companion-metadata/30 bg-companion-metadata/10 text-companion-metadata",
    Easy: "border-success/30 bg-success/10 text-success",
    Medium: "border-info/30 bg-info/10 text-info",
    Hard: "border-warning/30 bg-warning/10 text-warning",
    Deadly: "border-destructive/30 bg-destructive/10 text-destructive",
    "Over Deadly": "border-companion-custom/30 bg-companion-custom/10 text-companion-custom",
  };
  return (
    <div
      className={[
        "rounded-md border px-2 py-2 text-center",
        tones[difficulty.label] ?? tones.Trivial,
      ].join(" ")}
    >
      <div className="text-xs opacity-80">Difficulty</div>
      <div className="font-semibold">{difficulty.label}</div>
    </div>
  );
}
