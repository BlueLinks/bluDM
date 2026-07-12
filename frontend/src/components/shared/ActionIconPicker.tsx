import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { actionIconAttribution, curatedActionIcons } from "../../lib/domain/actionIcons";
import type { ActionFormState } from "../../types";
import { Badge, Button, EmptyMini, FloatingInput, Modal } from "../ui";
import { ActionIcon } from "./ActionIcon";

export function ActionIconPicker({
  value,
  onChange,
}: {
  value: Pick<
    ActionFormState,
    "iconSource" | "iconKey" | "iconAssetId" | "iconUrl" | "iconAttribution"
  >;
  onChange: (
    next: Pick<
      ActionFormState,
      "iconSource" | "iconKey" | "iconAssetId" | "iconUrl" | "iconAttribution"
    >,
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredIcons = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return curatedActionIcons.filter(
      (icon) =>
        !lowered ||
        icon.label.toLowerCase().includes(lowered) ||
        icon.category.toLowerCase().includes(lowered),
    );
  }, [query]);

  function clearIcon() {
    onChange({
      iconSource: "none",
      iconKey: "",
      iconAssetId: "",
      iconUrl: "",
      iconAttribution: "",
    });
  }

  return (
    <div className="grid min-w-0 gap-2 text-sm font-medium">
      <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">
        Icon
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <ActionIcon action={value} />
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Choose action icon"
          trigger={
            <Button type="button" variant="secondary">
              Choose icon
            </Button>
          }
        >
          <div className="grid gap-4">
            <FloatingInput icon={Search} label="Search icons" value={query} onChange={setQuery} />
            <div className="grid max-h-[52vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {filteredIcons.map((icon) => (
                <button
                  className="grid gap-2 rounded-md border border-border bg-surface p-3 text-left text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  key={icon.key}
                  type="button"
                  onClick={() => {
                    onChange({
                      iconSource: "game-icons",
                      iconKey: icon.key,
                      iconAssetId: "",
                      iconUrl: "",
                      iconAttribution: actionIconAttribution(icon.key),
                    });
                    setOpen(false);
                  }}
                >
                  <ActionIcon action={{ iconSource: "game-icons", iconKey: icon.key }} />
                  <span className="text-sm font-semibold">{icon.label}</span>
                  <span className="text-xs text-muted-foreground">{icon.category}</span>
                </button>
              ))}
              {filteredIcons.length === 0 && <EmptyMini copy="No matching icons." />}
            </div>
            <p className="text-xs text-muted-foreground">
              Icons are from game-icons.net. Attribution is recorded with the action.
            </p>
          </div>
        </Modal>
        {value.iconSource !== "none" && (
          <Button type="button" icon={X} size="sm" variant="ghost" onClick={clearIcon}>
            Clear
          </Button>
        )}
        {value.iconAttribution && <Badge tone="official">{value.iconAttribution}</Badge>}
      </div>
    </div>
  );
}
