export type ShopTemplateKey =
  | ""
  | "general-store"
  | "armoury"
  | "potion-store"
  | "tavern"
  | "magic-shop"
  | "black-market";

export type ShopTemplatePreset = {
  key: Exclude<ShopTemplateKey, "">;
  label: string;
  summary: string;
  publicNotes: string;
  dmNotes: string;
  tags: string[];
  mapMarker: string;
};

export type ShopTemplateDraftFields = {
  dmNotes: string;
  mapMarker: string;
  publicNotes: string;
  summary: string;
  tags: string;
};

export const shopTemplateOptions = [
  { label: "No template", value: "" },
  { label: "General store", value: "general-store" },
  { label: "Armoury", value: "armoury" },
  { label: "Potion store", value: "potion-store" },
  { label: "Tavern", value: "tavern" },
  { label: "Magic shop", value: "magic-shop" },
  { label: "Black market", value: "black-market" },
];

const shopTemplates: ShopTemplatePreset[] = [
  {
    key: "general-store",
    label: "General store",
    summary: "A practical shop for everyday adventuring supplies and local goods.",
    publicNotes: "Shelves carry rope, rations, lantern oil, tools, and a few regional curios.",
    dmNotes: "Good default for common gear, rumors, package deliveries, and mundane quest hooks.",
    tags: ["shop", "general goods", "supplies"],
    mapMarker: "general-store",
  },
  {
    key: "armoury",
    label: "Armoury",
    summary: "A weapon and armor shop with repair benches, racks, and commission work.",
    publicNotes:
      "Blades, shields, armor pieces, and the smell of oil and hammered metal fill the room.",
    dmNotes: "Use for weapon upgrades, repair delays, militia ties, and restricted martial stock.",
    tags: ["shop", "weapons", "armor"],
    mapMarker: "armoury",
  },
  {
    key: "potion-store",
    label: "Potion store",
    summary: "A small alchemical shop stocked with tonics, salves, reagents, and warnings.",
    publicNotes:
      "Glass bottles line the counter, each tagged with careful handwriting and wax seals.",
    dmNotes:
      "Good source for healing, antidotes, rare ingredients, side effects, and hidden remedies.",
    tags: ["shop", "potions", "healing"],
    mapMarker: "potion-store",
  },
  {
    key: "tavern",
    label: "Tavern",
    summary: "A social hub for food, lodging, rumors, job offers, and regular customers.",
    publicNotes:
      "Warm light, crowded tables, and overlapping conversations make this an easy place to linger.",
    dmNotes: "Use for rooms, meals, hirelings, rumors, faction meetings, and notice-board hooks.",
    tags: ["shop", "tavern", "lodging"],
    mapMarker: "tavern",
  },
  {
    key: "magic-shop",
    label: "Magic shop",
    summary:
      "A specialist shop for scrolls, curios, components, and carefully negotiated magic items.",
    publicNotes:
      "Locked cases and odd displays suggest that most inventory is discussed, not browsed.",
    dmNotes:
      "Good place for limited stock, special orders, identification, and consequences for rare items.",
    tags: ["shop", "magic", "limited stock"],
    mapMarker: "magic-shop",
  },
  {
    key: "black-market",
    label: "Black market",
    summary:
      "A hidden or semi-legal dealer for contraband, favors, forged papers, and dangerous goods.",
    publicNotes: "Nothing here is advertised openly; customers are expected to know who sent them.",
    dmNotes:
      "Use hidden stock, code phrases, unreliable prices, heat from authorities, and faction strings.",
    tags: ["shop", "black market", "hidden"],
    mapMarker: "black-market",
  },
];

export function shopTemplateFor(key: string): ShopTemplatePreset | undefined {
  return shopTemplates.find((template) => template.key === key);
}

export function shopTemplateLabel(key: string): string {
  return shopTemplateFor(key)?.label ?? "";
}

export function shopTemplateKeyForLabel(label?: string): ShopTemplateKey {
  return shopTemplates.find((template) => template.label === label)?.key ?? "";
}

export function shopTemplateTags(template?: Pick<ShopTemplatePreset, "tags">): string {
  return template?.tags.join(", ") ?? "";
}

export function applyShopTemplateDefaults(
  current: ShopTemplateDraftFields,
  previousKey: string,
  nextKey: string,
): ShopTemplateDraftFields {
  const previous = shopTemplateFor(previousKey);
  const next = shopTemplateFor(nextKey);
  if (!next) return current;
  return {
    dmNotes: replaceTemplateDefault(current.dmNotes, previous?.dmNotes, next.dmNotes),
    mapMarker: replaceTemplateDefault(current.mapMarker, previous?.mapMarker, next.mapMarker),
    publicNotes: replaceTemplateDefault(
      current.publicNotes,
      previous?.publicNotes,
      next.publicNotes,
    ),
    summary: replaceTemplateDefault(current.summary, previous?.summary, next.summary),
    tags: replaceTemplateDefault(current.tags, shopTemplateTags(previous), shopTemplateTags(next)),
  };
}

function replaceTemplateDefault(
  current: string,
  previousDefault: string | undefined,
  nextDefault: string,
) {
  const trimmedCurrent = current.trim();
  if (!trimmedCurrent) return nextDefault;
  if (previousDefault && trimmedCurrent === previousDefault.trim()) return nextDefault;
  return current;
}
