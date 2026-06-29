import {
  Circle,
  DoorOpen,
  DraftingCompass,
  Eraser,
  Mountain,
  MousePointer2,
  PaintBucket,
  Paintbrush,
  Slash,
  Square,
  Trash2,
  Waves,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { CardSection, SectionHeader } from "../../../components/layout";
import {
  brushShapeLabel,
  brushShapeOptions,
  deleteTargetLabel,
  deleteTargetOptions,
  supportsBrushShape,
  type DungeonStudioBrushShape,
  type DungeonStudioDeleteTarget,
} from "./dungeonStudioBrushes";
import { InspectorRow } from "./DungeonStudioInspectorRow";
import { DungeonStudioRoomInspector } from "./DungeonStudioRoomInspector";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioDocument, DungeonStudioRoomRegion } from "./dungeonStudioDocument";
import { selectionLabel } from "./dungeonStudioPanelText";
import { modeForTool, modeLabel, toolLabel, toolTip } from "./dungeonStudioToolText";

type ToolOption = {
  tool: DungeonStudioTool;
  label: string;
  icon: ElementType;
};

type ToolPanelProps = {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  deleteTarget: DungeonStudioDeleteTarget;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onDeleteTargetChange: (target: DungeonStudioDeleteTarget) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
};

const primaryTools: Array<ToolOption & { active: (tool: DungeonStudioTool) => boolean }> = [
  { tool: "select", label: "Select", icon: MousePointer2, active: (tool) => tool === "select" },
  { tool: "floor", label: "Floor", icon: Paintbrush, active: (tool) => tool === "floor" },
  {
    tool: "water",
    label: "Terrain",
    icon: Waves,
    active: (tool) => modeForTool(tool) === "terrain",
  },
  {
    tool: "room-select",
    label: "Room",
    icon: Square,
    active: (tool) => modeForTool(tool) === "room",
  },
  {
    tool: "wall",
    label: "Wall",
    icon: DraftingCompass,
    active: (tool) => tool === "wall" || tool === "diagonal-wall",
  },
  { tool: "door", label: "Door", icon: DoorOpen, active: (tool) => tool === "door" },
  {
    tool: "delete",
    label: "Delete",
    icon: Trash2,
    active: (tool) => modeForTool(tool) === "delete",
  },
];

const terrainOptions: ToolOption[] = [
  { tool: "water", label: "Water", icon: Waves },
  { tool: "chasm", label: "Chasm", icon: Circle },
  { tool: "cliff", label: "Cliff", icon: Mountain },
  { tool: "cliff-edge", label: "Cliff edge", icon: Mountain },
];

const roomOptions: ToolOption[] = [
  { tool: "room-select", label: "Select cells", icon: Square },
  { tool: "room-brush", label: "Paint", icon: Paintbrush },
  { tool: "room-fill", label: "Fill", icon: PaintBucket },
  { tool: "erase-room", label: "Erase", icon: Eraser },
];

const wallOptions: ToolOption[] = [
  { tool: "wall", label: "Straight wall", icon: DraftingCompass },
  { tool: "diagonal-wall", label: "Diagonal wall", icon: Slash },
];

const deleteOptions: ToolOption[] = [
  { tool: "delete", label: "Targeted delete", icon: Trash2 },
  { tool: "erase", label: "Floor-only eraser", icon: Eraser },
  { tool: "erase-terrain", label: "Terrain-only eraser", icon: Eraser },
];

export function DungeonStudioToolPanel({ activeTool, onToolChange }: ToolPanelProps) {
  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title="Tools" meta="What am I editing?" />
      <div className="grid gap-2" aria-label="Dungeon Studio primary tools">
        {primaryTools.map((tool) => (
          <PaletteButton
            key={tool.label}
            active={tool.active(activeTool)}
            icon={tool.icon}
            label={tool.label}
            onClick={() => onToolChange(tool.tool)}
          />
        ))}
      </div>
    </CardSection>
  );
}

export function DungeonStudioToolOptionsBar({
  activeTool,
  brushShape,
  deleteTarget,
  onBrushShapeChange,
  onDeleteTargetChange,
  onToolChange,
}: ToolPanelProps) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">Active tool</div>
          <div className="text-sm font-semibold text-foreground">
            {toolLabel(activeTool)}
            {supportsBrushShape(activeTool) ? ` • ${brushShapeLabel(brushShape)}` : ""}
            {activeTool === "delete" ? ` • ${deleteTargetLabel(deleteTarget)}` : ""}
          </div>
        </div>
        <p className="max-w-prose text-xs text-muted-foreground">{toolTip(activeTool)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Active tool options">
        <ActiveToolChoices activeTool={activeTool} onToolChange={onToolChange} />
        {supportsBrushShape(activeTool) ? (
          <OptionGroup label="Brush shape">
            {brushShapeOptions.map((option) => (
              <CompactOptionButton
                key={option.shape}
                active={brushShape === option.shape}
                icon={option.icon}
                label={option.label}
                onClick={() => onBrushShapeChange(option.shape)}
              />
            ))}
          </OptionGroup>
        ) : null}
        {activeTool === "delete" ? (
          <OptionGroup label="Delete target">
            {deleteTargetOptions.map((option) => (
              <TextOptionButton
                key={option.target}
                active={deleteTarget === option.target}
                label={option.label}
                onClick={() => onDeleteTargetChange(option.target)}
              />
            ))}
          </OptionGroup>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">
        Right-click erases the safe matching target for the active tool. Alt-drag pans the canvas.
      </div>
    </div>
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
  onEditRoom,
  onRenameRoom,
  onStartNewRoom,
  onToolChange,
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
  onEditRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onStartNewRoom: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  const terrainCount = terrainCellCount(document);
  const cliffEdgeCount = document.edges.filter((edge) => edge.kind === "cliff-edge").length;
  const roomCellCount = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const showRoomWorkflow =
    modeForTool(activeTool) === "room" || selectedRoom || selected?.type === "region";
  const canCreateRoom =
    selected?.type === "region" && !selected.roomId && selected.cells.length > 0;

  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader
        title={showRoomWorkflow ? "Room workflow" : "Inspector"}
        meta={showRoomWorkflow ? "What room am I editing?" : selectionLabel(selected)}
      />
      {showRoomWorkflow ? (
        <DungeonStudioRoomInspector
          activeTool={activeTool}
          canCreateRoom={canCreateRoom}
          rooms={document.rooms}
          selected={selected}
          selectedRoom={selectedRoom}
          onCreateRoomFromSelection={onCreateRoomFromSelection}
          onDeleteRoom={onDeleteRoom}
          onDoneRoom={onDoneRoom}
          onEditRoom={onEditRoom}
          onRenameRoom={onRenameRoom}
          onStartNewRoom={onStartNewRoom}
          onToolChange={onToolChange}
        />
      ) : (
        <SelectionSummary selected={selected} />
      )}
      <details className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground">
          Map details
        </summary>
        <div className="mt-2 grid gap-2">
          <InspectorRow label="Mode" value={modeLabel(modeForTool(activeTool))} />
          <InspectorRow label="Map record" value={mapName} />
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
    </CardSection>
  );
}

function ActiveToolChoices({
  activeTool,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  const options = toolOptionsFor(activeTool);
  if (!options.length) return null;
  return (
    <OptionGroup label={toolOptionLabel(activeTool)}>
      {options.map((option) => (
        <CompactOptionButton
          key={option.tool}
          active={activeTool === option.tool}
          icon={option.icon}
          label={option.label}
          onClick={() => onToolChange(option.tool)}
        />
      ))}
    </OptionGroup>
  );
}

function SelectionSummary({ selected }: { selected: DungeonStudioSelection }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
      <div className="text-xs font-bold uppercase">Selection</div>
      <div className="mt-1 font-semibold text-foreground">{selectionLabel(selected)}</div>
      <p className="mt-1 text-xs">
        Use Select to inspect, or choose a drawing tool and work directly on the canvas.
      </p>
    </div>
  );
}

function OptionGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
      <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function PaletteButton({
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
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </span>
    </button>
  );
}

function CompactOptionButton({
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
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TextOptionButton({
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
        "rounded-md border px-2 py-1 text-xs font-semibold transition hover:border-accent/50",
        active
          ? "border-accent/40 bg-accent/10 text-foreground"
          : "border-border text-muted-foreground",
      ].join(" ")}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function toolOptionsFor(tool: DungeonStudioTool) {
  if (modeForTool(tool) === "terrain") return terrainOptions;
  if (modeForTool(tool) === "room") return roomOptions;
  if (tool === "wall" || tool === "diagonal-wall") return wallOptions;
  if (modeForTool(tool) === "delete") return deleteOptions;
  return [];
}

function toolOptionLabel(tool: DungeonStudioTool) {
  if (modeForTool(tool) === "terrain") return "Terrain type";
  if (modeForTool(tool) === "room") return "Room action";
  if (tool === "wall" || tool === "diagonal-wall") return "Wall type";
  if (modeForTool(tool) === "delete") return "Erase mode";
  return "Options";
}

function terrainCellCount(document: DungeonStudioDocument) {
  return document.layers
    .filter(
      (layer) =>
        layer.cellKind === "water" || layer.cellKind === "chasm" || layer.cellKind === "cliff",
    )
    .reduce((total, layer) => total + layer.cells.length, 0);
}
