import { Search } from "lucide-react";
import { useState } from "react";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { Button, Input } from "../../components/ui";
import {
  adjustmentKind,
  projectPartyVitals,
  targetLimit,
  type PartyAdjustmentDraft,
  type PartyMember,
} from "./partyAdjustmentModel";

export function PartyTargetList({
  draft,
  members,
  onTargetIdsChange,
}: {
  draft: PartyAdjustmentDraft;
  members: PartyMember[];
  onTargetIdsChange: (targetIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const limit = targetLimit(draft);
  const selected = new Set(draft.targetIds);
  const filteredMembers = members.filter((member) =>
    (member.name + " " + member.detail).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selectionLabel = Number.isFinite(limit)
    ? draft.targetIds.length + "/" + limit + " selected"
    : draft.targetIds.length + " selected";
  const toggleTarget = (memberId: string) => {
    if (selected.has(memberId)) {
      onTargetIdsChange(draft.targetIds.filter((id) => id !== memberId));
      return;
    }
    if (draft.targetIds.length >= limit) return;
    onTargetIdsChange([...draft.targetIds, memberId]);
  };

  return (
    <section className="grid min-w-0 gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Targets</h3>
        <span className="text-xs text-muted-foreground">{selectionLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={members.length === 0}
            onClick={() => onTargetIdsChange(members.slice(0, limit).map((member) => member.id))}
          >
            Select party
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={draft.targetIds.length === 0}
            onClick={() => onTargetIdsChange([])}
          >
            Clear
          </Button>
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Only player characters in this party are available.
      </p>

      <label className="relative block">
        <span className="sr-only">Find party member</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Find party member"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {filteredMembers.map((member) => {
          const checked = selected.has(member.id);
          const projected = projectPartyVitals(member, draft);
          const disabled = !checked && draft.targetIds.length >= limit;
          const currentMaximum = member.maxHitPoints + member.temporaryMaxHitPoints;
          return (
            <label
              key={member.id}
              className={[
                "flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 transition",
                checked
                  ? "border-primary/55 bg-primary/5 shadow-sm"
                  : "border-border bg-background hover:bg-surface",
                disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-primary"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleTarget(member.id)}
              />
              <InitialsAvatar name={member.name} size="sm" src={member.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{member.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.detail || "Player character"}
                  {member.temporaryHitPoints > 0
                    ? " · " + member.temporaryHitPoints + " temp HP"
                    : ""}
                </span>
              </span>
              <span className="hidden shrink-0 text-right text-xs sm:block">
                <span className="block font-medium">
                  {member.currentHitPoints}/{currentMaximum} HP
                </span>
              </span>
              <span className="w-28 shrink-0 text-right text-xs">
                <strong className={["block", projectedTone(draft)].join(" ")}>
                  {projected.currentHitPoints}/{projected.effectiveMaxHitPoints} HP
                  {projected.temporaryHitPoints > 0
                    ? " · " + projected.temporaryHitPoints + " temp"
                    : ""}
                </strong>
                <span className="block text-muted-foreground">after</span>
              </span>
            </label>
          );
        })}
        {members.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            This campaign does not have any player characters yet.
          </p>
        )}
        {members.length > 0 && filteredMembers.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No party members match that search.
          </p>
        )}
      </div>
    </section>
  );
}

function projectedTone(draft: PartyAdjustmentDraft) {
  return adjustmentKind(draft) === "damage" ? "text-destructive" : "text-success";
}
