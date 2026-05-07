import { Dices } from "lucide-react";
import { useState } from "react";
import { Button, Input, Modal } from "./ui";

type DiceRow = {
  count: string;
  modifier: string;
};

type RollResult = {
  id: string;
  die: number;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
  createdAt: Date;
};

const diceValues = [4, 6, 8, 10, 12, 20, 100];

function defaultRows() {
  return Object.fromEntries(diceValues.map((die) => [String(die), { count: die === 20 ? "1" : "", modifier: "" }])) as Record<string, DiceRow>;
}

function signed(value: number) {
  if (value === 0) return "+0";
  return value > 0 ? `+${value}` : String(value);
}

function clampPositive(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function DiceRoller() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(defaultRows);
  const [customDie, setCustomDie] = useState("");
  const [customCount, setCustomCount] = useState("");
  const [customModifier, setCustomModifier] = useState("");
  const [log, setLog] = useState<RollResult[]>([]);
  const [latest, setLatest] = useState<RollResult | null>(null);

  function updateRow(die: number, patch: Partial<DiceRow>) {
    setRows((current) => ({
      ...current,
      [String(die)]: { ...current[String(die)], ...patch }
    }));
  }

  function roll(die: number, countInput: string, modifierInput: string) {
    const count = clampPositive(countInput, 1);
    const modifier = Number(modifierInput) || 0;
    const rolls = Array.from({ length: Math.min(count, 100) }, () => Math.floor(Math.random() * die) + 1);
    const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;
    const result = {
      id: crypto.randomUUID(),
      die,
      count,
      modifier,
      rolls,
      total,
      createdAt: new Date()
    };
    setLog((current) => [result, ...current].slice(0, 20));
    setLatest(result);
  }

  const customDieValue = clampPositive(customDie, 20);

  return (
    <>
      <Modal
        title="Dice roller"
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button type="button" icon={Dices} variant="secondary">
            Dice
          </Button>
        }
      >
        <div className="grid gap-5">
          {latest && (
            <section key={latest.id} className="damage-roll-line rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
              <div className="text-sm font-bold uppercase text-muted-foreground">
                {latest.count}d{latest.die}
              </div>
              <div className="my-1 text-5xl font-black text-primary">{latest.total}</div>
              <div className="text-sm font-medium text-muted-foreground">
                {latest.rolls.join(" + ")} {signed(latest.modifier)}
              </div>
            </section>
          )}
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[80px_1fr_1fr_88px] gap-2 bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
              <span>Dice</span>
              <span>Number</span>
              <span>Modifier</span>
              <span className="text-right">Roll</span>
            </div>
            <div className="divide-y divide-border">
              {diceValues.map((die) => (
                <div className="grid grid-cols-[80px_1fr_1fr_88px] items-center gap-2 px-3 py-2" key={die}>
                  <span className="inline-flex items-center gap-2 font-semibold"><Dices className="h-4 w-4 text-accent" /> d{die}</span>
                  <Stepper value={rows[String(die)].count} min={1} placeholder="1" ariaLabel={`Number of d${die} dice`} onChange={(count) => updateRow(die, { count })} />
                  <Stepper value={rows[String(die)].modifier} min={-99} placeholder="+0" ariaLabel={`d${die} fixed modifier`} onChange={(modifier) => updateRow(die, { modifier })} />
                  <Button
                    type="button"
                    size="sm"
                    className="justify-self-end"
                    onClick={() => roll(die, rows[String(die)].count, rows[String(die)].modifier)}
                  >
                    Roll
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-[80px_1fr_1fr_88px] items-center gap-2 px-3 py-2">
                <Input aria-label="Custom die value" inputMode="numeric" min={1} placeholder="d?" type="number" value={customDie} onChange={(event) => setCustomDie(event.target.value)} />
                <Stepper value={customCount} min={1} placeholder="1" ariaLabel="Custom dice count" onChange={setCustomCount} />
                <Stepper value={customModifier} min={-99} placeholder="+0" ariaLabel="Custom fixed modifier" onChange={setCustomModifier} />
                <Button type="button" size="sm" className="justify-self-end" onClick={() => roll(customDieValue, customCount, customModifier)}>
                  Roll
                </Button>
              </div>
            </div>
          </div>

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">Roll log</h3>
            {log.length === 0 && <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">No rolls yet.</p>}
            <div className="grid max-h-64 gap-2 overflow-y-auto">
              {log.map((entry) => (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm" key={entry.id}>
                  <div>
                    <div className="font-semibold">
                      {entry.count}d{entry.die} {signed(entry.modifier)}
                    </div>
                    <div className="text-xs text-muted-foreground">{entry.rolls.join(" + ")} {signed(entry.modifier)}</div>
                  </div>
                  <div className="text-xl font-bold text-primary">{entry.total}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}

function Stepper({
  ariaLabel,
  min,
  onChange,
  placeholder,
  value
}: {
  ariaLabel: string;
  min: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const current = Number(value) || 0;
  function step(delta: number) {
    onChange(String(Math.max(min, current + delta)));
  }
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border bg-card">
      <button className="grid h-10 w-8 place-items-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => step(-1)}>-</button>
      <Input
        aria-label={ariaLabel}
        className="h-10 min-h-0 w-full rounded-none border-0 text-center font-semibold focus:ring-0"
        inputMode="numeric"
        min={min}
        placeholder={placeholder}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="grid h-10 w-8 place-items-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => step(1)}>+</button>
    </div>
  );
}
