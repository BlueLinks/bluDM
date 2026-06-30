import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { CardSection } from "../../../components/layout";
import { Button, Callout, MutedPanel, Page } from "../../../components/ui";
import { api } from "../../../lib/api";
import { mapInputFromMap } from "./campaignWorldMapScale";
import {
  DungeonStudioInspectorPanel,
  DungeonStudioToolOptionsBar,
  DungeonStudioToolPanel,
} from "./DungeonStudioPanels";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import {
  commitDungeonStudioChange,
  createRoomRegion,
  deleteRoomRegion,
  nextRoomRegionId,
  renameRoomRegion,
  redoDungeonStudioChange,
  studioDocumentSignature,
  undoDungeonStudioChange,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioBrushShape, DungeonStudioDeleteTarget } from "./dungeonStudioBrushes";
import {
  createDungeonStudioDocument,
  dungeonStudioMapInput,
  parseDungeonStudioDocument,
  serializeDungeonStudioMetadata,
  studioMapForLocation,
  studioScopeForLocation,
  type DungeonStudioDocument,
} from "./dungeonStudioDocument";
import { locationProfile } from "./locationProfiles";
import { useCampaignWorkspaceData } from "./useCampaignWorkspaceData";
import type { CampaignMap } from "./travelTypes";

export function DungeonStudioPage() {
  const { campaignID, locationID } = useParams();
  const navigate = useNavigate();
  const { detail, error, loading, locations } = useCampaignWorkspaceData(campaignID);
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [document, setDocument] = useState<DungeonStudioDocument | null>(null);
  const documentRef = useRef<DungeonStudioDocument | null>(null);
  const [activeTool, setActiveTool] = useState<DungeonStudioTool>("select");
  const [brushShape, setBrushShape] = useState<DungeonStudioBrushShape>("single");
  const [deleteTarget, setDeleteTarget] = useState<DungeonStudioDeleteTarget>("all");
  const [selected, setSelected] = useState<DungeonStudioSelection>(null);
  const [undoStack, setUndoStack] = useState<DungeonStudioDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DungeonStudioDocument[]>([]);
  const undoStackRef = useRef<DungeonStudioDocument[]>([]);
  const redoStackRef = useRef<DungeonStudioDocument[]>([]);
  const [savedSignature, setSavedSignature] = useState("");
  const [loadingStudio, setLoadingStudio] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studioError, setStudioError] = useState("");
  const location = useMemo(
    () => locations.find((item) => item.id === locationID),
    [locationID, locations],
  );
  const profile = location ? locationProfile(location) : null;
  const studioAllowed = profile?.variant === "dungeon" || profile?.variant === "floor";
  const returnPath =
    campaignID && locationID
      ? `/campaigns/${campaignID}/world/location/${locationID}`
      : "/campaigns";

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  useEffect(() => {
    if (!campaignID || !location || !studioAllowed) return;
    const activeCampaignId = campaignID;
    const activeLocation = location;
    let active = true;
    async function loadOrCreateStudioMap() {
      setLoadingStudio(true);
      setStudioError("");
      try {
        const { maps: nextMaps } = await api.campaignMaps(activeCampaignId);
        if (!active) return;
        const existingMap = studioMapForLocation(nextMaps, activeLocation.id);
        if (existingMap) {
          const parsed = parseDungeonStudioDocument(existingMap.metadata, {
            scope: studioScopeForLocation(activeLocation),
          });
          setMap(existingMap);
          documentRef.current = parsed;
          setDocument(parsed);
          setSavedSignature(studioDocumentSignature(parsed));
          setUndoStack([]);
          setRedoStack([]);
          setSelected(null);
          return;
        }
        const starterDocument = createDungeonStudioDocument({
          scope: studioScopeForLocation(activeLocation),
        });
        const { map: createdMap } = await api.createCampaignMap(
          activeCampaignId,
          dungeonStudioMapInput(activeLocation, starterDocument),
        );
        if (!active) return;
        setMap(createdMap);
        documentRef.current = starterDocument;
        setDocument(starterDocument);
        setSavedSignature(studioDocumentSignature(starterDocument));
        setUndoStack([]);
        setRedoStack([]);
        setSelected(null);
      } catch (err) {
        if (active)
          setStudioError(err instanceof Error ? err.message : "Could not open Dungeon Studio");
      } finally {
        if (active) setLoadingStudio(false);
      }
    }
    void loadOrCreateStudioMap();
    return () => {
      active = false;
    };
  }, [campaignID, location, studioAllowed]);

  const dirty = document ? studioDocumentSignature(document) !== savedSignature : false;

  function applyDocumentChange(
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) {
    const current = documentRef.current;
    setSelected(selection);
    if (!current) return;
    const result = commitDungeonStudioChange(
      current,
      update,
      {
        undoStack: undoStackRef.current,
        redoStack: redoStackRef.current,
      },
      50,
      options,
    );
    if (!result.changed) return;
    documentRef.current = result.document;
    undoStackRef.current = result.undoStack;
    redoStackRef.current = result.redoStack;
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    setDocument(result.document);
  }

  function undoStudioChange() {
    const current = documentRef.current;
    if (!current) return;
    const result = undoDungeonStudioChange(current, {
      undoStack: undoStackRef.current,
      redoStack: redoStackRef.current,
    });
    if (!result.changed) return;
    documentRef.current = result.document;
    undoStackRef.current = result.undoStack;
    redoStackRef.current = result.redoStack;
    setDocument(result.document);
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    setSelected(null);
  }

  function redoStudioChange() {
    const current = documentRef.current;
    if (!current) return;
    const result = redoDungeonStudioChange(current, {
      undoStack: undoStackRef.current,
      redoStack: redoStackRef.current,
    });
    if (!result.changed) return;
    documentRef.current = result.document;
    undoStackRef.current = result.undoStack;
    redoStackRef.current = result.redoStack;
    setDocument(result.document);
    setUndoStack(result.undoStack);
    setRedoStack(result.redoStack);
    setSelected(null);
  }

  async function saveStudioMetadata() {
    if (!campaignID || !map || !document) return;
    setSaving(true);
    setStudioError("");
    try {
      const metadata = serializeDungeonStudioMetadata(map.metadata, document);
      const { map: savedMap } = await api.updateCampaignMap(
        campaignID,
        map.id,
        mapInputFromMap(map, { metadata }),
      );
      setMap(savedMap);
      setSavedSignature(studioDocumentSignature(document));
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not save Dungeon Studio map");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <MutedPanel>Loading Dungeon Studio...</MutedPanel>;
  if (error && !detail) {
    return (
      <Page>
        <Callout tone="danger">{error}</Callout>
        <Button variant="secondary" onClick={() => void navigate("/campaigns")}>
          Back to campaigns
        </Button>
      </Page>
    );
  }
  if (!detail) return null;

  return (
    <Page className="2xl:px-2">
      <BackButton to={returnPath}>Back to World</BackButton>
      <Breadcrumbs
        items={[
          { label: "Campaigns", to: "/campaigns" },
          { label: detail.campaign.name, to: `/campaigns/${detail.campaign.id}` },
          { label: "World", to: `/campaigns/${detail.campaign.id}/world` },
          location ? { label: location.name, to: returnPath } : { label: "Location" },
          { label: "Dungeon Studio" },
        ]}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-normal">Dungeon Studio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the grid map for {location?.name ?? "this location"}.
          </p>
        </div>
        <Link to={returnPath}>
          <Button type="button" icon={ArrowLeft} variant="secondary">
            Return to World
          </Button>
        </Link>
      </div>
      {studioError ? <Callout tone="danger">{studioError}</Callout> : null}
      {!location ? (
        <Callout tone="danger">This World location could not be found.</Callout>
      ) : !studioAllowed ? (
        <Callout>
          Dungeon Studio is available for Dungeon and Floor locations. Return to World and choose a
          dungeon or floor profile.
        </Callout>
      ) : loadingStudio || !document || !map ? (
        <MutedPanel>Preparing the studio map…</MutedPanel>
      ) : (
        <DungeonStudioShell
          activeTool={activeTool}
          brushShape={brushShape}
          canRedo={redoStack.length > 0}
          canUndo={undoStack.length > 0}
          deleteTarget={deleteTarget}
          dirty={dirty}
          document={document}
          locationName={location.name}
          map={map}
          saving={saving}
          selected={selected}
          onDocumentChange={applyDocumentChange}
          onSave={() => void saveStudioMetadata()}
          onBrushShapeChange={setBrushShape}
          onDeleteTargetChange={setDeleteTarget}
          onRedo={redoStudioChange}
          onSelectionChange={setSelected}
          onToolChange={setActiveTool}
          onUndo={undoStudioChange}
        />
      )}
    </Page>
  );
}

function DungeonStudioShell({
  activeTool,
  brushShape,
  canRedo,
  canUndo,
  deleteTarget,
  dirty,
  document,
  locationName,
  map,
  saving,
  selected,
  onBrushShapeChange,
  onDeleteTargetChange,
  onDocumentChange,
  onRedo,
  onSave,
  onSelectionChange,
  onToolChange,
  onUndo,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  canRedo: boolean;
  canUndo: boolean;
  deleteTarget: DungeonStudioDeleteTarget;
  dirty: boolean;
  document: DungeonStudioDocument;
  locationName: string;
  map: CampaignMap;
  saving: boolean;
  selected: DungeonStudioSelection;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onDeleteTargetChange: (target: DungeonStudioDeleteTarget) => void;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
  onRedo: () => void;
  onSave: () => void;
  onSelectionChange: (selection: DungeonStudioSelection) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUndo: () => void;
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

  function createRoomFromSelection() {
    if (selected?.type !== "region" || selected.roomId) return;
    const roomId = nextRoomRegionId(document);
    const label = `Room ${document.rooms.length + 1}`;
    onDocumentChange((current) => createRoomRegion(current, selected.cells, roomId), {
      type: "region",
      cells: selected.cells,
      label,
      roomId,
    });
  }

  function renameSelectedRoom(roomId: string, label: string) {
    const room = document.rooms.find((item) => item.id === roomId);
    if (!room) return;
    onDocumentChange((current) => renameRoomRegion(current, roomId, label), {
      type: "region",
      cells: room.cells,
      label: label.trim() || room.label,
      roomId,
    });
  }

  function deleteSelectedRoom(roomId: string) {
    onDocumentChange((current) => deleteRoomRegion(current, roomId), null);
  }

  function finishRoomEditing() {
    onSelectionChange(null);
  }

  function startNewRoom() {
    onSelectionChange(null);
    onToolChange("room-select");
  }

  function editRoom(roomId: string) {
    const room = document.rooms.find((item) => item.id === roomId);
    if (!room) return;
    onSelectionChange({ type: "region", cells: room.cells, label: room.label, roomId: room.id });
    onToolChange("room-brush");
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
            saving={saving}
            selected={selected}
            onDocumentChange={onDocumentChange}
            onRedo={onRedo}
            onSave={onSave}
            onUndo={onUndo}
          />
        </CardSection>
        <DungeonStudioInspectorPanel
          activeTool={activeTool}
          document={document}
          floorCellCount={floorCellCount}
          mapName={map.name}
          selected={selected}
          selectedRoom={selectedRoom}
          onCreateRoomFromSelection={createRoomFromSelection}
          onDeleteRoom={deleteSelectedRoom}
          onDoneRoom={finishRoomEditing}
          onEditRoom={editRoom}
          onRenameRoom={renameSelectedRoom}
          onStartNewRoom={startNewRoom}
          onToolChange={onToolChange}
        />
      </div>
    </div>
  );
}
