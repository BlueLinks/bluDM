export type EncounterArchetypeIconKey =
  | "large-monster"
  | "humanoids"
  | "monsters"
  | "undead"
  | "beasts"
  | "spellcasters"
  | "melee"
  | "stealth"
  | "mixed"
  | "custom-mix";

type EncounterArchetypeIconEntry = {
  author: string;
  key: EncounterArchetypeIconKey;
  label: string;
  license: "CC BY 3.0";
  path: string;
  sourceUrl: string;
};

export const encounterArchetypeIcons: Record<
  EncounterArchetypeIconKey,
  EncounterArchetypeIconEntry
> = {
  "large-monster": icon("large-monster", "Ogre", "Delapouite", "ogre"),
  humanoids: icon("humanoids", "Guards", "Delapouite", "guards"),
  monsters: icon("monsters", "Goblin Head", "Delapouite", "goblin-head"),
  undead: icon("undead", "Skeleton Inside", "Lorc", "skeleton-inside"),
  beasts: icon("beasts", "Wolf Head", "Lorc", "wolf-head"),
  spellcasters: icon("spellcasters", "Wizard Staff", "Lorc", "wizard-staff"),
  melee: icon("melee", "Crossed Swords", "Lorc", "crossed-swords"),
  stealth: icon("stealth", "Assassin Pocket", "Lorc", "assassin-pocket"),
  mixed: icon("mixed", "Interleaved Arrows", "Lorc", "interleaved-arrows"),
  "custom-mix": icon("custom-mix", "Twenty-sided die", "Delapouite", "dice-twenty-faces-twenty"),
};

export function EncounterArchetypeIcon({ iconKey }: { iconKey: EncounterArchetypeIconKey }) {
  const entry = encounterArchetypeIcons[iconKey];
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground">
      <span
        aria-hidden="true"
        className="h-5 w-5 bg-current"
        data-testid={`archetype-icon-${iconKey}`}
        style={{
          WebkitMask: `url(${entry.path}) center / contain no-repeat`,
          mask: `url(${entry.path}) center / contain no-repeat`,
        }}
      />
    </span>
  );
}

function icon(
  key: EncounterArchetypeIconKey,
  label: string,
  author: string,
  sourceSlug: string,
): EncounterArchetypeIconEntry {
  return {
    author,
    key,
    label,
    license: "CC BY 3.0",
    path: `/game-icons/encounter-archetypes/${key}.svg`,
    sourceUrl: `https://game-icons.net/1x1/${author.toLowerCase()}/${sourceSlug}.html`,
  };
}
