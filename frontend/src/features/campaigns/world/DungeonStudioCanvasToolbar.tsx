import { Grid2X2, Minus, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";

export function DungeonStudioCanvasToolbar({
  canRedo,
  canUndo,
  dirty,
  maxZoom,
  minZoom,
  zoom,
  onRedo,
  onResetView,
  onUndo,
  onZoomIn,
  onZoomOut,
}: {
  canRedo: boolean;
  canUndo: boolean;
  dirty: boolean;
  maxZoom: number;
  minZoom: number;
  zoom: number;
  onRedo: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
      <ActionRow>
        <Button
          type="button"
          icon={Minus}
          size="sm"
          variant="secondary"
          disabled={zoom <= minZoom}
          onClick={onZoomOut}
        >
          Zoom out
        </Button>
        <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          icon={Plus}
          size="sm"
          variant="secondary"
          disabled={zoom >= maxZoom}
          onClick={onZoomIn}
        >
          Zoom in
        </Button>
        <Button type="button" icon={RotateCcw} size="sm" variant="ghost" onClick={onResetView}>
          Reset
        </Button>
      </ActionRow>
      <ActionRow>
        <Button
          type="button"
          icon={Undo2}
          size="sm"
          variant="secondary"
          disabled={!canUndo}
          onClick={onUndo}
        >
          Undo
        </Button>
        <Button
          type="button"
          icon={Redo2}
          size="sm"
          variant="secondary"
          disabled={!canRedo}
          onClick={onRedo}
        >
          Redo
        </Button>
      </ActionRow>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <Grid2X2 className="h-3.5 w-3.5" /> {dirty ? "Unsaved changes" : "Saved"} • Alt-drag to pan
      </span>
    </div>
  );
}
