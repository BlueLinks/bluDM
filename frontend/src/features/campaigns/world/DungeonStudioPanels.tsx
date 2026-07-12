import {
  Circle,
  DoorOpen,
  DraftingCompass,
  Eraser,
  ListChecks,
  Mountain,
  Package,
  Paintbrush,
  Plus,
  Slash,
  Square,
  Trash2,
  Waves,
} from "lucide-react";
import type { ElementType } from "react";
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
import { DungeonStudioObjectPanel } from "./DungeonStudioObjectPanel";
import { DungeonStudioRoomInspector } from "./DungeonStudioRoomInspector";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { CampaignLocation } from "./travelTypes";
import type {
  DungeonStudioDocument,
  DungeonStudioEntity,
  DungeonStudioRoomRegion,
  DungeonStudioTilesetKey,
} from "./dungeonStudioDocument";
import { selectionLabel } from "./dungeonStudioPanelText";
import { dungeonStudioThemeOptions } from "./dungeonStudioThemes";
import {
  CompactOptionButton,
  OptionGroup,
  PaletteButton,
  TextOptionButton,
} from "./DungeonStudioToolButtons";
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
  onStartNewRoom?: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
};

const primaryTools: Array<ToolOption & { active: (tool: DungeonStudioTool) => boolean }> = [
  { tool: "floor", label: "Floor", icon: Paintbrush, active: (tool) => tool === "floor" },
  {
    tool: "room-select",
    label: "Room",
    icon: Square,
    active: (tool) => modeForTool(tool) === "room",
  },
  { tool: "door", label: "Door", icon: DoorOpen, active: (tool) => tool === "door" },
  {
    tool: "wall",
    label: "Wall",
    icon: DraftingCompass,
    active: (tool) => tool === "wall" || tool === "diagonal-wall",
  },
  {
    tool: "water",
    label: "Terrain",
    icon: Waves,
    active: (tool) => modeForTool(tool) === "terrain",
  },
  {
    tool: "object",
    label: "Objects",
    icon: Package,
    active: (tool) => modeForTool(tool) === "object",
  },
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
      <SectionHeader title="Tools" />
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
  onStartNewRoom,
  onToolChange,
}: ToolPanelProps) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">Active tool:</span> {toolLabel(activeTool)}
          {supportsBrushShape(activeTool) ? ` · ${brushShapeLabel(brushShape)}` : ""}
          {activeTool === "delete" ? ` · ${deleteTargetLabel(deleteTarget)}` : ""}
        </div>
        <p className="max-w-prose text-xs text-muted-foreground">{toolTip(activeTool)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Active tool options">
        {modeForTool(activeTool) === "room" ? (
          <RoomTopBarActions
            activeTool={activeTool}
            brushShape={brushShape}
            onBrushShapeChange={onBrushShapeChange}
            onStartNewRoom={onStartNewRoom}
            onToolChange={onToolChange}
          />
        ) : null}
        <ActiveToolChoices activeTool={activeTool} onToolChange={onToolChange} />
        {supportsBrushShape(activeTool) && modeForTool(activeTool) !== "room" ? (
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
        Right-click erase · Middle-drag or Alt-drag pan
      </div>
    </div>
  );
}

export function DungeonStudioInspectorPanel({
  activeTool,
  document,
  floorCellCount,
  floorLocations,
  mapName,
  roomLocations,
  selected,
  selectedEntity,
  selectedObjectAssetKey,
  selectedRoom,
  selectedRoomConnections,
  onDeleteEntity,
  onDeleteRoom,
  onDuplicateEntity,
  onEditRoom,
  onGlobalThemeChange,
  onMoveEntityToSelection,
  onObjectAssetChange,
  onObjectLinkChange,
  onRenameRoom,
  onRoomColorChange,
  onRoomThemeChange,
  onRotateEntity,
  onToolChange,
  onUploadAsset,
}: {
  activeTool: DungeonStudioTool;
  document: DungeonStudioDocument;
  floorCellCount: number;
  floorLocations: CampaignLocation[];
  mapName: string;
  roomLocations: CampaignLocation[];
  selected: DungeonStudioSelection;
  selectedEntity?: DungeonStudioEntity;
  selectedObjectAssetKey: string;
  selectedRoom?: DungeonStudioRoomRegion;
  selectedRoomConnections?: Array<{
    connectionType: string;
    room: DungeonStudioRoomRegion;
  }>;
  onDeleteEntity: (entityId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
  onEditRoom: (roomId: string) => void;
  onGlobalThemeChange: (theme: DungeonStudioTilesetKey) => void;
  onMoveEntityToSelection: (entityId: string) => void;
  onObjectAssetChange: (assetKey: string) => void;
  onObjectLinkChange: (entityId: string, linkedId: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onRoomColorChange: (roomId: string, color: string) => void;
  onRoomThemeChange: (roomId: string, theme: DungeonStudioTilesetKey | "") => void;
  onRotateEntity: (entityId: string) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUploadAsset: (file: File) => void;
}) {
  const terrainCount = terrainCellCount(document);
  const cliffEdgeCount = document.edges.filter((edge) => edge.kind === "cliff-edge").length;
  const roomCellCount = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const showRoomWorkflow =
    modeForTool(activeTool) === "room" || selectedRoom || selected?.type === "region";
  const showObjects = modeForTool(activeTool) === "object" || selected?.type === "entity";

  return (
    <CardSection className="grid content-start gap-3 xl:col-span-1">
      <SectionHeader title={showRoomWorkflow ? "Room workflow" : "Inspector"} />
      {showRoomWorkflow ? (
        <DungeonStudioRoomInspector
          activeTool={activeTool}
          rooms={document.rooms}
          roomLocations={roomLocations}
          selected={selected}
          selectedRoom={selectedRoom}
          selectedRoomConnections={selectedRoomConnections ?? []}
          onDeleteRoom={onDeleteRoom}
          onEditRoom={onEditRoom}
          onRenameRoom={onRenameRoom}
          onRoomColorChange={onRoomColorChange}
          onRoomThemeChange={onRoomThemeChange}
        />
      ) : showObjects ? (
        <DungeonStudioObjectPanel
          customAssets={document.customAssets ?? []}
          floorLocations={floorLocations}
          selectedEntity={selectedEntity}
          selectedObjectAssetKey={selectedObjectAssetKey}
          onDeleteEntity={onDeleteEntity}
          onDuplicateEntity={onDuplicateEntity}
          onMoveEntityToSelection={onMoveEntityToSelection}
          onObjectAssetChange={onObjectAssetChange}
          onObjectLinkChange={onObjectLinkChange}
          onRotateEntity={onRotateEntity}
          onToolChange={onToolChange}
          onUploadAsset={onUploadAsset}
        />
      ) : (
        <SelectionSummary selected={selected} />
      )}
      <details className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Map details
        </summary>
        <div className="mt-2 grid gap-2">
          <InspectorRow label="Mode" value={modeLabel(modeForTool(activeTool))} />
          <InspectorRow label="Map record" value={mapName} />
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Theme
            <select
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold text-foreground"
              value={document.tileset}
              onChange={(event) =>
                onGlobalThemeChange(event.target.value as DungeonStudioTilesetKey)
              }
            >
              {dungeonStudioThemeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <InspectorRow label="Floor cells" value={String(floorCellCount)} />
          <InspectorRow label="Terrain cells" value={String(terrainCount)} />
          <InspectorRow
            label="Walls / doors"
            value={String(document.edges.length - cliffEdgeCount)}
          />
          <InspectorRow label="Cliff edges" value={String(cliffEdgeCount)} />
          <InspectorRow label="Room regions" value={String(document.rooms.length)} />
          <InspectorRow label="Room cells" value={String(roomCellCount)} />
          <InspectorRow label="Objects" value={String(document.entities.length)} />
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

function RoomTopBarActions({
  activeTool,
  brushShape,
  onBrushShapeChange,
  onStartNewRoom,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onStartNewRoom?: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  const addingRoom = activeTool === "room-brush" || activeTool === "room-fill";
  if (!addingRoom) {
    return (
      <OptionGroup label="Room">
        <TextOptionButton active={false} label="Add room" onClick={() => onStartNewRoom?.()} />
      </OptionGroup>
    );
  }
  return (
    <>
      <OptionGroup label="Room">
        <TextOptionButton active label="Adding room" onClick={() => undefined} />
      </OptionGroup>
      <OptionGroup label="Brush">
        <CompactOptionButton
          active={activeTool === "room-brush" && brushShape === "single"}
          icon={Square}
          label="Single"
          onClick={() => {
            onBrushShapeChange("single");
            onToolChange("room-brush");
          }}
        />
        <CompactOptionButton
          active={activeTool === "room-brush" && brushShape === "rectangle"}
          icon={ListChecks}
          label="Rectangle"
          onClick={() => {
            onBrushShapeChange("rectangle");
            onToolChange("room-brush");
          }}
        />
        <CompactOptionButton
          active={activeTool === "room-brush" && brushShape === "circle"}
          icon={Circle}
          label="Circle"
          onClick={() => {
            onBrushShapeChange("circle");
            onToolChange("room-brush");
          }}
        />
        <CompactOptionButton
          active={activeTool === "room-fill"}
          icon={Plus}
          label="Fill"
          onClick={() => onToolChange("room-fill")}
        />
      </OptionGroup>
    </>
  );
}

function SelectionSummary({ selected }: { selected: DungeonStudioSelection }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
      <div className="font-semibold text-foreground">Selection</div>
      <div className="mt-1 text-muted-foreground">{selectionLabel(selected)}</div>
    </div>
  );
}

function toolOptionsFor(tool: DungeonStudioTool) {
  if (modeForTool(tool) === "terrain") return terrainOptions;
  if (tool === "wall" || tool === "diagonal-wall") return wallOptions;
  if (modeForTool(tool) === "delete") return deleteOptions;
  return [];
}

function toolOptionLabel(tool: DungeonStudioTool) {
  if (modeForTool(tool) === "terrain") return "Terrain type";
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
