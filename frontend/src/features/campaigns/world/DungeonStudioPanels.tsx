import {
  Circle,
  DoorOpen,
  DraftingCompass,
  Eraser,
  Grid2X2,
  Mountain,
  RectangleHorizontal,
  Slash,
  Square,
  Waves,
  Wand2,
} from "lucide-react";
import type { ElementType } from "react";
import { CardSection, SectionHeader } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";

export function DungeonStudioToolPanel({
  activeTool,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title="Tools" meta="Structure and terrain drawing" />
      <ToolGroupLabel>Paint</ToolGroupLabel>
      <ToolPill
        active={activeTool === "floor"}
        copy="Paint floor cells for rooms and corridors."
        icon={Grid2X2}
        label="Floor Brush"
        onClick={() => onToolChange("floor")}
      />
      <ToolPill
        active={activeTool === "erase"}
        copy="Erase floor cells and any room coverage on them."
        icon={Eraser}
        label="Erase Floor"
        onClick={() => onToolChange("erase")}
      />
      <ToolGroupLabel>Shape rooms</ToolGroupLabel>
      <ToolPill
        active={activeTool === "rectangle-room"}
        copy="Drag a grid-snapped rectangle for a room or area."
        icon={RectangleHorizontal}
        label="Rectangle Room"
        onClick={() => onToolChange("rectangle-room")}
      />
      <ToolPill
        active={activeTool === "square-room"}
        copy="Drag an equal-sided room footprint snapped to cells."
        icon={Square}
        label="Square Room"
        onClick={() => onToolChange("square-room")}
      />
      <ToolPill
        active={activeTool === "circle-room"}
        copy="Drag a round room approximation using occupied cells."
        icon={Circle}
        label="Round Room"
        onClick={() => onToolChange("circle-room")}
      />
      <ToolPill
        active={activeTool === "ellipse-room"}
        copy="Drag an oval room approximation using occupied cells."
        icon={Circle}
        label="Oval Room"
        onClick={() => onToolChange("ellipse-room")}
      />
      <ToolGroupLabel>Terrain</ToolGroupLabel>
      <ToolPill
        active={activeTool === "water"}
        copy="Paint water cells over floor or cave areas."
        icon={Waves}
        label="Water"
        onClick={() => onToolChange("water")}
      />
      <ToolPill
        active={activeTool === "chasm"}
        copy="Paint pits, holes, and void cells."
        icon={Circle}
        label="Chasm"
        onClick={() => onToolChange("chasm")}
      />
      <ToolPill
        active={activeTool === "cliff"}
        copy="Paint cliff or raised/lowered terrain cells."
        icon={Mountain}
        label="Cliff Terrain"
        onClick={() => onToolChange("cliff")}
      />
      <ToolPill
        active={activeTool === "erase-terrain"}
        copy="Erase water, chasm, and cliff cells without changing floors."
        icon={Eraser}
        label="Erase Terrain"
        onClick={() => onToolChange("erase-terrain")}
      />
      <ToolGroupLabel>Edges</ToolGroupLabel>
      <ToolPill
        active={activeTool === "wall"}
        copy="Click near a cell edge to toggle a wall."
        icon={DraftingCompass}
        label="Wall Edge"
        onClick={() => onToolChange("wall")}
      />
      <ToolPill
        active={activeTool === "diagonal-wall"}
        copy="Click a cell to toggle the nearest diagonal wall."
        icon={Slash}
        label="Diagonal Wall"
        onClick={() => onToolChange("diagonal-wall")}
      />
      <ToolPill
        active={activeTool === "door"}
        copy="Click an edge to place or remove a closed door."
        icon={DoorOpen}
        label="Door"
        onClick={() => onToolChange("door")}
      />
      <ToolPill
        active={activeTool === "cliff-edge"}
        copy="Click an edge to mark a dangerous cliff boundary."
        icon={Mountain}
        label="Cliff Edge"
        onClick={() => onToolChange("cliff-edge")}
      />
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
      <SectionHeader title="Inspector" meta={toolLabel(activeTool)} />
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

function ToolGroupLabel({ children }: { children: string }) {
  return <div className="pt-1 text-xs font-bold uppercase text-muted-foreground">{children}</div>;
}

function ToolPill({
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
        "rounded-md border px-3 py-2 text-left text-sm transition hover:border-accent/50",
        active ? "border-accent/40 bg-accent/10" : "border-border bg-background",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-accent" />
        {label}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{copy}</span>
    </button>
  );
}

function toolLabel(tool: DungeonStudioTool) {
  switch (tool) {
    case "floor":
      return "Floor Brush";
    case "erase":
      return "Erase Floor";
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
      return "Erase Terrain";
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
    case "floor":
      return "Drag across grid cells to paint floor. Use this for rooms, corridors, and other walkable structure.";
    case "erase":
      return "Drag across floor cells to erase them. Erasing also clears room coverage for those cells.";
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
      return "Click near the north, east, south, or west edge of a cell to toggle a wall on that edge.";
    case "diagonal-wall":
      return "Click a cell to toggle the nearest diagonal wall. The editor snaps the diagonal to the grid cell.";
    case "door":
      return "Click near an edge to place a closed door. Clicking the same door removes it.";
    case "cliff-edge":
      return "Click near an edge to toggle an amber cliff boundary using the existing edge model.";
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
