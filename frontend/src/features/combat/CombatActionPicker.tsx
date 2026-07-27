import { BowArrow, ChevronDown, Search, Star, Sword, WandSparkles, Zap } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ActionIcon } from "../../components/shared/ActionIcon";
import { Button, Checkbox, Input } from "../../components/ui";
import { actionSummary } from "../../lib/domain/combat";
import type { CreatureAction, CreatureSpell } from "../../types";

type PickerItem =
  | { key: string; kind: "action"; action: CreatureAction }
  | { key: string; kind: "spell"; spell: CreatureSpell };

const favoritesKey = "bludm.combat-action-favorites";

export function CombatActionPicker({
  actions,
  actionDisabledReason,
  spells,
  triggerLabel = "Choose attack or spell",
  onAction,
  onSpell,
}: {
  actions: CreatureAction[];
  actionDisabledReason?: string;
  spells: CreatureSpell[];
  triggerLabel?: string;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onSpell: (spell: CreatureSpell) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Attacks");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [recent, setRecent] = useState<string[]>([]);
  const items = useMemo(() => pickerItems(actions, spells), [actions, spells]);
  const matchingItems = items.filter((item) => matchesQuery(item, query));
  const availableItems = matchingItems.filter(
    (item) => showUnavailable || item.kind === "spell" || !actionDisabledReason,
  );
  const allGroups = pickerGroups(availableItems, favorites, recent);
  const groups = allGroups.filter((group) => group.label === category);
  const selectedKey = items.find((item) => itemName(item) === triggerLabel)?.key;

  function choose(item: PickerItem, event?: React.MouseEvent) {
    setRecent((current) => [item.key, ...current.filter((key) => key !== item.key)].slice(0, 4));
    if (item.kind === "action") onAction(item.action, event);
    else onSpell(item.spell);
    detailsRef.current?.removeAttribute("open");
  }

  function toggleFavorite(key: string) {
    setFavorites((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      writeFavorites(next);
      return next;
    });
  }

  return (
    <details ref={detailsRef} className="group relative min-w-0">
      <summary className="inline-flex min-h-9 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface group-open:border-primary">
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-[5.4375rem] z-30 grid w-80 gap-0 rounded-lg border border-border bg-card p-1 shadow-xl sm:-left-[6.75rem] sm:w-[23.125rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search actions and spells"
            className="!h-[2.125rem] !min-h-[2.125rem] !py-1 pl-8"
            placeholder="Search actions and spells"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 border-b border-border" aria-label="Action categories">
          {["Favorites", "Attacks", "Spells"].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={category === label}
              className={[
                "-mb-px border-b-2 px-2 py-2 text-xs font-semibold transition",
                category === label
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground",
              ].join(" ")}
              onClick={() => setCategory(label)}
            >
              {label}
            </button>
          ))}
        </div>
        {actionDisabledReason ? (
          <Checkbox
            checked={showUnavailable}
            label="Show unavailable actions"
            onChange={setShowUnavailable}
          />
        ) : null}
        <div className="max-h-80 overflow-y-auto p-1" onKeyDown={handlePickerKeys}>
          {groups.map((group) => (
            <PickerGroup
              key={group.label}
              favorites={favorites}
              group={group}
              selectedKey={selectedKey}
              actionDisabledReason={actionDisabledReason}
              onChoose={choose}
              onFavorite={toggleFavorite}
            />
          ))}
          {groups.length === 0 && (
            <div className="py-4 text-sm text-muted-foreground">
              {query ? "No matching actions or spells." : "No actions are currently available."}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function PickerGroup({
  actionDisabledReason,
  favorites,
  group,
  selectedKey,
  onChoose,
  onFavorite,
}: {
  actionDisabledReason?: string;
  favorites: string[];
  group: { label: string; items: PickerItem[] };
  selectedKey?: string;
  onChoose: (item: PickerItem, event?: React.MouseEvent) => void;
  onFavorite: (key: string) => void;
}) {
  return (
    <section className="grid gap-1" aria-label={group.label}>
      {group.items.map((item) => {
        const disabled = item.kind === "action" && Boolean(actionDisabledReason);
        const isFeature =
          item.kind === "action" && item.action.actionType.toLowerCase().includes("feature");
        return (
          <div
            key={`${group.label}-${item.key}`}
            className={[
              "flex min-h-[3.375rem] min-w-0 items-center rounded-md border px-1.5",
              item.key === selectedKey
                ? "border-primary bg-primary/25"
                : "border-border bg-background",
            ].join(" ")}
          >
            {item.kind === "spell" ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center text-foreground">
                <WandSparkles className="h-6 w-6" />
              </span>
            ) : isFeature ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center text-foreground">
                <Zap className="h-6 w-6" />
              </span>
            ) : (
              <PickerActionIcon action={item.action} />
            )}
            <button
              type="button"
              className="min-w-0 flex-1 rounded px-2 py-1 text-left hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              data-picker-choice
              disabled={disabled}
              title={disabled ? actionDisabledReason : itemHint(item)}
              onClick={(event) => onChoose(item, event)}
            >
              <span className="block truncate text-sm font-semibold">{itemName(item)}</span>
              <span className="block truncate text-xs text-muted-foreground">{itemHint(item)}</span>
            </button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`${favorites.includes(item.key) ? "Remove" : "Add"} ${itemName(item)} ${favorites.includes(item.key) ? "from" : "to"} favorites`}
              onClick={() => onFavorite(item.key)}
            >
              <Star className="h-5 w-5" />
            </Button>
          </div>
        );
      })}
    </section>
  );
}

function pickerItems(actions: CreatureAction[], spells: CreatureSpell[]): PickerItem[] {
  return [
    ...actions.map((action) => ({ key: `action:${action.id}`, kind: "action" as const, action })),
    ...spells.map((spell) => ({ key: `spell:${spell.id}`, kind: "spell" as const, spell })),
  ];
}

function pickerGroups(items: PickerItem[], favorites: string[], recent: string[]) {
  const groups = [
    { label: "Favorites", items: orderedMatches(items, favorites) },
    { label: "Recent", items: orderedMatches(items, recent) },
    ...[
      "Attacks",
      "Creature actions",
      "Spells",
      "Features",
      "Items",
      "Reactions",
      "Legendary Actions",
      "Lair Actions",
      "Other",
    ].map((label) => ({ label, items: items.filter((item) => itemCategory(item) === label) })),
  ];
  return groups.filter((group) => group.items.length > 0);
}

function orderedMatches(items: PickerItem[], keys: string[]) {
  return keys.flatMap((key) => items.filter((item) => item.key === key));
}

function itemCategory(item: PickerItem) {
  if (item.kind === "spell") return "Spells";
  return "Attacks";
}

function itemName(item: PickerItem) {
  return item.kind === "action" ? item.action.name : item.spell.spellName;
}

function itemHint(item: PickerItem) {
  if (item.kind === "action") {
    if (item.action.actionType.toLowerCase().includes("feature")) {
      return item.action.description.replace(/[.!?]+$/, "") || "Creature action";
    }
    const damage = actionSummary(item.action).replace(/([d\d])([+-])(\d+)/g, "$1 $2 $3");
    const range = item.action.range > 0 ? `${item.action.range}/${item.action.range * 4} ft` : "";
    return [
      `${item.action.attackModifier >= 0 ? "+" : ""}${item.action.attackModifier} to hit`,
      damage,
      range,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const level = item.spell.spellLevel === 0 ? "Cantrip" : `Level ${item.spell.spellLevel}`;
  return `${level}${item.spell.prepared ? " · Prepared" : ""}${item.spell.innate ? " · Innate" : ""}`;
}

function PickerActionIcon({ action }: { action: CreatureAction }) {
  const name = action.name.toLowerCase();
  const Icon = name.includes("bow") ? BowArrow : name.includes("sword") ? Sword : null;
  if (!Icon && action.iconSource && action.iconSource !== "none") {
    return <ActionIcon action={action} className="h-8 w-8 rounded-md [&_img]:h-5 [&_img]:w-5" />;
  }
  const FallbackIcon = Icon ?? Sword;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center text-foreground">
      <FallbackIcon className="h-6 w-6" />
    </span>
  );
}

function handlePickerKeys(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const choices = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-picker-choice]:not(:disabled)"),
  );
  if (choices.length === 0) return;
  event.preventDefault();
  const current = choices.indexOf(document.activeElement as HTMLButtonElement);
  const step = event.key === "ArrowDown" ? 1 : -1;
  choices[(current + step + choices.length) % choices.length]?.focus();
}

function matchesQuery(item: PickerItem, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || `${itemName(item)} ${itemHint(item)}`.toLowerCase().includes(needle);
}

function readFavorites() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(favoritesKey) || "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavorites(values: string[]) {
  try {
    window.localStorage.setItem(favoritesKey, JSON.stringify(values));
  } catch {
    // Favorites remain available for this session when storage is unavailable.
  }
}
