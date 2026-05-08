import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { CreatureSourceFilter } from "../../components/shared/CreatureSourceFilter";
import { Button, Checkbox, Field, Input, Modal, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { creatureDefaultDisposition } from "../../lib/domain/forms";
import type { Creature, EncounterRun } from "../../types";

export function AddRunTargetDialog({
  open,
  runID,
  onClose,
  onAdded,
}: {
  open: boolean;
  runID: string;
  onClose: () => void;
  onAdded: (run: EncounterRun) => void;
}) {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [query, setQuery] = useState("");
  const [creatureID, setCreatureID] = useState("");
  const [showUserCreatures, setShowUserCreatures] = useState(true);
  const [showStandardCreatures, setShowStandardCreatures] = useState(true);
  const [side, setSide] = useState<"friendly" | "enemy">("enemy");
  const [quantity, setQuantity] = useState(1);
  const [rolledHp, setRolledHp] = useState(false);
  const [initiative, setInitiative] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = creatures
    .filter((creature) =>
      creature.librarySource === "standard" ? showStandardCreatures : showUserCreatures,
    )
    .filter((creature) =>
      [creature.name, creature.size, creature.creatureType, creature.challengeRating]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 20);

  useEffect(() => {
    if (!open) return;
    void api.creatures({ includeStandard: true }).then((payload) => {
      setCreatures(payload.creatures);
      setCreatureID((current) => current || payload.creatures[0]?.id || "");
      const first = payload.creatures[0];
      setSide(first && creatureDefaultDisposition(first) === "friendly" ? "friendly" : "enemy");
    });
  }, [open]);

  useEffect(() => {
    const selected = creatures.find((creature) => creature.id === creatureID);
    if (selected) {
      setSide(creatureDefaultDisposition(selected) === "friendly" ? "friendly" : "enemy");
    }
  }, [creatureID, creatures]);

  async function add() {
    if (!creatureID) return;
    const selected = creatures.find((creature) => creature.id === creatureID);
    setSaving(true);
    try {
      const payload = await api.addRunCombatants(runID, {
        creatureId: selected?.librarySource === "standard" ? "" : creatureID,
        standardCreatureId: selected?.librarySource === "standard" ? creatureID : "",
        side,
        quantity,
        rolledHp,
        initiative: Number(initiative) || 0,
        initiativeSet: initiative.trim() !== "",
      });
      onAdded(payload.run);
      setQuery("");
      setQuantity(1);
      setRolledHp(false);
      setInitiative("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add target to fight"
      open={open}
      onOpenChange={(next) => !next && onClose()}
      trigger={<span />}
    >
      <div className="grid gap-4">
        <Input
          placeholder="Search creatures"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <CreatureSourceFilter
          showStandard={showStandardCreatures}
          showUser={showUserCreatures}
          onShowStandardChange={setShowStandardCreatures}
          onShowUserChange={setShowUserCreatures}
        />
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
          {filtered.map((creature) => (
            <CreaturePickButton
              creature={creature}
              key={creature.id}
              selected={creature.id === creatureID}
              onSelect={setCreatureID}
            />
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No matching creatures.</div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Side">
            <Select
              value={side}
              placeholder="Side"
              options={[
                { label: "Enemy", value: "enemy" },
                { label: "Friendly", value: "friendly" },
              ]}
              onValueChange={(value) => setSide(value as "friendly" | "enemy")}
            />
          </Field>
          <Field label="Starting initiative">
            <Input
              type="number"
              placeholder="Next slot"
              value={initiative}
              onChange={(event) => setInitiative(event.target.value)}
            />
          </Field>
          <Field label="Quantity">
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </Field>
          <div className="flex items-end">
            <Checkbox label="Roll HP from hit dice" checked={rolledHp} onChange={setRolledHp} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            icon={Plus}
            disabled={!creatureID || saving}
            onClick={() => void add()}
          >
            {saving ? "Adding..." : "Add target"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreaturePickButton({
  creature,
  selected,
  onSelect,
}: {
  creature: Creature;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={[
        "flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted",
        selected ? "bg-primary/10" : "",
      ].join(" ")}
      onClick={() => onSelect(creature.id)}
    >
      <span>
        <span className="block font-semibold">{creature.name}</span>
        <span className="text-xs text-muted-foreground">
          {[creature.size, creature.creatureType].filter(Boolean).join(" · ")}
          {creature.challengeRating ? ` · CR ${creature.challengeRating}` : ""}
          {creature.readOnly ? ` · ${creature.sourceLabel || "Standard"}` : ""}
        </span>
      </span>
      <span className="text-sm font-bold">{creature.xp} XP</span>
    </button>
  );
}

function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex w-fit items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        -
      </Button>
      <Input
        className="w-20 text-center"
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
      />
      <Button type="button" variant="secondary" size="sm" onClick={() => onChange(value + 1)}>
        +
      </Button>
    </div>
  );
}
