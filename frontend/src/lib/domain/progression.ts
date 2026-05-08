const levelXpThresholds = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];

export function levelFromExperience(experiencePoints: number) {
  const boundedXP = Math.max(0, experiencePoints);
  let level = 1;
  for (const [index, threshold] of levelXpThresholds.entries()) {
    if (boundedXP >= threshold) level = index + 1;
  }
  return Math.min(20, level);
}

export function effectiveCharacterLevel(levelOverride: string, experiencePoints: string) {
  const override = Number(levelOverride);
  if (Number.isFinite(override) && override > 0) {
    return Math.min(20, Math.max(1, override));
  }
  return levelFromExperience(Number(experiencePoints) || 0);
}
