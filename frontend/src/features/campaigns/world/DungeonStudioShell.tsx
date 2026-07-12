import { Button, Modal } from "../../../components/ui";
import type { CampaignLocation, CampaignMap } from "./travelTypes";
import { CardSection } from "../../../components/layout";
import {
  DungeonStudioInspectorPanel,
  DungeonStudioToolOptionsBar,
  DungeonStudioToolPanel,
} from "./DungeonStudioPanels";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import {
  deleteRoomRegion,
  renameRoomRegion,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioBrushShape, DungeonStudioDeleteTarget } from "./dungeonStudioBrushes";
import type {
  DungeonStudioCustomAsset,
  DungeonStudioDocument,
  DungeonStudioTilesetKey,
} from "./dungeonStudioDocument";
import { connectedStudioRoomsForRoom } from "./dungeonStudioConnectionSync";

export function DungeonStudioShell({
  activeTool,
  brushShape,
  canRedo,
  canUndo,
  deleteTarget,
  dirty,
  document,
  locationName,
  locations,
  map,
  selected,
  selectedObjectAssetKey,
  onBrushShapeChange,
  onCreateRoomLocation,
  onDeleteRoomLocation,
  onDeleteEntity,
  onDeleteTargetChange,
  onDocumentChange,
  onDuplicateEntity,
  onGlobalThemeChange,
  onMoveEntityToSelection,
  onObjectAssetChange,
  onObjectLinkChange,
  onRedo,
  onRenameRoomLocation,
  onRoomColorChange,
  onRoomThemeChange,
  onRotateEntity,
  onSelectionChange,
  onToolChange,
  onUndo,
  onUploadAsset,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  canRedo: boolean;
  canUndo: boolean;
  deleteTarget: DungeonStudioDeleteTarget;
  dirty: boolean;
  document: DungeonStudioDocument;
  locationName: string;
  locations: CampaignLocation[];
  map: CampaignMap;
  selected: DungeonStudioSelection;
  selectedObjectAssetKey: string;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onCreateRoomLocation: (roomId: string) => Promise<void>;
  onDeleteRoomLocation: (roomId: string, locationId?: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onDeleteTargetChange: (target: DungeonStudioDeleteTarget) => void;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
  onDuplicateEntity: (entityId: string) => void;
  onGlobalThemeChange: (theme: DungeonStudioTilesetKey) => void;
  onMoveEntityToSelection: (entityId: string) => void;
  onObjectAssetChange: (assetKey: string) => void;
  onObjectLinkChange: (entityId: string, linkedId: string) => void;
  onRedo: () => void;
  onRenameRoomLocation: (roomId: string, label: string) => void;
  onRoomColorChange: (roomId: string, color: string) => void;
  onRoomThemeChange: (roomId: string, theme: DungeonStudioTilesetKey | "") => void;
  onRotateEntity: (entityId: string) => void;
  onSelectionChange: (selection: DungeonStudioSelection) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUndo: () => void;
  onUploadAsset: (asset: DungeonStudioCustomAsset) => void;
}) {
  const floorCellCount = document.layers
    .filter((layer) => layer.cellKind === "floor")
    .reduce((total, layer) => total + layer.cells.length, 0);
  const roomCells = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const unassignedFloorCells = Math.max(0, floorCellCount - roomCells);
  const selectedRoom =
    selected?.type === "region" && selected.roomId
      ? document.rooms.find((room) => room.id === selected.roomId)
      : undefined;
  const selectedEntity =
    selected?.type === "entity"
      ? document.entities.find((entity) => entity.id === selected.entityId)
      : undefined;
  const roomLocations = locations.filter(
    (item) => item.parentLocationId === map.parentLocationId && item.locationType === "room",
  );
  const floorLocations = locations.filter((item) => item.locationType === "floor");
  const selectedRoomConnections = selectedRoom
    ? connectedStudioRoomsForRoom(document, selectedRoom.id)
    : [];

  function renameSelectedRoom(roomId: string, label: string) {
    const room = document.rooms.find((item) => item.id === roomId);
    if (!room) return;
    onDocumentChange((current) => renameRoomRegion(current, roomId, label), {
      type: "region",
      cells: room.cells,
      label: label.trim() || room.label,
      roomId,
    });
    onRenameRoomLocation(roomId, label);
    void onCreateRoomLocation(room.id);
    onSelectionChange({
      type: "region",
      cells: room.cells,
      label: label.trim() || room.label,
      roomId,
    });
    onToolChange("room-select");
  }

  function deleteSelectedRoom(roomId: string) {
    const room = document.rooms.find((item) => item.id === roomId);
    onDocumentChange((current) => deleteRoomRegion(current, roomId), null);
    onDeleteRoomLocation(roomId, room?.locationId);
  }

  function startNewRoom() {
    onSelectionChange(null);
    onToolChange("room-brush");
  }

  function editRoom(roomId: string) {
    const room = document.rooms.find((item) => item.id === roomId);
    if (!room) return;
    onSelectionChange({ type: "region", cells: room.cells, label: room.label, roomId: room.id });
    onToolChange("room-select");
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="min-w-0">
          <span className="font-semibold text-foreground">{locationName}</span>
          <span className="text-muted-foreground">
            {` · ${map.name} · ${document.grid.width}×${document.grid.height} · ${document.grid.cellSizeFeet} ft grid`}
          </span>
        </div>
        <span className="text-muted-foreground">Unassigned floor: {unassignedFloorCells}</span>
      </div>
      <div className="grid min-w-0 items-start gap-3 xl:grid-cols-5">
        <DungeonStudioToolPanel
          activeTool={activeTool}
          brushShape={brushShape}
          deleteTarget={deleteTarget}
          onBrushShapeChange={onBrushShapeChange}
          onDeleteTargetChange={onDeleteTargetChange}
          onToolChange={onToolChange}
        />
        <CardSection className="grid min-w-0 gap-3 xl:col-span-3">
          <DungeonStudioToolOptionsBar
            activeTool={activeTool}
            brushShape={brushShape}
            deleteTarget={deleteTarget}
            onBrushShapeChange={onBrushShapeChange}
            onDeleteTargetChange={onDeleteTargetChange}
            onStartNewRoom={startNewRoom}
            onToolChange={onToolChange}
          />
          <DungeonStudioPreview
            activeTool={activeTool}
            brushShape={brushShape}
            canRedo={canRedo}
            canUndo={canUndo}
            deleteTarget={deleteTarget}
            dirty={dirty}
            document={document}
            selected={selected}
            selectedObjectAssetKey={selectedObjectAssetKey}
            onDocumentChange={onDocumentChange}
            onRedo={onRedo}
            onUndo={onUndo}
          />
        </CardSection>
        <DungeonStudioInspectorPanel
          activeTool={activeTool}
          document={document}
          floorCellCount={floorCellCount}
          mapName={map.name}
          floorLocations={floorLocations}
          roomLocations={roomLocations}
          selected={selected}
          selectedEntity={selectedEntity}
          selectedObjectAssetKey={selectedObjectAssetKey}
          selectedRoom={selectedRoom}
          selectedRoomConnections={selectedRoomConnections}
          onDeleteEntity={onDeleteEntity}
          onDeleteRoom={deleteSelectedRoom}
          onDuplicateEntity={onDuplicateEntity}
          onEditRoom={editRoom}
          onGlobalThemeChange={onGlobalThemeChange}
          onMoveEntityToSelection={onMoveEntityToSelection}
          onObjectAssetChange={onObjectAssetChange}
          onObjectLinkChange={onObjectLinkChange}
          onRenameRoom={renameSelectedRoom}
          onRoomColorChange={onRoomColorChange}
          onRoomThemeChange={onRoomThemeChange}
          onRotateEntity={onRotateEntity}
          onToolChange={onToolChange}
          onUploadAsset={(file) => void readUploadedAsset(file, onUploadAsset)}
        />
      </div>
    </div>
  );
}

export function DungeonStudioExitPrompt({
  open,
  saving,
  onCancel,
  onDiscard,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Unsaved Dungeon Studio changes"
      onOpenChange={(nextOpen) => !nextOpen && onCancel()}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Save this dungeon map before returning to Campaign World, leave without saving, or stay in
        the studio.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel / stay
        </Button>
        <Button type="button" variant="danger" onClick={onDiscard}>
          Exit without saving
        </Button>
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save and exit"}
        </Button>
      </div>
    </Modal>
  );
}

function readUploadedAsset(file: File, onUploadAsset: (asset: DungeonStudioCustomAsset) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") return;
    onUploadAsset({
      key: `custom-${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
      label: file.name.replace(/\.[^.]+$/, ""),
      category: "custom",
      dataUrl: reader.result,
      sourceNotes: "User-uploaded campaign asset",
      licenseNotes: "Provided by the campaign user; not redistributed by bluDM.",
    });
  };
  reader.readAsDataURL(file);
}
