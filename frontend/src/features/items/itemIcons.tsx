import {
  Anvil,
  Backpack,
  CircleHelp,
  Coins,
  Gem,
  Hammer,
  KeyRound,
  Package,
  Route,
  Sailboat,
  Scroll,
  Tag,
  WandSparkles,
} from "lucide-react";
import type { ElementType } from "react";
import type { Item } from "../../types";

export type ItemIconEntry = {
  key: string;
  label: string;
  source: "game-icons.net" | "lucide";
  icon?: ElementType;
  path?: string;
  author?: string;
  sourceUrl?: string;
  license?: string;
  preferredCategory?: string;
};

export const itemIconRegistry = {
  ammunition: {
    key: "ammunition",
    label: "Ammunition",
    source: "game-icons.net",
    path: "/game-icons/bow-arrow.svg",
    author: "Delapouite",
    sourceUrl: "https://game-icons.net/1x1/delapouite/bow-arrow.html",
    license: "CC BY 3.0",
    preferredCategory: "Ammunition",
  },
  armor: {
    key: "armor",
    label: "Armor",
    source: "game-icons.net",
    path: "/game-icons/shield.svg",
    author: "Lorc",
    sourceUrl: "https://game-icons.net/1x1/lorc/shield.html",
    license: "CC BY 3.0",
    preferredCategory: "Armor",
  },
  coins: {
    key: "coins",
    label: "Value",
    source: "lucide",
    icon: Coins,
  },
  consumable: {
    key: "consumable",
    label: "Consumable",
    source: "game-icons.net",
    path: "/game-icons/healing.svg",
    author: "Lorc",
    sourceUrl: "https://game-icons.net/1x1/lorc/healing.html",
    license: "CC BY 3.0",
    preferredCategory: "Consumable",
  },
  focus: {
    key: "focus",
    label: "Spellcasting focus",
    source: "lucide",
    icon: WandSparkles,
    preferredCategory: "Focus",
  },
  gear: {
    key: "gear",
    label: "Adventuring gear",
    source: "lucide",
    icon: Package,
    preferredCategory: "Adventuring Gear",
  },
  gem: {
    key: "gem",
    label: "Treasure",
    source: "lucide",
    icon: Gem,
  },
  key: {
    key: "key",
    label: "Key item",
    source: "lucide",
    icon: KeyRound,
  },
  mount: {
    key: "mount",
    label: "Mount",
    source: "lucide",
    icon: Route,
    preferredCategory: "Mounts and Vehicles",
  },
  pack: {
    key: "pack",
    label: "Equipment pack",
    source: "lucide",
    icon: Backpack,
    preferredCategory: "Equipment Pack",
  },
  poison: {
    key: "poison",
    label: "Poison",
    source: "game-icons.net",
    path: "/game-icons/poison-bottle.svg",
    author: "Lorc",
    sourceUrl: "https://game-icons.net/1x1/lorc/poison-bottle.html",
    license: "CC BY 3.0",
  },
  scroll: {
    key: "scroll",
    label: "Scroll",
    source: "lucide",
    icon: Scroll,
  },
  tool: {
    key: "tool",
    label: "Tool",
    source: "lucide",
    icon: Hammer,
    preferredCategory: "Tools",
  },
  vehicle: {
    key: "vehicle",
    label: "Vehicle",
    source: "lucide",
    icon: Sailboat,
    preferredCategory: "Vehicle",
  },
  weapon: {
    key: "weapon",
    label: "Weapon",
    source: "game-icons.net",
    path: "/game-icons/sword.svg",
    author: "Lorc",
    sourceUrl: "https://game-icons.net/1x1/lorc/sword.html",
    license: "CC BY 3.0",
    preferredCategory: "Weapon",
  },
  workstation: {
    key: "workstation",
    label: "Crafting",
    source: "lucide",
    icon: Anvil,
  },
  unknown: {
    key: "unknown",
    label: "Equipment",
    source: "lucide",
    icon: Tag,
  },
} satisfies Record<string, ItemIconEntry>;

export function iconForItem(item: Item): ItemIconEntry {
  const text = [item.category, item.itemType, item.name].join(" ").toLowerCase();
  if (text.includes("weapon")) return itemIconRegistry.weapon;
  if (text.includes("armor") || text.includes("shield")) return itemIconRegistry.armor;
  if (text.includes("tool") || text.includes("artisan")) return itemIconRegistry.tool;
  if (text.includes("arcane") || text.includes("druidic") || text.includes("holy symbol")) {
    return itemIconRegistry.focus;
  }
  if (text.includes("pack")) return itemIconRegistry.pack;
  if (text.includes("ammunition") || text.includes("arrow") || text.includes("bolt")) {
    return itemIconRegistry.ammunition;
  }
  if (text.includes("potion") || text.includes("consumable")) return itemIconRegistry.consumable;
  if (text.includes("poison")) return itemIconRegistry.poison;
  if (text.includes("mount")) return itemIconRegistry.mount;
  if (text.includes("vehicle") || text.includes("ship") || text.includes("boat")) {
    return itemIconRegistry.vehicle;
  }
  if (text.includes("scroll")) return itemIconRegistry.scroll;
  if (text.includes("gem")) return itemIconRegistry.gem;
  if (text.includes("key")) return itemIconRegistry.key;
  if (item.category || item.itemType) return itemIconRegistry.gear;
  return itemIconRegistry.unknown;
}

export function ItemGlyph({ entry, className = "" }: { entry: ItemIconEntry; className?: string }) {
  const Icon = entry.icon ?? CircleHelp;
  return (
    <span
      aria-hidden="true"
      className={[
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-background",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={entry.label}
    >
      {entry.path ? (
        <img alt="" className="h-5 w-5 opacity-80" src={entry.path} />
      ) : (
        <Icon className="h-5 w-5 text-accent" />
      )}
    </span>
  );
}
