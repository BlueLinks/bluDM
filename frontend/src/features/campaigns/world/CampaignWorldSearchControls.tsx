import { X } from "lucide-react";
import type React from "react";
import { ActionRow, FieldGrid } from "../../../components/layout";
import { Button, Field } from "../../../components/ui";
import type { WorldRelationshipFilter } from "./campaignWorldSearch";

export function CampaignWorldSearchControls({
  query,
  relationship,
  resultCount,
  tag,
  tags,
  type,
  types,
  totalCount,
  action,
  onClear,
  onRelationshipChange,
  onTagChange,
  onTypeChange,
}: {
  query: string;
  relationship: WorldRelationshipFilter;
  resultCount: number;
  tag: string;
  tags: string[];
  type: string;
  types: string[];
  totalCount: number;
  action?: React.ReactNode;
  onClear: () => void;
  onRelationshipChange: (value: WorldRelationshipFilter) => void;
  onTagChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}) {
  const filtered = query || relationship || tag || type;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-3">
      <ActionRow justify="between">
        <div className="min-w-0">
          <h4 className="font-semibold">Location filters</h4>
          <p className="text-xs font-semibold text-muted-foreground">
            Refine {resultCount} of {totalCount} visible locations.
          </p>
        </div>
        {action}
      </ActionRow>
      <FieldGrid variant="worldSearch">
        <Field label="Type">
          <select
            className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            <option value="">Any type</option>
            {types.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tag">
          <select
            className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
          >
            <option value="">Any tag</option>
            {tags.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Relationship">
          <select
            className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
            value={relationship}
            onChange={(event) =>
              onRelationshipChange(event.target.value as WorldRelationshipFilter)
            }
          >
            <option value="">Any relation</option>
            <option value="has-stock">Has stock</option>
            <option value="has-npc">Has NPC links</option>
            <option value="has-encounter">Has encounters</option>
          </select>
        </Field>
        <Button type="button" icon={X} variant="secondary" disabled={!filtered} onClick={onClear}>
          Clear
        </Button>
      </FieldGrid>
    </div>
  );
}
