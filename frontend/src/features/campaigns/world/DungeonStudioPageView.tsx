import { ArrowLeft, Save } from "lucide-react";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { Button, Callout, MutedPanel, Page } from "../../../components/ui";
import type { CampaignDetail } from "../../../types";
import { DungeonStudioExitPrompt, DungeonStudioShell } from "./DungeonStudioShell";
import { DungeonStudioStartScreen } from "./DungeonStudioStartScreen";
import type { DungeonStudioBrushShape, DungeonStudioDeleteTarget } from "./dungeonStudioBrushes";
import type {
  DungeonStudioCustomAsset,
  DungeonStudioDocument,
  DungeonStudioTilesetKey,
} from "./dungeonStudioDocument";
import { isBlankDungeonStudioDocument } from "./dungeonStudioDocumentState";
import {
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { CampaignLocation, CampaignMap } from "./travelTypes";

type ApplyDocumentChange = (
  update: (current: DungeonStudioDocument) => DungeonStudioDocument,
  selection: DungeonStudioSelection,
  options?: DungeonStudioChangeOptions,
) => void;

export function DungeonStudioPageView({
  activeTool,
  brushShape,
  deleteTarget,
  detail,
  dirty,
  document,
  error,
  exitPromptOpen,
  loading,
  loadingStudio,
  location,
  locations,
  map,
  redoCount,
  returnPath,
  saving,
  selected,
  selectedObjectAssetKey,
  studioAllowed,
  studioError,
  studioStarted,
  undoCount,
  onAcceptGenerated,
  onBackToCampaigns,
  onBrushShapeChange,
  onCancelExit,
  onCreateRoomLocation,
  onDeleteEntity,
  onDeleteRoomLocation,
  onDeleteTargetChange,
  onDiscardExit,
  onDocumentChange,
  onDuplicateEntity,
  onGlobalThemeChange,
  onMoveEntityToSelection,
  onObjectAssetChange,
  onObjectLinkChange,
  onRedo,
  onRenameRoomLocation,
  onRequestReturnToWorld,
  onRoomColorChange,
  onRoomThemeChange,
  onRotateEntity,
  onSave,
  onSaveAndExit,
  onSelectionChange,
  onStartStudio,
  onToolChange,
  onUndo,
  onUploadAsset,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  deleteTarget: DungeonStudioDeleteTarget;
  detail: CampaignDetail | null;
  dirty: boolean;
  document: DungeonStudioDocument | null;
  error: string;
  exitPromptOpen: boolean;
  loading: boolean;
  loadingStudio: boolean;
  location: CampaignLocation | undefined;
  locations: CampaignLocation[];
  map: CampaignMap | null;
  redoCount: number;
  returnPath: string;
  saving: boolean;
  selected: DungeonStudioSelection;
  selectedObjectAssetKey: string;
  studioAllowed: boolean;
  studioError: string;
  studioStarted: boolean;
  undoCount: number;
  onAcceptGenerated: (document: DungeonStudioDocument) => void;
  onBackToCampaigns: () => void;
  onBrushShapeChange: (shape: DungeonStudioBrushShape) => void;
  onCancelExit: () => void;
  onCreateRoomLocation: (roomId: string) => Promise<void>;
  onDeleteEntity: (entityId: string) => void;
  onDeleteRoomLocation: (roomId: string, locationId?: string) => void;
  onDeleteTargetChange: (target: DungeonStudioDeleteTarget) => void;
  onDiscardExit: () => void;
  onDocumentChange: ApplyDocumentChange;
  onDuplicateEntity: (entityId: string) => void;
  onGlobalThemeChange: (theme: DungeonStudioTilesetKey) => void;
  onMoveEntityToSelection: (entityId: string) => void;
  onObjectAssetChange: (assetKey: string) => void;
  onObjectLinkChange: (entityId: string, linkedId: string) => void;
  onRedo: () => void;
  onRenameRoomLocation: (roomId: string, label: string) => void;
  onRequestReturnToWorld: () => void;
  onRoomColorChange: (roomId: string, color: string) => void;
  onRoomThemeChange: (roomId: string, theme: DungeonStudioTilesetKey | "") => void;
  onRotateEntity: (entityId: string) => void;
  onSave: () => void;
  onSaveAndExit: () => void;
  onSelectionChange: (selection: DungeonStudioSelection) => void;
  onStartStudio: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUndo: () => void;
  onUploadAsset: (asset: DungeonStudioCustomAsset) => void;
}) {
  if (loading) return <MutedPanel>Loading Dungeon Studio...</MutedPanel>;
  if (error && !detail) {
    return (
      <Page>
        <Callout tone="danger">{error}</Callout>
        <Button variant="secondary" onClick={onBackToCampaigns}>
          Back to campaigns
        </Button>
      </Page>
    );
  }
  if (!detail) return null;

  const studioContent = (
    <>
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
      ) : !studioStarted && isBlankDungeonStudioDocument(document) ? (
        <DungeonStudioStartScreen
          campaignId={detail.campaign.id}
          locationName={location.name}
          onStartCustom={onStartStudio}
          onAcceptGenerated={onAcceptGenerated}
        />
      ) : (
        <DungeonStudioShell
          activeTool={activeTool}
          brushShape={brushShape}
          canRedo={redoCount > 0}
          canUndo={undoCount > 0}
          deleteTarget={deleteTarget}
          dirty={dirty}
          document={document}
          locationName={location.name}
          locations={locations}
          map={map}
          selected={selected}
          selectedObjectAssetKey={selectedObjectAssetKey}
          onBrushShapeChange={onBrushShapeChange}
          onCreateRoomLocation={onCreateRoomLocation}
          onDeleteEntity={onDeleteEntity}
          onDeleteRoomLocation={onDeleteRoomLocation}
          onDeleteTargetChange={onDeleteTargetChange}
          onDocumentChange={onDocumentChange}
          onDuplicateEntity={onDuplicateEntity}
          onGlobalThemeChange={onGlobalThemeChange}
          onMoveEntityToSelection={onMoveEntityToSelection}
          onObjectAssetChange={onObjectAssetChange}
          onObjectLinkChange={onObjectLinkChange}
          onRedo={onRedo}
          onRenameRoomLocation={onRenameRoomLocation}
          onRoomColorChange={onRoomColorChange}
          onRoomThemeChange={onRoomThemeChange}
          onRotateEntity={onRotateEntity}
          onSelectionChange={onSelectionChange}
          onToolChange={onToolChange}
          onUndo={onUndo}
          onUploadAsset={onUploadAsset}
        />
      )}
    </>
  );

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
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" icon={Save} disabled={!dirty || saving} onClick={onSave}>
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
          <Button
            type="button"
            icon={ArrowLeft}
            variant="secondary"
            onClick={onRequestReturnToWorld}
          >
            Return to World
          </Button>
        </div>
      </div>
      {studioContent}
      <DungeonStudioExitPrompt
        open={exitPromptOpen}
        saving={saving}
        onCancel={onCancelExit}
        onDiscard={onDiscardExit}
        onSave={onSaveAndExit}
      />
    </Page>
  );
}
