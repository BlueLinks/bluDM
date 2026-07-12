import { Map as MapIcon } from "lucide-react";
import { Button } from "../../../components/ui";

export function MapPlaceholderPanel({
  compact,
  copy,
  showAction,
  title,
  onOpenMaps,
}: {
  compact: boolean;
  copy: string;
  showAction: boolean;
  title?: string;
  onOpenMaps: () => void;
}) {
  return (
    <div
      className={[
        "campaign-world-map-placeholder relative grid overflow-hidden rounded-md border border-border bg-background",
        compact ? "min-h-64" : "min-h-96",
      ].join(" ")}
    >
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(hsl(var(--border)/0.65)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.65)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute left-8 top-8 h-20 w-32 rounded border border-border/80 bg-card/40" />
      <div className="absolute bottom-10 right-10 h-28 w-44 rounded border border-border/80 bg-card/30" />
      <div className="absolute left-1/4 top-1/2 h-px w-1/2 rotate-[-12deg] border-t border-dashed border-border" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />
      <div className="relative place-self-center px-6 py-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-border bg-card">
          <MapIcon className="h-6 w-6 text-muted-foreground" />
        </span>
        <h4 className="mt-3 font-semibold">
          {title ?? (compact ? "No map position yet" : "No map attached yet")}
        </h4>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{copy}</p>
        {showAction ? (
          <Button
            className="mt-4"
            type="button"
            icon={MapIcon}
            size="sm"
            variant="secondary"
            onClick={onOpenMaps}
          >
            Add map
          </Button>
        ) : null}
      </div>
    </div>
  );
}
