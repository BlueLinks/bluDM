import { ArrowLeft, DoorOpen, DraftingCompass, Eraser, Grid2X2, Save, Slash } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import {
  Badge,
  Button,
  Callout,
  EmptyMini,
  MutedPanel,
  Page,
  PageHeader,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import { mapInputFromMap } from "./campaignWorldMapScale";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import {
  sameStudioDocument,
  studioDocumentSignature,
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
  const [activeTool, setActiveTool] = useState<DungeonStudioTool>("floor");
  const [selected, setSelected] = useState<DungeonStudioSelection>(null);
  const [undoStack, setUndoStack] = useState<DungeonStudioDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DungeonStudioDocument[]>([]);
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
  ) {
    const current = documentRef.current;
    setSelected(selection);
    if (!current) return;
    const nextDocument = update(current);
    if (sameStudioDocument(current, nextDocument)) return;
    documentRef.current = nextDocument;
    setUndoStack((currentUndoStack) => [...currentUndoStack, current].slice(-50));
    setRedoStack([]);
    setDocument(nextDocument);
  }

  function undoStudioChange() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    const current = documentRef.current;
    if (current) setRedoStack((items) => [current, ...items].slice(0, 50));
    documentRef.current = previous;
    setDocument(previous);
    setUndoStack((items) => items.slice(0, -1));
    setSelected(null);
  }

  function redoStudioChange() {
    const next = redoStack[0];
    if (!next) return;
    const current = documentRef.current;
    if (current) setUndoStack((items) => [...items, current].slice(-50));
    documentRef.current = next;
    setDocument(next);
    setRedoStack((items) => items.slice(1));
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
  ) => void;
  onRedo: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUndo: () => void;
}) {
  const floorCells = document.layers
    .filter((layer) => layer.cellKind === "floor")
    .reduce((total, layer) => total + layer.cells.length, 0);
  const roomCells = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const unassignedFloorCells = Math.max(0, floorCells - roomCells);
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
        <CardSection className="grid content-start gap-3 xl:col-span-1">
          <SectionHeader title="Tools" meta="Structure drawing" />
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
        </CardSection>
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
        <CardSection className="grid content-start gap-3 xl:col-span-1">
          <SectionHeader title="Inspector" meta={toolLabel(activeTool)} />
          <InspectorRow label="Map record" value={map.name} />
          <InspectorRow label="Selection" value={selectionLabel(selected)} />
          <InspectorRow label="Floor cells" value={String(floorCells)} />
          <InspectorRow label="Walls / doors" value={String(document.edges.length)} />
          <InspectorRow label="Room regions" value={String(document.rooms.length)} />
          <EmptyMini copy={toolTip(activeTool)} />
        </CardSection>
      </div>
      <CardSection tone="background">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <ActionRow>
            <Badge>Floor layer ✓</Badge>
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
    case "wall":
      return "Wall Edge";
    case "diagonal-wall":
      return "Diagonal Wall";
    case "door":
      return "Door";
  }
}

function toolTip(tool: DungeonStudioTool) {
  switch (tool) {
    case "floor":
      return "Drag across grid cells to paint floor. Use this for rooms, corridors, and other walkable structure.";
    case "erase":
      return "Drag across floor cells to erase them. Erasing also clears room coverage for those cells.";
    case "wall":
      return "Click near the north, east, south, or west edge of a cell to toggle a wall on that edge.";
    case "diagonal-wall":
      return "Click a cell to toggle the nearest diagonal wall. The editor snaps the diagonal to the grid cell.";
    case "door":
      return "Click near an edge to place a closed door. Clicking the same door removes it.";
  }
}

function selectionLabel(selection: DungeonStudioSelection) {
  if (!selection) return "Nothing selected";
  if (selection.type === "cell") return `Cell ${selection.cell.x}, ${selection.cell.y}`;
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
