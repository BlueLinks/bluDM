import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { mapInputFromMap } from "./campaignWorldMapScale";
import { syncStudioRoomConnectionLinks } from "./dungeonStudioConnectionSave";
import { DungeonStudioPageView } from "./DungeonStudioPageView";
import {
  addCustomAsset,
  commitDungeonStudioChange,
  deleteObjectEntity,
  duplicateObjectEntity,
  linkRoomRegionLocation,
  moveObjectEntity,
  redoDungeonStudioChange,
  rotateObjectEntity,
  studioDocumentSignature,
  undoDungeonStudioChange,
  updateDocumentTileset,
  updateObjectEntityLink,
  updateRoomRegionColor,
  updateRoomRegionTheme,
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
import { isBlankDungeonStudioDocument } from "./dungeonStudioDocumentState";
import {
  planStudioRoomLocationSync,
  studioRoomAnchor,
  studioRoomLocationInput,
} from "./dungeonStudioLocationSync";
import { locationProfile } from "./locationProfiles";
import { useCampaignWorkspaceData } from "./useCampaignWorkspaceData";
import type { CampaignMap } from "./travelTypes";

export function DungeonStudioPage() {
  const { campaignID, locationID } = useParams();
  const navigate = useNavigate();
  const { detail, error, loading, locations, loadCampaign } = useCampaignWorkspaceData(campaignID);
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [document, setDocument] = useState<DungeonStudioDocument | null>(null);
  const documentRef = useRef<DungeonStudioDocument | null>(null);
  const syncingRoomLocationIds = useRef(new Set<string>());
  const [activeTool, setActiveTool] = useState<DungeonStudioTool>("room-select");
  const [brushShape, setBrushShape] = useState<DungeonStudioBrushShape>("rectangle");
  const [deleteTarget, setDeleteTarget] = useState<DungeonStudioDeleteTarget>("all");
  const [selected, setSelected] = useState<DungeonStudioSelection>(null);
  const [selectedObjectAssetKey, setSelectedObjectAssetKey] = useState("table");
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [studioStarted, setStudioStarted] = useState(false);
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
          setStudioStarted(!isBlankDungeonStudioDocument(parsed));
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
        setStudioStarted(false);
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
  }, [campaignID, location?.id, location?.locationType, studioAllowed]);

  useEffect(() => {
    if (!document || !map || !campaignID || !location || !studioStarted) return;
    document.rooms
      .filter((room) => !room.locationId && !syncingRoomLocationIds.current.has(room.id))
      .forEach((room) => {
        void createOrLinkRoomLocation(room.id);
      });
  }, [campaignID, document, location?.id, map?.id, studioStarted]);

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
    if (!campaignID || !map || !document) return false;
    setSaving(true);
    setStudioError("");
    try {
      const syncedDocument = await syncStudioRoomLocations(document);
      await syncStudioRoomConnections(syncedDocument);
      const metadata = serializeDungeonStudioMetadata(map.metadata, syncedDocument);
      const { map: savedMap } = await api.updateCampaignMap(
        campaignID,
        map.id,
        mapInputFromMap(map, { metadata }),
      );
      setMap(savedMap);
      documentRef.current = syncedDocument;
      setDocument(syncedDocument);
      setSavedSignature(studioDocumentSignature(syncedDocument));
      return true;
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not save Dungeon Studio map");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function syncStudioRoomConnections(currentDocument: DungeonStudioDocument) {
    if (!campaignID || !map) return;
    await syncStudioRoomConnectionLinks({
      campaignId: campaignID,
      document: currentDocument,
      mapId: map.id,
      onChanged: loadCampaign,
    });
  }

  async function syncStudioRoomLocations(currentDocument: DungeonStudioDocument) {
    if (!campaignID || !location || !map) return currentDocument;
    const plan = planStudioRoomLocationSync({
      document: currentDocument,
      locations,
      mapId: map.id,
      parentLocationId: location.id,
    });
    let nextDocument = currentDocument;

    for (const { location: roomLocation, payload } of plan.updateLocations) {
      await api.updateCampaignLocation(campaignID, roomLocation.id, payload);
    }
    for (const room of plan.createRooms) {
      const { location: createdLocation } = await api.createCampaignLocation(
        campaignID,
        studioRoomLocationInput({
          mapId: map.id,
          parentLocationId: location.id,
          room,
        }),
      );
      nextDocument = linkRoomRegionLocation(nextDocument, room.id, createdLocation.id);
    }
    for (const [roomId, locationId] of Object.entries(plan.linkRoomLocationIds)) {
      nextDocument = linkRoomRegionLocation(nextDocument, roomId, locationId);
    }
    for (const roomLocation of plan.deleteLocations) {
      await api.deleteCampaignLocation(campaignID, roomLocation.id);
    }

    if (
      plan.createRooms.length ||
      plan.updateLocations.length ||
      plan.deleteLocations.length ||
      Object.keys(plan.linkRoomLocationIds).length
    ) {
      await loadCampaign();
    }
    return nextDocument;
  }

  async function createOrLinkRoomLocation(roomId: string) {
    if (!campaignID || !location || !map) return;
    const currentDocument = documentRef.current;
    const room = currentDocument?.rooms.find((item) => item.id === roomId);
    if (!currentDocument || !room || room.locationId) return;
    syncingRoomLocationIds.current.add(roomId);
    setStudioError("");
    try {
      const managedLocation = locations.find(
        (item) =>
          item.parentLocationId === location.id &&
          item.locationType === "room" &&
          studioRoomAnchor(item, map.id)?.roomId === roomId,
      );
      if (managedLocation) {
        await api.updateCampaignLocation(
          campaignID,
          managedLocation.id,
          studioRoomLocationInput({
            existingLocation: managedLocation,
            mapId: map.id,
            parentLocationId: location.id,
            room,
          }),
        );
        await loadCampaign();
        applyDocumentChange(
          (current) => linkRoomRegionLocation(current, roomId, managedLocation.id),
          { type: "region", cells: room.cells, label: room.label, roomId },
        );
        return;
      }
      const { location: createdRoom } = await api.createCampaignLocation(
        campaignID,
        studioRoomLocationInput({
          mapId: map.id,
          parentLocationId: location.id,
          room,
        }),
      );
      await loadCampaign();
      applyDocumentChange((current) => linkRoomRegionLocation(current, roomId, createdRoom.id), {
        type: "region",
        cells: room.cells,
        label: room.label,
        roomId,
      });
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not create room location");
    } finally {
      syncingRoomLocationIds.current.delete(roomId);
    }
  }

  async function renameLinkedRoomLocation(roomId: string, label: string) {
    if (!campaignID || !location || !map) return;
    const room = documentRef.current?.rooms.find((item) => item.id === roomId);
    const linkedLocation = room?.locationId
      ? locations.find((item) => item.id === room.locationId)
      : undefined;
    if (!room || !linkedLocation) return;
    try {
      await api.updateCampaignLocation(
        campaignID,
        linkedLocation.id,
        studioRoomLocationInput({
          existingLocation: linkedLocation,
          mapId: map.id,
          parentLocationId: location.id,
          room: { ...room, label: label.trim() || room.label },
        }),
      );
      await loadCampaign();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not rename room location");
    }
  }

  async function deleteLinkedRoomLocation(roomId: string, locationId?: string) {
    if (!campaignID) return;
    const linkedLocationId =
      locationId ?? documentRef.current?.rooms.find((item) => item.id === roomId)?.locationId;
    if (!linkedLocationId) return;
    try {
      await api.deleteCampaignLocation(campaignID, linkedLocationId);
      await loadCampaign();
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not delete room location");
    }
  }

  function requestReturnToWorld() {
    if (dirty) {
      setExitPromptOpen(true);
      return;
    }
    void navigate(returnPath);
  }

  async function saveAndExit() {
    const saved = await saveStudioMetadata();
    if (saved) void navigate(returnPath);
  }

  return (
    <DungeonStudioPageView
      activeTool={activeTool}
      brushShape={brushShape}
      deleteTarget={deleteTarget}
      detail={detail}
      dirty={dirty}
      document={document}
      error={error}
      exitPromptOpen={exitPromptOpen}
      loading={loading}
      loadingStudio={loadingStudio}
      location={location}
      locations={locations}
      map={map}
      redoCount={redoStack.length}
      returnPath={returnPath}
      saving={saving}
      selected={selected}
      selectedObjectAssetKey={selectedObjectAssetKey}
      studioAllowed={studioAllowed}
      studioError={studioError}
      studioStarted={studioStarted}
      undoCount={undoStack.length}
      onAcceptGenerated={(generatedDocument) => {
        applyDocumentChange(() => generatedDocument, null);
        setStudioStarted(true);
      }}
      onBackToCampaigns={() => void navigate("/campaigns")}
      onBrushShapeChange={setBrushShape}
      onCancelExit={() => setExitPromptOpen(false)}
      onCreateRoomLocation={createOrLinkRoomLocation}
      onDeleteEntity={(entityId) =>
        applyDocumentChange((current) => deleteObjectEntity(current, entityId), null)
      }
      onDeleteRoomLocation={(roomId, locationId) =>
        void deleteLinkedRoomLocation(roomId, locationId)
      }
      onDeleteTargetChange={setDeleteTarget}
      onDiscardExit={() => void navigate(returnPath)}
      onDocumentChange={applyDocumentChange}
      onDuplicateEntity={(entityId) =>
        applyDocumentChange((current) => duplicateObjectEntity(current, entityId), {
          type: "entity",
          entityId,
        })
      }
      onGlobalThemeChange={(theme) =>
        applyDocumentChange((current) => updateDocumentTileset(current, theme), selected)
      }
      onMoveEntityToSelection={(entityId) => {
        if (selected?.type !== "cell") return;
        applyDocumentChange((current) => moveObjectEntity(current, entityId, selected.cell), {
          type: "entity",
          entityId,
        });
      }}
      onObjectAssetChange={setSelectedObjectAssetKey}
      onObjectLinkChange={(entityId, linkedId) =>
        applyDocumentChange((current) => updateObjectEntityLink(current, entityId, linkedId), {
          type: "entity",
          entityId,
        })
      }
      onRedo={redoStudioChange}
      onRenameRoomLocation={(roomId, label) => void renameLinkedRoomLocation(roomId, label)}
      onRequestReturnToWorld={requestReturnToWorld}
      onRoomColorChange={(roomId, color) => {
        const room = document?.rooms.find((item) => item.id === roomId);
        applyDocumentChange(
          (current) => updateRoomRegionColor(current, roomId, color),
          room ? { type: "region", cells: room.cells, label: room.label, roomId } : selected,
        );
      }}
      onRoomThemeChange={(roomId, theme) => {
        const room = document?.rooms.find((item) => item.id === roomId);
        applyDocumentChange(
          (current) => updateRoomRegionTheme(current, roomId, theme),
          room ? { type: "region", cells: room.cells, label: room.label, roomId } : selected,
        );
      }}
      onRotateEntity={(entityId) =>
        applyDocumentChange((current) => rotateObjectEntity(current, entityId), {
          type: "entity",
          entityId,
        })
      }
      onSave={() => void saveStudioMetadata()}
      onSaveAndExit={() => void saveAndExit()}
      onSelectionChange={setSelected}
      onStartStudio={() => setStudioStarted(true)}
      onToolChange={setActiveTool}
      onUndo={undoStudioChange}
      onUploadAsset={(asset) => {
        applyDocumentChange((current) => addCustomAsset(current, asset), selected);
        setSelectedObjectAssetKey(asset.key);
        setActiveTool("object");
      }}
    />
  );
}
