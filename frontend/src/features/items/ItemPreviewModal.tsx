import { Copy, Edit3, Trash2 } from "lucide-react";
import { Badge, Button, Modal } from "../../components/ui";
import type { Item } from "../../types";
import { buildItemDisplay, type ItemStat } from "./itemCatalogDisplay";
import { ItemChipView } from "./ItemCatalogCard";
import { iconForItem, ItemGlyph } from "./itemIcons";

export function ItemPreviewModal({
  item,
  onClose,
  onClone,
  onEdit,
  onDelete,
}: {
  item: Item | null;
  onClose: () => void;
  onClone: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  const display = item ? buildItemDisplay(item) : null;
  const icon = item ? iconForItem(item) : null;

  return (
    <Modal
      className="max-w-4xl p-0"
      title={item ? item.name : "Item"}
      open={Boolean(item)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {item && display && icon && (
        <div>
          <div className="grid gap-4 border-b border-border bg-background p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            <ItemGlyph entry={icon} className="h-11 w-11" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold leading-tight">{item.name}</h2>
                <Badge tone={item.librarySource === "user" ? "friendly" : "default"}>
                  {display.sourceLabel}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {display.subtitle} · {display.sourceState}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button type="button" icon={Copy} variant="secondary" onClick={() => onClone(item)}>
                Clone
              </Button>
              {!item.readOnly && (
                <>
                  <Button
                    type="button"
                    icon={Edit3}
                    variant="secondary"
                    onClick={() => onEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    icon={Trash2}
                    variant="danger"
                    onClick={() => onDelete(item)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {display.primaryStats.map((stat) => (
                <PreviewStat key={`${stat.label}-${stat.value}`} stat={stat} />
              ))}
            </div>

            {display.chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {display.chips.map((chip) => (
                  <ItemChipView key={chip.label} chip={chip} />
                ))}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {display.detailSections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <h3 className="font-semibold">{section.title}</h3>
                  <ul className="mt-2 grid gap-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                    {section.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
              <section className="rounded-lg border border-border bg-background p-3">
                <h3 className="font-semibold">Inventory Hooks</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {display.inventoryHooks.map((hook) => (
                    <ItemChipView key={hook} chip={{ label: hook, tone: "strong" }} />
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-border bg-background p-3">
              <h3 className="font-semibold">Description</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {item.description || "No description is available for this item yet."}
              </p>
            </section>

            <details className="rounded-lg border border-border bg-background p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Source Metadata</summary>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {display.sourceMetadata.map((entry) => (
                  <div key={entry.label} className="rounded-md bg-card px-3 py-2">
                    <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
                      {entry.label}
                    </dt>
                    <dd className="mt-0.5 break-words font-medium">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewStat({ stat }: { stat: ItemStat }) {
  return (
    <span className="grid gap-1 rounded-md border border-border bg-background px-3 py-2">
      <span className="text-[0.68rem] font-extrabold uppercase tracking-wide text-muted-foreground">
        {stat.label}
      </span>
      <strong className="min-w-0 break-words text-sm">{stat.value}</strong>
    </span>
  );
}
