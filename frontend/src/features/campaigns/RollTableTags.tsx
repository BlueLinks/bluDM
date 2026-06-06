import { Tag } from "lucide-react";
import { Button } from "../../components/ui";
import { normalizeRollTableTags } from "./rollTableOptions";

export function TagFilterBar({
  availableTags,
  selectedTags,
  onClear,
  onToggle,
}: {
  availableTags: string[];
  selectedTags: string[];
  onClear: () => void;
  onToggle: (tag: string) => void;
}) {
  if (availableTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground">
        <Tag className="h-3.5 w-3.5" />
        Tags
      </span>
      {availableTags.map((tag) => {
        const selected = selectedTags.includes(tag);
        return (
          <button
            className={[
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground hover:border-primary hover:text-foreground",
            ].join(" ")}
            key={tag}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(tag)}
          >
            <Tag className="h-3 w-3" />
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear tags
        </Button>
      )}
    </div>
  );
}

export function TagChipList({ className = "", tags }: { className?: string; tags: string[] }) {
  const normalizedTags = normalizeRollTableTags(tags);
  if (normalizedTags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {normalizedTags.map((tag) => (
        <span
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          key={tag}
        >
          <Tag className="h-3 w-3" />
          {tag}
        </span>
      ))}
    </div>
  );
}
