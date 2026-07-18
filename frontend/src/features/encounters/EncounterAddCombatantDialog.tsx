import { Check, HeartPulse, Plus, Search, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Field, FloatingInput, Input, Modal, Select } from "../../components/ui";
import type { Creature } from "../../types";
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
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [role, setRole] = useState(mode === "enemy" ? "skirmisher" : "ally");
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
        return true;
      }),
    [crFilter, pool, query, sourceFilter, typeFilter],
  );
  const selected = filtered.find((creature) => creature.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setRole(mode === "enemy" ? "skirmisher" : "ally");
    if (mode === "ally") setTab("npcs");
  }, [mode, open]);

  function addSelected() {
    if (!selected) return;
    onAddCreature(selected, side, quantity, false);
    onOpenChange(false);
  }

  return (
    <Modal
      className="max-w-4xl"
      open={open}
      title={mode === "enemy" ? "Add enemy" : "Add ally"}
      onOpenChange={onOpenChange}
    >
      <div className="grid gap-4">
        {mode === "ally" ? <AllyTabs active={tab} onChange={setTab} /> : null}
        {mode === "ally" && (tab === "summons" || tab === "custom") ? (
          <UnsupportedAllyTab tab={tab} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid content-start gap-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem]">
                <FloatingInput
                  icon={Search}
                  label={mode === "enemy" ? "Search monsters" : "Search NPCs or creatures"}
                  value={query}
                  onChange={setQuery}
                />
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
              </div>
              <div className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
                {filtered.map((creature) => (
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
              </div>
            </div>
            <aside className="rounded-md border border-border bg-background p-3">
              {selected ? (
                <CreaturePreview
                  creature={selected}
                  mode={mode}
                  quantity={quantity}
                  role={role}
                  onAdd={addSelected}
                  onQuantityChange={setQuantity}
                  onRoleChange={setRole}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Choose a creature to preview.</p>
              )}
            </aside>
          </div>
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
      className={[
        "grid min-w-0 gap-3 rounded-md border p-2 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
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
  role,
  onAdd,
  onQuantityChange,
  onRoleChange,
}: {
  creature: Creature;
  mode: AddMode;
  quantity: number;
  role: string;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
  onRoleChange: (role: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <CreatureAvatar creature={creature} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{creature.name}</div>
          <div className="text-xs text-muted-foreground">
            {creature.size} {creature.creatureType} · CR {creature.challengeRating || "0"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PreviewStat icon={Shield} label="AC" value={creature.armorClass} />
        <PreviewStat icon={HeartPulse} label="HP" value={creature.hitPoints} />
      </div>
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
      <Field label="Role">
        <Select
          value={role}
          placeholder="Role"
          options={mode === "enemy" ? enemyRoleOptions : allyRoleOptions}
          onValueChange={onRoleChange}
        />
      </Field>
      <Button type="button" icon={Plus} onClick={onAdd}>
        {mode === "enemy" ? "Add enemy" : "Add ally"}
      </Button>
    </div>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" />
        {label}
      </div>
      <div className="font-semibold">{value}</div>
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
  { label: "All", value: "all" },
  { label: "Standard", value: "standard" },
  { label: "Custom", value: "user" },
];

const enemyRoleOptions = [
  { label: "Skirmisher", value: "skirmisher" },
  { label: "Leader", value: "leader" },
  { label: "Brute", value: "brute" },
  { label: "Controller", value: "controller" },
];

const allyRoleOptions = [
  { label: "Ally", value: "ally" },
  { label: "Guardian", value: "guardian" },
  { label: "Summon", value: "summon" },
  { label: "Support", value: "support" },
];
