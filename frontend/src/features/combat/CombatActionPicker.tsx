import { ChevronDown, Search, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  onAction,
  onSpell,
}: {
  actions: CreatureAction[];
  actionDisabledReason?: string;
  spells: CreatureSpell[];
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onSpell: (spell: CreatureSpell) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [recent, setRecent] = useState<string[]>([]);
  const items = useMemo(() => pickerItems(actions, spells), [actions, spells]);
  const matchingItems = items.filter((item) => matchesQuery(item, query));
  const availableItems = matchingItems.filter(
    (item) => showUnavailable || item.kind === "spell" || !actionDisabledReason,
  );
  const allGroups = pickerGroups(availableItems, favorites, recent);
  const groups =
    category === "All" ? allGroups : allGroups.filter((group) => group.label === category);

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
    <details ref={detailsRef} className="group relative col-span-2">
      <summary className="inline-flex min-h-10 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/20">
        Choose attack or spell
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-80 gap-2 rounded-lg border border-border bg-card p-3 shadow-xl sm:w-96">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search actions and spells"
            className="pl-8"
            placeholder="Search actions and spells"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Checkbox
          checked={showUnavailable}
          label="Show unavailable actions"
          onChange={setShowUnavailable}
        />
        <div className="flex gap-1 overflow-x-auto" aria-label="Action categories">
          {["All", ...allGroups.map((group) => group.label)].map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={category === label}
              className={[
                "shrink-0 rounded px-2 py-1 text-xs font-semibold",
                category === label
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              ].join(" ")}
              onClick={() => setCategory(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="max-h-80 overflow-y-auto border-t border-border"
          onKeyDown={handlePickerKeys}
        >
          {groups.map((group) => (
            <PickerGroup
              key={group.label}
              favorites={favorites}
              group={group}
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
  onChoose,
  onFavorite,
}: {
  actionDisabledReason?: string;
  favorites: string[];
  group: { label: string; items: PickerItem[] };
  onChoose: (item: PickerItem, event?: React.MouseEvent) => void;
  onFavorite: (key: string) => void;
}) {
  return (
    <section className="py-2" aria-label={group.label}>
      <h3 className="px-1 text-xs font-bold uppercase text-muted-foreground">{group.label}</h3>
      {group.items.map((item) => {
        const disabled = item.kind === "action" && Boolean(actionDisabledReason);
        return (
          <div
            key={`${group.label}-${item.key}`}
            className="flex min-w-0 items-center border-b border-border py-1 last:border-b-0"
          >
            <button
              type="button"
              className="min-w-0 flex-1 px-1.5 py-1 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
              <Star className={favorites.includes(item.key) ? "h-4 w-4 fill-current" : "h-4 w-4"} />
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
  const actionType = item.action.actionType.toLowerCase();
  if (actionType.includes("legendary")) return "Legendary Actions";
  if (actionType.includes("lair")) return "Lair Actions";
  if (actionType.includes("reaction")) return "Reactions";
  if (actionType.includes("feature") || actionType.includes("trait")) return "Features";
  if (actionType.includes("item")) return "Items";
  if (actionType.includes("attack")) return "Attacks";
  if (actionType.includes("other") || actionType.includes("special")) return "Other";
  return "Creature actions";
}

function itemName(item: PickerItem) {
  return item.kind === "action" ? item.action.name : item.spell.spellName;
}

function itemHint(item: PickerItem) {
  if (item.kind === "action") {
    return (
      [item.action.actionType, actionSummary(item.action)].filter(Boolean).join(" · ") || "Action"
    );
  }
  const level = item.spell.spellLevel === 0 ? "Cantrip" : `Level ${item.spell.spellLevel}`;
  return `${level}${item.spell.prepared ? " · Prepared" : ""}${item.spell.innate ? " · Innate" : ""}`;
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
