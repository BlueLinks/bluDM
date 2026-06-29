import {
  Circle,
  DoorOpen,
  DraftingCompass,
  Eraser,
  Mountain,
  PaintBucket,
  MousePointer2,
  Paintbrush,
  Slash,
  Square,
  Trash2,
  Waves,
} from "lucide-react";
import type { ElementType } from "react";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import {
  brushShapeLabel,
  brushShapeOptions,
  supportsBrushShape,
  type DungeonStudioBrushShape,
} from "./dungeonStudioBrushes";
import { InspectorRow } from "./DungeonStudioInspectorRow";
import { DungeonStudioRoomInspector } from "./DungeonStudioRoomInspector";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioDocument, DungeonStudioRoomRegion } from "./dungeonStudioDocument";
import { selectionLabel } from "./dungeonStudioPanelText";
import { modeForTool, modeLabel, toolLabel, toolTip, type ToolMode } from "./dungeonStudioToolText";

type ToolDefinition = {
  tool: DungeonStudioTool;
  label: string;
  copy: string;
  icon: ElementType;
};

const modeTools: Record<ToolMode, ToolDefinition[]> = {
  select: [
    {
      tool: "select",
      label: "Select",
      copy: "Inspect cells and edges without changing the map.",
      icon: MousePointer2,
    },
  ],
  floor: [
    {
      tool: "floor",
      label: "Floor Brush",
      copy: "Paint rooms and corridors.",
      icon: Paintbrush,
    },
    {
      tool: "wall",
      label: "Wall",
      copy: "Click a valid edge.",
      icon: DraftingCompass,
    },
    {
      tool: "diagonal-wall",
      label: "Diagonal",
      copy: "Click a valid cell diagonal.",
      icon: Slash,
    },
    {
      tool: "door",
      label: "Door",
      copy: "Click a valid edge.",
      icon: DoorOpen,
    },
  ],
  terrain: [
    {
      tool: "water",
      label: "Water",
      copy: "Brush water cells.",
      icon: Waves,
    },
    {
      tool: "chasm",
      label: "Chasm",
      copy: "Brush pits and voids.",
      icon: Circle,
    },
    {
      tool: "cliff",
      label: "Cliff",
      copy: "Brush cliff terrain.",
      icon: Mountain,
    },
    {
      tool: "cliff-edge",
      label: "Cliff Edge",
      copy: "Click a valid boundary.",
      icon: Mountain,
    },
  ],
  room: [
    {
      tool: "room-select",
      label: "Room Select",
      copy: "Drag floor cells for a room region.",
      icon: Square,
    },
    {
      tool: "room-brush",
      label: "Room Brush",
      copy: "Paint cells into the active room.",
      icon: Paintbrush,
    },
    {
      tool: "room-fill",
      label: "Room Fill",
      copy: "Preview and fill an enclosed room.",
      icon: PaintBucket,
    },
    {
      tool: "erase-room",
      label: "Room Eraser",
      copy: "Remove room coverage only.",
      icon: Eraser,
    },
  ],
  delete: [
    {
      tool: "delete",
      label: "Delete Brush",
      copy: "Drag to delete floor, terrain, and touched edges.",
      icon: Trash2,
    },
    {
      tool: "erase",
      label: "Floor Eraser",
      copy: "Drag to erase floor only.",
      icon: Eraser,
    },
    {
      tool: "erase-terrain",
      label: "Terrain Eraser",
      copy: "Drag to erase terrain only.",
      icon: Eraser,
    },
  ],
};

const modeDefaults: Record<ToolMode, { tool: DungeonStudioTool; icon: ElementType }> = {
  select: { tool: "select", icon: MousePointer2 },
  floor: { tool: "floor", icon: Paintbrush },
  terrain: { tool: "water", icon: Waves },
  room: { tool: "room-select", icon: Square },
  delete: { tool: "delete", icon: Trash2 },
};

export function DungeonStudioToolPanel({
  activeTool,
  brushShape,
  onBrushShapeChange,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  const activeMode = modeForTool(activeTool);
  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title="Toolbox" meta={`${modeLabel(activeMode)} mode`} />
      <div className="grid grid-cols-2 gap-2" aria-label="Dungeon Studio modes">
        {(Object.keys(modeDefaults) as ToolMode[]).map((mode) => (
          <ModeButton
            key={mode}
            active={activeMode === mode}
            icon={modeDefaults[mode].icon}
            label={modeLabel(mode)}
            onClick={() => onToolChange(modeDefaults[mode].tool)}
          />
        ))}
      </div>
      {supportsBrushShape(activeTool) ? (
        <>
          <ToolGroupLabel>Brush shape</ToolGroupLabel>
          <div className="grid grid-cols-3 gap-2" aria-label="Brush shape">
            {brushShapeOptions.map((option) => (
              <ShapeButton
                key={option.shape}
                active={brushShape === option.shape}
                icon={option.icon}
                label={option.label}
                onClick={() => onBrushShapeChange(option.shape)}
              />
            ))}
          </div>
        </>
      ) : null}
      <ToolGroupLabel>Brushes and tools</ToolGroupLabel>
      <div className="grid grid-cols-2 gap-2" aria-label={`${modeLabel(activeMode)} tools`}>
        {modeTools[activeMode].map((tool) => (
          <ToolButton
            key={tool.tool}
            active={activeTool === tool.tool}
            copy={tool.copy}
            icon={tool.icon}
            label={tool.label}
            onClick={() => onToolChange(tool.tool)}
          />
        ))}
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        <div className="font-bold uppercase">Current brush</div>
        <div className="mt-1 text-sm font-semibold text-foreground">
          {toolLabel(activeTool)}
          {supportsBrushShape(activeTool) ? ` • ${brushShapeLabel(brushShape)}` : ""}
        </div>
        <p className="mt-1">{toolTip(activeTool)}</p>
      </div>
    </CardSection>
  );
}

export function DungeonStudioInspectorPanel({
  activeTool,
  document,
  floorCellCount,
  mapName,
  selected,
  selectedRoom,
  onCreateRoomFromSelection,
  onDeleteRoom,
  onDoneRoom,
  onRenameRoom,
  onStartNewRoom,
}: {
  activeTool: DungeonStudioTool;
  document: DungeonStudioDocument;
  floorCellCount: number;
  mapName: string;
  selected: DungeonStudioSelection;
  selectedRoom?: DungeonStudioRoomRegion;
  onCreateRoomFromSelection: () => void;
  onDeleteRoom: (roomId: string) => void;
  onDoneRoom: () => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onStartNewRoom: () => void;
}) {
  const terrainCount = document.layers
    .filter(
      (layer) =>
        layer.cellKind === "water" || layer.cellKind === "chasm" || layer.cellKind === "cliff",
    )
    .reduce((total, layer) => total + layer.cells.length, 0);
  const cliffEdgeCount = document.edges.filter((edge) => edge.kind === "cliff-edge").length;
  const roomCellCount = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const canCreateRoom =
    selected?.type === "region" && !selected.roomId && selected.cells.length > 0;
  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title="Tool options" meta={toolLabel(activeTool)} />
      <DungeonStudioRoomInspector
        selectedRoom={selectedRoom}
        onDeleteRoom={onDeleteRoom}
        onDoneRoom={onDoneRoom}
        onRenameRoom={onRenameRoom}
        onStartNewRoom={onStartNewRoom}
      />
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <div className="text-xs font-bold uppercase text-muted-foreground">Room action</div>
        <Button
          type="button"
          className="mt-2 w-full"
          disabled={!canCreateRoom}
          icon={Square}
          size="sm"
          variant="secondary"
          onClick={onCreateRoomFromSelection}
        >
          Create room region
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Select floor cells in Room mode, then create an unlinked room region.
        </p>
      </div>
      <details className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground">
          More details
        </summary>
        <div className="mt-2 grid gap-2">
          <InspectorRow label="Mode" value={modeLabel(modeForTool(activeTool))} />
          <InspectorRow label="Map record" value={mapName} />
          <InspectorRow label="Selection" value={selectionLabel(selected)} />
          <InspectorRow label="Floor cells" value={String(floorCellCount)} />
          <InspectorRow label="Terrain cells" value={String(terrainCount)} />
          <InspectorRow
            label="Walls / doors"
            value={String(document.edges.length - cliffEdgeCount)}
          />
          <InspectorRow label="Cliff edges" value={String(cliffEdgeCount)} />
          <InspectorRow label="Room regions" value={String(document.rooms.length)} />
          <InspectorRow label="Room cells" value={String(roomCellCount)} />
        </div>
      </details>
      <EmptyMini copy={toolTip(activeTool)} />
    </CardSection>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "rounded-md border px-3 py-2 text-sm font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border bg-background text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </span>
    </button>
  );
}

function ToolGroupLabel({ children }: { children: string }) {
  return <div className="pt-1 text-xs font-bold uppercase text-muted-foreground">{children}</div>;
}

function ShapeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "rounded-md border px-2 py-2 text-xs font-semibold transition hover:border-accent/50",
        active ? "border-accent/40 bg-accent/10" : "border-border bg-background",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="flex flex-col items-center gap-1">
        <Icon className="h-4 w-4 text-accent" />
        <span>{label}</span>
      </span>
    </button>
  );
}

function ToolButton({
  active = false,
  copy,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  copy: string;
  icon: ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "min-w-0 rounded-md border px-3 py-2 text-left text-sm transition hover:border-accent/50",
        active ? "border-accent/40 bg-accent/10" : "border-border bg-background",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{copy}</span>
    </button>
  );
}
