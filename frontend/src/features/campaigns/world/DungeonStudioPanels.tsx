import {
  Circle,
  DoorOpen,
  DraftingCompass,
  Eraser,
  Mountain,
  MousePointer2,
  Paintbrush,
  RectangleHorizontal,
  Slash,
  Square,
  Trash2,
  Waves,
  Wand2,
} from "lucide-react";
import type { ElementType } from "react";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";

type ToolMode = "select" | "floor" | "terrain" | "delete";

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
      tool: "rectangle-room",
      label: "Rectangle",
      copy: "Drag a snapped room box.",
      icon: RectangleHorizontal,
    },
    {
      tool: "square-room",
      label: "Square",
      copy: "Drag an equal-sided room.",
      icon: Square,
    },
    {
      tool: "circle-room",
      label: "Round",
      copy: "Drag a round room.",
      icon: Circle,
    },
    {
      tool: "ellipse-room",
      label: "Oval",
      copy: "Drag an oval room.",
      icon: Circle,
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

const modeDefaults: Record<ToolMode, DungeonStudioTool> = {
  select: "select",
  floor: "floor",
  terrain: "water",
  delete: "delete",
};

export function DungeonStudioToolPanel({
  activeTool,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
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
            label={modeLabel(mode)}
            onClick={() => onToolChange(modeDefaults[mode])}
          />
        ))}
      </div>
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
        <div className="mt-1 text-sm font-semibold text-foreground">{toolLabel(activeTool)}</div>
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
  onAddOuterWalls,
}: {
  activeTool: DungeonStudioTool;
  document: DungeonStudioDocument;
  floorCellCount: number;
  mapName: string;
  selected: DungeonStudioSelection;
  onAddOuterWalls: () => void;
}) {
  const terrainCount = document.layers
    .filter(
      (layer) =>
        layer.cellKind === "water" || layer.cellKind === "chasm" || layer.cellKind === "cliff",
    )
    .reduce((total, layer) => total + layer.cells.length, 0);
  const cliffEdgeCount = document.edges.filter((edge) => edge.kind === "cliff-edge").length;
  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title="Tool options" meta={toolLabel(activeTool)} />
      <InspectorRow label="Mode" value={modeLabel(modeForTool(activeTool))} />
      <InspectorRow label="Map record" value={mapName} />
      <InspectorRow label="Selection" value={selectionLabel(selected)} />
      <InspectorRow label="Floor cells" value={String(floorCellCount)} />
      <InspectorRow label="Terrain cells" value={String(terrainCount)} />
      <InspectorRow label="Walls / doors" value={String(document.edges.length - cliffEdgeCount)} />
      <InspectorRow label="Cliff edges" value={String(cliffEdgeCount)} />
      <InspectorRow label="Room regions" value={String(document.rooms.length)} />
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <div className="text-xs font-bold uppercase text-muted-foreground">Quick action</div>
        <Button
          type="button"
          className="mt-2 w-full"
          disabled={!floorCellCount}
          icon={Wand2}
          size="sm"
          variant="secondary"
          onClick={onAddOuterWalls}
        >
          Add outer walls
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Uses the selected shape region when available; otherwise wraps every painted floor cell.
        </p>
      </div>
      <EmptyMini copy={toolTip(activeTool)} />
    </CardSection>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
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
      {label}
    </button>
  );
}

function ToolGroupLabel({ children }: { children: string }) {
  return <div className="pt-1 text-xs font-bold uppercase text-muted-foreground">{children}</div>;
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

function modeForTool(tool: DungeonStudioTool): ToolMode {
  if (tool === "select") return "select";
  if (tool === "water" || tool === "chasm" || tool === "cliff" || tool === "cliff-edge") {
    return "terrain";
  }
  if (tool === "delete" || tool === "erase" || tool === "erase-terrain") return "delete";
  return "floor";
}

function modeLabel(mode: ToolMode) {
  switch (mode) {
    case "select":
      return "Select";
    case "floor":
      return "Floor";
    case "terrain":
      return "Terrain";
    case "delete":
      return "Delete";
  }
}

function toolLabel(tool: DungeonStudioTool) {
  switch (tool) {
    case "select":
      return "Select";
    case "floor":
      return "Floor Brush";
    case "erase":
      return "Floor Eraser";
    case "delete":
      return "Delete Brush";
    case "rectangle-room":
      return "Rectangle Room";
    case "square-room":
      return "Square Room";
    case "circle-room":
      return "Round Room";
    case "ellipse-room":
      return "Oval Room";
    case "water":
      return "Water";
    case "chasm":
      return "Chasm";
    case "cliff":
      return "Cliff Terrain";
    case "erase-terrain":
      return "Terrain Eraser";
    case "wall":
      return "Wall Edge";
    case "diagonal-wall":
      return "Diagonal Wall";
    case "door":
      return "Door";
    case "cliff-edge":
      return "Cliff Edge";
  }
}

function toolTip(tool: DungeonStudioTool) {
  switch (tool) {
    case "select":
      return "Click a cell or edge to inspect it without changing the map.";
    case "floor":
      return "Drag across grid cells to paint floor. Use this for rooms, corridors, and other walkable structure.";
    case "erase":
      return "Drag across floor cells to erase floor only. Use Delete Brush when you want terrain and touched edges removed too.";
    case "delete":
      return "Drag across cells to delete floor, terrain, and any edge features touched by those cells as one brush stroke.";
    case "rectangle-room":
      return "Click or touch a start cell, drag to preview a grid-snapped rectangle, then release to paint it as floor. Escape cancels the preview.";
    case "square-room":
      return "Click or touch a start cell, drag to preview an equal-sided grid room, then release to paint it as floor. Escape cancels the preview.";
    case "circle-room":
      return "Drag to preview a round room approximation. The result is stored as occupied floor cells, not separate geometry.";
    case "ellipse-room":
      return "Drag to preview an oval room approximation. The result is stored as occupied floor cells, not separate geometry.";
    case "water":
      return "Drag across cells to paint water terrain. Water is stored in a sparse terrain layer above floor cells.";
    case "chasm":
      return "Drag across cells to mark pits, holes, or void spaces. Chasm terrain survives save and reload.";
    case "cliff":
      return "Drag across cells to mark cliff or elevation terrain. Use Cliff Edge for the hazardous boundary line.";
    case "erase-terrain":
      return "Drag across cells to remove water, chasm, and cliff terrain without erasing the underlying floor.";
    case "wall":
      return "Click near a valid floor or terrain edge to toggle a wall. Floating walls in open space are ignored.";
    case "diagonal-wall":
      return "Click a valid floor or terrain cell to toggle the nearest diagonal wall. The editor snaps the diagonal to the grid cell.";
    case "door":
      return "Click near a valid floor or terrain edge to place a closed door. Clicking the same door removes it.";
    case "cliff-edge":
      return "Click near a valid floor or terrain edge to toggle an amber cliff boundary using the existing edge model.";
  }
}

function selectionLabel(selection: DungeonStudioSelection) {
  if (!selection) return "Nothing selected";
  if (selection.type === "cell") return `Cell ${selection.cell.x}, ${selection.cell.y}`;
  if (selection.type === "region") return `${selection.label}: ${selection.cells.length} cells`;
  return `${selection.kind} at ${selection.cell.x}, ${selection.cell.y} ${selection.direction}`;
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 font-semibold [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}
