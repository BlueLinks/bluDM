import { ArrowDown, ArrowUpDown, Diamond, HeartPulse, Minus, Plus } from "lucide-react";
import type { ElementType } from "react";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Checkbox, Field, Input, Select } from "../../components/ui";
import type { Campaign } from "../../types";
import {
  aidAmount,
  inspiringLeaderAmount,
  type PartyAdjustmentDraft,
  type PartyMember,
  type QuickAdjustmentKind,
} from "./partyAdjustmentModel";

export function PartyAdjustmentControls({
  campaigns,
  campaignId,
  combat,
  draft,
  members,
  onCampaignChange,
  onDraftChange,
}: {
  campaigns: Campaign[];
  campaignId: string;
  combat: boolean;
  draft: PartyAdjustmentDraft;
  members: PartyMember[];
  onCampaignChange: (campaignId: string) => void;
  onDraftChange: (draft: PartyAdjustmentDraft) => void;
}) {
  const setDraft = (changes: Partial<PartyAdjustmentDraft>) =>
    onDraftChange({ ...draft, ...changes });

  return (
    <div className="grid min-w-0">
      {!combat && campaigns.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Campaign</span>
          <Select
            ariaLabel="Campaign"
            className="sm:w-64"
            options={campaigns.map((campaign) => ({
              label: campaign.name,
              value: campaign.id,
            }))}
            placeholder="Choose a campaign"
            size="sm"
            value={campaignId}
            onValueChange={onCampaignChange}
          />
        </div>
      )}

      <div className="grid grid-cols-2 border-b border-border" role="tablist">
        <WorkflowTab
          active={draft.workflow === "quick"}
          copy="Damage, healing, or direct changes"
          label="Quick adjustment"
          onClick={() => setDraft({ workflow: "quick" })}
        />
        <WorkflowTab
          active={draft.workflow === "source"}
          copy="Apply rules and track resources"
          label="Cast or use feature"
          onClick={() =>
            setDraft({
              workflow: "source",
              targetIds: draft.targetIds.slice(0, draft.source === "aid" ? 3 : 6),
            })
          }
        />
      </div>

      {draft.workflow === "quick" ? (
        <QuickAdjustmentFields draft={draft} onChange={setDraft} />
      ) : (
        <SourceAdjustmentFields draft={draft} members={members} onChange={setDraft} />
      )}
    </div>
  );
}

function WorkflowTab({
  active,
  copy,
  label,
  onClick,
}: {
  active: boolean;
  copy: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-selected={active}
      role="tab"
      className={[
        "-mb-px grid gap-0.5 border-b-2 px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs">{copy}</span>
    </button>
  );
}

function QuickAdjustmentFields({
  draft,
  onChange,
}: {
  draft: PartyAdjustmentDraft;
  onChange: (changes: Partial<PartyAdjustmentDraft>) => void;
}) {
  const options: Array<{
    value: QuickAdjustmentKind;
    label: string;
    copy: string;
    icon: ElementType;
    tone: string;
  }> = [
    {
      value: "damage",
      label: "Damage",
      copy: "Subtract HP",
      icon: ArrowDown,
      tone: "bg-destructive/10 text-destructive",
    },
    {
      value: "healing",
      label: "Healing",
      copy: "Restore HP",
      icon: HeartPulse,
      tone: "bg-success/10 text-success",
    },
    {
      value: "temporary_hit_points",
      label: "Temporary HP",
      copy: "Keep higher",
      icon: Diamond,
      tone: "bg-info/10 text-info",
    },
    {
      value: "temporary_max_hit_points",
      label: "Max HP",
      copy: "Timed modifier",
      icon: ArrowUpDown,
      tone: "bg-tertiary/10 text-tertiary",
    },
  ];
  return (
    <section className="grid gap-4 pt-4">
      <h3 className="font-semibold">What happened?</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <AdjustmentTypeButton
            active={draft.quickKind === option.value}
            copy={option.copy}
            icon={option.icon}
            key={option.value}
            label={option.label}
            tone={option.tone}
            onClick={() => onChange({ quickKind: option.value })}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AmountControl
          amount={draft.amount}
          label="Amount"
          onChange={(amount) => onChange({ amount })}
        />
        {draft.quickKind === "damage" && (
          <Field label="Damage type">
            <Select
              ariaLabel="Damage type"
              options={damageTypeOptions()}
              placeholder="Choose damage type"
              value={draft.damageType}
              onValueChange={(damageType) => onChange({ damageType })}
            />
          </Field>
        )}
      </div>

      <Field label="Reason (optional)">
        <Input
          placeholder="Fell from the ruined bridge"
          value={draft.reason}
          onChange={(event) => onChange({ reason: event.target.value })}
        />
      </Field>

      {draft.quickKind === "temporary_max_hit_points" && (
        <Checkbox
          checked={draft.adjustCurrentHitPoints}
          label="Increase current HP by the same amount"
          onChange={(checked) => onChange({ adjustCurrentHitPoints: checked })}
        />
      )}

      <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
        {quickAdjustmentHelp(draft.quickKind)}
      </p>
    </section>
  );
}

function AdjustmentTypeButton({
  active,
  copy,
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  copy: string;
  icon: ElementType;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        "flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-primary/30 hover:bg-surface",
      ].join(" ")}
      onClick={onClick}
    >
      <span className={["grid h-8 w-8 shrink-0 place-items-center rounded-md", tone].join(" ")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{copy}</span>
      </span>
    </button>
  );
}

function SourceAdjustmentFields({
  draft,
  members,
  onChange,
}: {
  draft: PartyAdjustmentDraft;
  members: PartyMember[];
  onChange: (changes: Partial<PartyAdjustmentDraft>) => void;
}) {
  const actor = members.find((member) => member.id === draft.actorId);
  const availableSlots = Object.entries(actor?.spellSlots ?? {})
    .map(([level, slot]) => ({ level: Number(level), ...slot }))
    .filter((slot) => slot.level >= 2 && slot.remaining > 0);
  const chooseActor = (actorId: string) => {
    const nextActor = members.find((member) => member.id === actorId);
    const nextAvailableSlots = Object.entries(nextActor?.spellSlots ?? {})
      .map(([level, slot]) => ({ level: Number(level), ...slot }))
      .filter((slot) => slot.level >= 2 && slot.remaining > 0);
    const selectedSlotAvailable = nextAvailableSlots.some((slot) => slot.level === draft.slotLevel);
    onChange({
      actorId,
      amount: draft.source === "inspiring_leader" ? inspiringLeaderAmount(nextActor) : draft.amount,
      consumeSpellSlot: nextAvailableSlots.length > 0 && draft.consumeSpellSlot,
      slotLevel:
        draft.consumeSpellSlot && !selectedSlotAvailable
          ? (nextAvailableSlots[0]?.level ?? draft.slotLevel)
          : draft.slotLevel,
    });
  };

  return (
    <section className="grid gap-4 pt-4">
      <h3 className="font-semibold">Choose a spell or feature</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Used by">
          <Select
            ariaLabel="Used by"
            options={members.map((member) => ({
              label: member.name + (member.detail ? " · " + member.detail : ""),
              value: member.id,
            }))}
            placeholder="Choose a party member"
            value={draft.actorId}
            onValueChange={chooseActor}
          />
        </Field>
        <Field label="Spell or feature">
          <Select
            ariaLabel="Spell or feature"
            options={[
              { label: "Aid", value: "aid" },
              { label: "Inspiring Leader", value: "inspiring_leader" },
            ]}
            placeholder="Choose a source"
            value={draft.source}
            onValueChange={(value) => {
              const source = value as PartyAdjustmentDraft["source"];
              onChange({
                source,
                amount: source === "inspiring_leader" ? inspiringLeaderAmount(actor) : draft.amount,
                targetIds: draft.targetIds.slice(0, source === "aid" ? 3 : 6),
              });
            }}
          />
        </Field>
      </div>

      <FeatureSummary actor={actor} draft={draft} />

      <div className="border-t border-border pt-4">
        {draft.source === "aid" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="min-w-0 flex-1" label="Cast at">
              <Select
                ariaLabel="Cast at"
                options={aidCastLevelOptions(actor)}
                placeholder="Choose a spell level"
                value={String(draft.slotLevel)}
                onValueChange={(value) => onChange({ slotLevel: Number(value) })}
              />
            </Field>
            <Checkbox
              checked={draft.consumeSpellSlot}
              disabled={!actor || availableSlots.length === 0}
              label={
                actor && availableSlots.length === 0
                  ? "No spell slot available"
                  : "Use one spell slot"
              }
              onChange={(checked) =>
                onChange({
                  consumeSpellSlot: checked,
                  slotLevel:
                    checked && !availableSlots.some((slot) => slot.level === draft.slotLevel)
                      ? (availableSlots[0]?.level ?? draft.slotLevel)
                      : draft.slotLevel,
                })
              }
            />
          </div>
        ) : (
          <AmountControl
            amount={draft.amount}
            label="Temporary HP granted"
            onChange={(amount) => onChange({ amount })}
          />
        )}
      </div>
    </section>
  );
}

function FeatureSummary({ actor, draft }: { actor?: PartyMember; draft: PartyAdjustmentDraft }) {
  const aid = draft.source === "aid";
  const amount = aid ? aidAmount(draft.slotLevel) : draft.amount;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div>
        <h4 className="font-semibold">{aid ? "Aid" : "Inspiring Leader"}</h4>
        <p className="text-xs text-muted-foreground">
          {aid
            ? levelLabel(draft.slotLevel) + " spell · 8 hours · no concentration"
            : "Character feature · until next long rest"}
        </p>
      </div>
      <p className="mt-3 text-sm leading-5">
        {aid
          ? "Each target’s current and maximum hit points increase by " +
            amount +
            " for the duration."
          : "Each chosen party member gains " +
            amount +
            " temporary hit points. Existing temporary HP is kept when higher."}
      </p>
      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-border bg-background">
        <FeatureStat label="Current HP" value={aid ? "+" + amount : "No change"} />
        <FeatureStat
          label={aid ? "Maximum HP" : "Temporary HP"}
          value={aid ? "+" + amount : amount + " temp HP"}
        />
        <FeatureStat label="Targets" value={"Up to " + (aid ? 3 : 6)} />
      </div>
      {!actor && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Choose who is using this spell or feature.
        </p>
      )}
    </div>
  );
}

function FeatureStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-border px-3 py-2 last:border-r-0">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="block truncate text-sm">{value}</strong>
    </div>
  );
}

function AmountControl({
  amount,
  label,
  onChange,
}: {
  amount: number;
  label: string;
  onChange: (amount: number) => void;
}) {
  return (
    <Field label={label}>
      <span className="flex min-w-0 overflow-hidden rounded-md border border-border bg-background">
        <button
          aria-label={"Decrease " + label}
          className="grid w-10 shrink-0 place-items-center border-r border-border transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          type="button"
          onClick={() => onChange(Math.max(1, amount - 1))}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          aria-label={label}
          className="min-h-10 min-w-0 flex-1 bg-background px-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          min={1}
          type="number"
          value={amount}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button
          aria-label={"Increase " + label}
          className="grid w-10 shrink-0 place-items-center border-l border-border transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
          type="button"
          onClick={() => onChange(amount + 1)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </span>
    </Field>
  );
}

function quickAdjustmentHelp(kind: QuickAdjustmentKind) {
  if (kind === "damage") {
    return "Damage uses temporary HP first. Resistance and vulnerability are not applied here.";
  }
  if (kind === "healing") return "Healing cannot raise a character above their current maximum HP.";
  if (kind === "temporary_hit_points") {
    return "Temporary HP does not stack. Each target keeps the higher value.";
  }
  return "This is a timed maximum-HP modifier. A long rest clears temporary maximum HP.";
}

function levelLabel(level: number) {
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return level + suffix + "-level";
}

function aidCastLevelOptions(actor?: PartyMember) {
  return Array.from({ length: 8 }, (_, index) => {
    const level = index + 2;
    const slot = actor?.spellSlots[level];
    const availability = actor
      ? slot
        ? slot.remaining + "/" + slot.maximum + " slots left"
        : "not tracked"
      : "";
    return {
      label: levelLabel(level) + (availability ? " · " + availability : ""),
      value: String(level),
    };
  });
}
