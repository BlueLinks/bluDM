import type { ActionIconSource } from "../../types";

export type CuratedActionIcon = {
  key: string;
  label: string;
  category: string;
  author: string;
  license: string;
  sourceUrl: string;
};

export const curatedActionIcons: CuratedActionIcon[] = [
  icon("battle-axe", "Battle Axe", "Weapons", "Lorc"),
  icon("dagger", "Dagger", "Weapons", "Lorc"),
  icon("sword", "Sword", "Weapons", "Lorc"),
  icon("bow-arrow", "Bow Arrow", "Weapons", "Delapouite"),
  icon("claw", "Claw", "Natural Attacks", "sbed"),
  icon("bite", "Bite", "Natural Attacks", "Lorc"),
  icon("fireball", "Fireball", "Spell Effects", "Lorc"),
  icon("lightning-arc", "Lightning Arc", "Spell Effects", "Lorc"),
  icon("snowflake", "Snowflake", "Spell Effects", "Lorc"),
  icon("poison-bottle", "Poison Bottle", "Damage Types", "Lorc"),
  icon("healing", "Healing", "Healing", "Delapouite"),
  icon("shield", "Shield", "Defensive", "sbed"),
];

export function actionIconPath(iconKey: string) {
  return `/game-icons/${iconKey}.svg`;
}

export function actionIconAttribution(iconKey: string) {
  const iconEntry = curatedActionIcons.find((item) => item.key === iconKey);
  if (!iconEntry) return "";
  return `${iconEntry.label} by ${iconEntry.author}, game-icons.net (${iconEntry.license})`;
}

export function normalizeActionIcon(source: ActionIconSource, key: string) {
  if (source !== "game-icons") return { iconSource: source, iconKey: key };
  const iconEntry = curatedActionIcons.find((item) => item.key === key);
  return iconEntry
    ? { iconSource: source, iconKey: key }
    : { iconSource: "none" as const, iconKey: "" };
}

function icon(
  key: string,
  label: string,
  category: string,
  author: string,
  license = "CC BY 3.0",
): CuratedActionIcon {
  return {
    key,
    label,
    category,
    author,
    license,
    sourceUrl: `https://game-icons.net/1x1/${author.toLowerCase()}/${key}.html`,
  };
}
