import { Copy, Edit3, Eye, Trash2 } from "lucide-react";
import type React from "react";
import { Button } from "../../components/ui";
import type { Item } from "../../types";
import { buildItemDisplay, type ItemChip, type ItemChipTone } from "./itemCatalogDisplay";
import { iconForItem, ItemGlyph } from "./itemIcons";

export function ItemCatalogCard({
  item,
  onPreview,
  onEdit,
  onClone,
  onDelete,
}: {
  item: Item;
  onPreview: (item: Item) => void;
  onEdit: (item: Item) => void;
  onClone: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  const display = buildItemDisplay(item);
  const icon = iconForItem(item);

  return (
    <article className="grid min-h-52 grid-rows-[auto_auto_1fr_auto] gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <ItemGlyph entry={icon} />
        <div className="min-w-0">
          <h3 className="[overflow-wrap:anywhere] text-base font-semibold leading-tight">
            {item.name}
          </h3>
          <p className="mt-1 text-[0.72rem] font-extrabold uppercase tracking-wide text-muted-foreground">
            {display.subtitle}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2 py-1 text-[0.68rem] font-extrabold",
            item.librarySource === "user"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {display.sourceLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <CatalogStat label="Value" value={display.value} />
        <CatalogStat label="Weight" value={display.weight} />
      </div>

      <div className="flex max-h-[4.35rem] flex-wrap content-start gap-1.5 overflow-hidden">
        {display.chips.length ? (
          display.chips.map((chip) => <ItemChipView key={chip.label} chip={chip} />)
        ) : (
          <p className="text-sm text-muted-foreground">No extra catalog details yet.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button icon={Eye} size="sm" variant="ghost" onClick={() => onPreview(item)}>
          Preview
        </Button>
        {item.readOnly ? (
          <Button icon={Copy} size="sm" variant="secondary" onClick={() => onClone(item)}>
            Clone
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button icon={Edit3} size="sm" variant="ghost" onClick={() => onEdit(item)}>
              Edit
            </Button>
            <Button icon={Trash2} size="sm" variant="ghost" onClick={() => onDelete(item)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ItemCatalogCompactCard({ action, item }: { action?: React.ReactNode; item: Item }) {
  const display = buildItemDisplay(item);
  const icon = iconForItem(item);

  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <ItemGlyph entry={icon} />
        <div className="min-w-0">
          <h4 className="truncate font-semibold leading-tight">{item.name}</h4>
          <p className="mt-1 text-[0.72rem] font-extrabold uppercase tracking-wide text-muted-foreground">
            {display.subtitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CatalogStat label="Value" value={display.value} />
            <CatalogStat label="Weight" value={display.weight} />
          </div>
        </div>
        {action}
      </div>
    </article>
  );
}

export function ItemChipView({ chip }: { chip: ItemChip }) {
  return (
    <span
      className={[
        "inline-flex min-h-6 max-w-full items-center rounded-full border px-2 py-1 text-[0.72rem] font-bold leading-tight",
        chipToneClass(chip.tone),
      ].join(" ")}
    >
      <span className="truncate">{chip.label}</span>
    </span>
  );
}

function CatalogStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid min-w-20 gap-0.5 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="text-[0.62rem] font-extrabold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <strong className="text-sm leading-tight">{value}</strong>
    </span>
  );
}

function chipToneClass(tone: ItemChipTone = "default") {
  const tones = {
    blue: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    default: "border-border bg-background text-muted-foreground",
    purple: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-200",
    strong: "border-primary/25 bg-primary/10 text-primary",
    warn: "border-accent/25 bg-accent/10 text-accent",
  };
  return tones[tone];
}
