import { ArrowLeft, DraftingCompass, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Badge, Button, Callout, MutedPanel, Page, PageHeader } from "../../../components/ui";
import { api } from "../../../lib/api";
import { mapInputFromMap } from "./campaignWorldMapScale";
import { DungeonStudioInspectorPanel, DungeonStudioToolPanel } from "./DungeonStudioPanels";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import {
  addOuterWallsAroundFloorCells,
  commitDungeonStudioChange,
  createRoomRegion,
  deleteRoomRegion,
  floorCells as studioFloorCells,
  nextRoomRegionId,
  renameRoomRegion,
  redoDungeonStudioChange,
  studioDocumentSignature,
  undoDungeonStudioChange,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
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
  const [maps, setMaps] = useState<CampaignMap[]>([]);
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [document, setDocument] = useState<DungeonStudioDocument | null>(null);
  const documentRef = useRef<DungeonStudioDocument | null>(null);
  const [activeTool, setActiveTool] = useState<DungeonStudioTool>("select");
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
        setMaps(nextMaps);
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
        setMaps([...nextMaps, createdMap]);
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
      setMaps((current) => current.map((item) => (item.id === savedMap.id ? savedMap : item)));
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
      <PageHeader
        eyebrow="Campaign World"
        title="Dungeon Studio"
        copy="Sketch grid-based dungeon structure from the location context, then bind rooms and prep back to Campaign World."
        action={
          <ActionRow justify="end">
            <Link to={returnPath}>
              <Button type="button" icon={ArrowLeft} variant="secondary">
                Return to World
              </Button>
            </Link>
            <Button
              type="button"
              icon={Save}
              disabled={!document || !map || saving || !dirty}
              onClick={() => void saveStudioMetadata()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </ActionRow>
        }
      />
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
          canRedo={redoStack.length > 0}
          canUndo={undoStack.length > 0}
          dirty={dirty}
          document={document}
          locationName={location.name}
          map={map}
          maps={maps}
          selected={selected}
          onDocumentChange={applyDocumentChange}
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
  canRedo,
  canUndo,
  dirty,
  document,
  locationName,
  map,
  maps,
  selected,
  onDocumentChange,
  onRedo,
  onSelectionChange,
  onToolChange,
  onUndo,
}: {
  activeTool: DungeonStudioTool;
  canRedo: boolean;
  canUndo: boolean;
  dirty: boolean;
  document: DungeonStudioDocument;
  locationName: string;
  map: CampaignMap;
  maps: CampaignMap[];
  selected: DungeonStudioSelection;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
  onRedo: () => void;
  onSelectionChange: (selection: DungeonStudioSelection) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUndo: () => void;
}) {
  const floorCellCount = document.layers
    .filter((layer) => layer.cellKind === "floor")
    .reduce((total, layer) => total + layer.cells.length, 0);
  const selectedRegionCells = selected?.type === "region" ? selected.cells : undefined;
  const terrainCellCount = document.layers
    .filter(
      (layer) =>
        layer.cellKind === "water" || layer.cellKind === "chasm" || layer.cellKind === "cliff",
    )
    .reduce((total, layer) => total + layer.cells.length, 0);
  const cliffEdgeCount = document.edges.filter((edge) => edge.kind === "cliff-edge").length;
  const roomCells = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const unassignedFloorCells = Math.max(0, floorCellCount - roomCells);
  const selectedRoom =
    selected?.type === "region" && selected.roomId
      ? document.rooms.find((room) => room.id === selected.roomId)
      : undefined;

  function addOuterWalls() {
    const wrappedCells = selectedRegionCells?.length
      ? selectedRegionCells
      : studioFloorCells(document);
    onDocumentChange(
      (current) => addOuterWallsAroundFloorCells(current, selectedRegionCells),
      wrappedCells.length
        ? { type: "region", cells: wrappedCells, label: "Outer wall region" }
        : selected,
    );
  }

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

  return (
    <div className="grid min-w-0 gap-4">
      <CardSection tone="background" className="p-4">
        <SectionHeader
          icon={DraftingCompass}
          title={locationName}
          meta={`${map.name} • ${document.tileset} tileset • ${document.grid.width}×${document.grid.height} • ${document.grid.cellSizeFeet} ft grid`}
          action={
            <Badge tone={dirty ? "default" : "friendly"}>
              {dirty ? "Unsaved changes" : "Saved"}
            </Badge>
          }
        />
      </CardSection>
      <div className="grid min-w-0 gap-4 xl:grid-cols-4">
        <DungeonStudioToolPanel activeTool={activeTool} onToolChange={onToolChange} />
        <CardSection className="grid min-w-0 gap-3 xl:col-span-2">
          <SectionHeader title="Canvas" meta="Paint cells, click edges, zoom, undo, and redo" />
          <DungeonStudioPreview
            activeTool={activeTool}
            canRedo={canRedo}
            canUndo={canUndo}
            dirty={dirty}
            document={document}
            selected={selected}
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
          selected={selected}
          selectedRoom={selectedRoom}
          onAddOuterWalls={addOuterWalls}
          onCreateRoomFromSelection={createRoomFromSelection}
          onDeleteRoom={deleteSelectedRoom}
          onDoneRoom={finishRoomEditing}
          onRenameRoom={renameSelectedRoom}
          onStartNewRoom={startNewRoom}
        />
      </div>
      <CardSection tone="background">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <ActionRow>
            <Badge>Floor layer ✓</Badge>
            <Badge>Terrain {terrainCellCount ? `${terrainCellCount} cells` : "ready"}</Badge>
            <Badge>Cliff edges {cliffEdgeCount ? cliffEdgeCount : "ready"}</Badge>
            <Badge>Walls ✓</Badge>
            <Badge>Rooms ✓</Badge>
            <Badge>{maps.length} campaign maps loaded</Badge>
          </ActionRow>
          <span className="font-semibold">Unassigned floor: {unassignedFloorCells} cells</span>
        </div>
      </CardSection>
    </div>
  );
}
