import { Check, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ResizableSplitLayout } from "../../components/layout";
import { Button, Field, FloatingInput, Input, Modal, Select } from "../../components/ui";
import type { Creature } from "../../types";
import { LoadedCreatureProfile } from "../creatures/CreatureProfile";
import { CreatureAvatar } from "./editorComponents";

type AddMode = "ally" | "enemy";
type AllyTab = "npcs" | "creatures" | "summons" | "custom";

export function EncounterAddCombatantDialog({
  campaignCreatureIds,
  creatures,
  mode,
  npcs,
  open,
  onAddCreature,
  onOpenChange,
}: {
  campaignCreatureIds: Set<string>;
  creatures: Creature[];
  mode: AddMode;
  npcs: Creature[];
  open: boolean;
  onAddCreature: (
    creature: Creature,
    side: "friendly" | "enemy",
    quantity: number,
    rolledHp: boolean,
  ) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<AllyTab>("npcs");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [crFilter, setCrFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [editionFilter, setEditionFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [limit, setLimit] = useState(60);
  const side = mode === "enemy" ? "enemy" : "friendly";
  const pool = mode === "ally" && tab === "npcs" ? npcs : creatures;
  const filtered = useMemo(
    () =>
      pool.filter((creature) => {
        const haystack = `${creature.name} ${creature.creatureType} ${creature.challengeRating}`
          .trim()
          .toLowerCase();
        if (query.trim() && !haystack.includes(query.trim().toLowerCase())) return false;
        if (typeFilter !== "all" && creature.creatureType !== typeFilter) return false;
        if (crFilter !== "all" && creature.challengeRating !== crFilter) return false;
        if (sourceFilter !== "all" && creature.librarySource !== sourceFilter) return false;
        if (
          editionFilter !== "all" &&
          creature.librarySource === "standard" &&
          creature.sourceKey !== editionFilter
        )
          return false;
        return true;
      }),
    [crFilter, editionFilter, pool, query, sourceFilter, typeFilter],
  );
  const selected = filtered.find((creature) => creature.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    if (mode === "ally") setTab("npcs");
  }, [mode, open]);

  useEffect(() => setLimit(60), [query, typeFilter, crFilter, sourceFilter, editionFilter, tab]);

  function addSelected() {
    if (!selected) return;
    onAddCreature(selected, side, quantity, false);
    onOpenChange(false);
  }

  return (
    <Modal
      className="max-w-6xl"
      open={open}
      title={mode === "enemy" ? "Add enemy" : "Add ally"}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4">
        {mode === "ally" ? <AllyTabs active={tab} onChange={setTab} /> : null}
        {mode === "ally" && (tab === "summons" || tab === "custom") ? (
          <UnsupportedAllyTab tab={tab} />
        ) : (
          <ResizableSplitLayout
            className="min-w-0 gap-4"
            defaultPrimary={55}
            primaryMinWidth="24rem"
            secondaryMinWidth="23rem"
            primary={
              <section className="grid min-w-0 content-start gap-3" aria-label="Creature choices">
                <FloatingInput
                  icon={Search}
                  label={mode === "enemy" ? "Search monsters" : "Search NPCs or creatures"}
                  value={query}
                  onChange={setQuery}
                />
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Type">
                    <Select
                      value={typeFilter}
                      placeholder="Type"
                      options={typeOptions(pool)}
                      onValueChange={setTypeFilter}
                    />
                  </Field>
                  <Field label="CR">
                    <Select
                      value={crFilter}
                      placeholder="CR"
                      options={crOptions(pool)}
                      onValueChange={setCrFilter}
                    />
                  </Field>
                  <Field label="Source">
                    <Select
                      value={sourceFilter}
                      placeholder="Source"
                      options={sourceOptions}
                      onValueChange={setSourceFilter}
                    />
                  </Field>
                  {pool.some((creature) => creature.librarySource === "standard") ? (
                    <Field label="SRD edition">
                      <Select
                        value={editionFilter}
                        placeholder="Edition"
                        options={editionOptions(pool)}
                        onValueChange={setEditionFilter}
                      />
                    </Field>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "creature" : "creatures"} found
                </p>
                <div className="grid max-h-[30rem] content-start gap-2 overflow-y-auto pr-1">
                  {filtered.slice(0, limit).map((creature) => (
                    <CreatureChoice
                      campaignLinked={campaignCreatureIds.has(creature.id)}
                      creature={creature}
                      key={creature.id}
                      selected={selected?.id === creature.id}
                      onSelect={() => setSelectedId(creature.id)}
                    />
                  ))}
                  {filtered.length === 0 ? (
                    <p className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                      No matching creatures.
                    </p>
                  ) : null}
                  {filtered.length > limit ? (
                    <Button type="button" variant="outline" onClick={() => setLimit(limit + 60)}>
                      Load more ({filtered.length - limit} remaining)
                    </Button>
                  ) : null}
                </div>
              </section>
            }
            secondary={
              <aside className="min-w-0 max-h-[34rem] overflow-y-auto rounded-md border border-border bg-card p-3">
                {selected ? (
                  <CreaturePreview
                    creature={selected}
                    mode={mode}
                    quantity={quantity}
                    onAdd={addSelected}
                    onQuantityChange={setQuantity}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Choose a creature to preview.</p>
                )}
              </aside>
            }
          />
        )}
      </div>
    </Modal>
  );
}

function AllyTabs({ active, onChange }: { active: AllyTab; onChange: (tab: AllyTab) => void }) {
  const tabs: Array<{ key: AllyTab; label: string }> = [
    { key: "npcs", label: "NPCs" },
    { key: "creatures", label: "Creatures" },
    { key: "summons", label: "Summons" },
    { key: "custom", label: "Custom" },
  ];
  return (
    <div className="flex flex-wrap gap-2 border-b border-border">
      {tabs.map((tab) => (
        <button
          className={[
            "border-b-2 px-3 py-2 text-sm font-medium",
            active === tab.key
              ? "border-primary text-foreground"
              : "border-transparent text-surface-foreground hover:text-foreground",
          ].join(" ")}
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function UnsupportedAllyTab({ tab }: { tab: AllyTab }) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="font-semibold">{tab === "summons" ? "Summons" : "Custom allies"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This workflow is ready for the tab shape, but saving brand-new temporary allies still needs
        backend support. Use the creature catalogue for this pass.
      </p>
    </div>
  );
}

function CreatureChoice({
  campaignLinked,
  creature,
  selected,
  onSelect,
}: {
  campaignLinked: boolean;
  creature: Creature;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={[
        "grid min-w-0 gap-3 rounded-md border p-2 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
      ].join(" ")}
      type="button"
      onClick={onSelect}
    >
      <CreatureAvatar creature={creature} />
      <div className="min-w-0">
        <div className="truncate font-semibold">{creature.name}</div>
        <div className="text-xs text-muted-foreground">
          {creature.size} {creature.creatureType} · CR {creature.challengeRating || "0"}
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>AC {creature.armorClass}</span>
          <span>HP {creature.hitPoints}</span>
          {campaignLinked ? <span>Campaign NPC</span> : null}
          {creature.librarySource === "standard" ? (
            <span>{creature.sourceLabel || creature.sourceKey || "SRD"}</span>
          ) : null}
        </div>
      </div>
      {selected ? <Check className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}

function CreaturePreview({
  creature,
  mode,
  quantity,
  onAdd,
  onQuantityChange,
}: {
  creature: Creature;
  mode: AddMode;
  quantity: number;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <Field label="Quantity">
          <div className="inline-flex overflow-hidden rounded-md border border-border bg-card">
            <button
              className="grid h-10 w-9 place-items-center border-r border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              type="button"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            >
              -
            </button>
            <Input
              className="h-10 min-h-0 w-14 rounded-none border-0 text-center font-semibold focus:ring-0"
              min={1}
              type="number"
              value={quantity}
              onChange={(event) => onQuantityChange(Math.max(1, Number(event.target.value) || 1))}
            />
            <button
              className="grid h-10 w-9 place-items-center border-l border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              type="button"
              onClick={() => onQuantityChange(quantity + 1)}
            >
              +
            </button>
          </div>
        </Field>
        <Button type="button" icon={Plus} onClick={onAdd}>
          {mode === "enemy" ? "Add enemy" : "Add ally"}
        </Button>
      </div>
      <LoadedCreatureProfile creature={creature} />
    </div>
  );
}

function typeOptions(creatures: Creature[]) {
  return [
    { label: "All", value: "all" },
    ...Array.from(new Set(creatures.map((creature) => creature.creatureType).filter(Boolean)))
      .sort()
      .map((type) => ({ label: type, value: type })),
  ];
}

function crOptions(creatures: Creature[]) {
  return [
    { label: "All", value: "all" },
    ...Array.from(new Set(creatures.map((creature) => creature.challengeRating).filter(Boolean)))
      .sort()
      .map((cr) => ({ label: cr, value: cr })),
  ];
}

const sourceOptions = [
  { label: "All sources", value: "all" },
  { label: "SRD library", value: "standard" },
  { label: "My creatures", value: "user" },
];

function editionOptions(creatures: Creature[]) {
  return [
    { label: "All editions", value: "all" },
    ...Array.from(
      new Map(
        creatures
          .filter((creature) => creature.librarySource === "standard" && creature.sourceKey)
          .map((creature) => [
            creature.sourceKey,
            { label: creature.sourceLabel || creature.sourceKey, value: creature.sourceKey },
          ]),
      ).values(),
    ),
  ];
}
