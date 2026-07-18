import type { CampaignLocation } from "./travelTypes";
import type { DungeonStudioDocument, DungeonStudioEntity } from "./dungeonStudioDocument";
import type { DungeonStudioTool } from "./dungeonStudioEditing";
import {
  builtinDungeonStudioObjectAssets,
  dungeonStudioAssetByKey,
  dungeonStudioObjectCategoryLabels,
  type DungeonStudioObjectAsset,
  type DungeonStudioObjectCategory,
} from "./dungeonStudioObjectCatalog";

export function DungeonStudioObjectPanel({
  customAssets,
  floorLocations,
  selectedEntity,
  selectedObjectAssetKey,
  onDeleteEntity,
  onDuplicateEntity,
  onMoveEntityToSelection,
  onObjectAssetChange,
  onObjectLinkChange,
  onRotateEntity,
  onToolChange,
  onUploadAsset,
}: {
  customAssets: NonNullable<DungeonStudioDocument["customAssets"]>;
  floorLocations: CampaignLocation[];
  selectedEntity?: DungeonStudioEntity;
  selectedObjectAssetKey: string;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
  onMoveEntityToSelection: (entityId: string) => void;
  onObjectAssetChange: (assetKey: string) => void;
  onObjectLinkChange: (entityId: string, linkedId: string) => void;
  onRotateEntity: (entityId: string) => void;
  onToolChange: (tool: DungeonStudioTool) => void;
  onUploadAsset: (file: File) => void;
}) {
  const assets: DungeonStudioObjectAsset[] = [
    ...builtinDungeonStudioObjectAssets,
    ...customAssets.map(
      (asset) =>
        ({
          key: asset.key,
          label: asset.label,
          category: "custom",
          entityKind: "prop",
          glyph: "✣",
          license: "user-provided",
          source: asset.sourceNotes || "User upload",
        }) satisfies DungeonStudioObjectAsset,
    ),
  ];
  const grouped: Partial<Record<DungeonStudioObjectCategory, DungeonStudioObjectAsset[]>> = {};
  assets.forEach((asset) => {
    grouped[asset.category] = [...(grouped[asset.category] ?? []), asset];
  });
  const selectedAsset = dungeonStudioAssetByKey(selectedEntity?.assetKey, customAssets);
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <div className="text-sm font-semibold text-foreground">Object catalog</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Select an item, then click the map to place it. Built-ins use app-drawn glyphs; uploaded
          images stay in this studio document.
        </p>
        <div className="mt-2 grid gap-2">
          {Object.entries(grouped).map(([category, categoryAssets]) => (
            <div key={category} className="grid gap-1">
              <div className="text-xs font-bold uppercase text-muted-foreground">
                {dungeonStudioObjectCategoryLabels[category as DungeonStudioObjectCategory]}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categoryAssets.map((asset) => (
                  <button
                    key={asset.key}
                    type="button"
                    className={[
                      "rounded-md border px-2 py-1 text-xs font-semibold transition hover:border-accent/50",
                      selectedObjectAssetKey === asset.key
                        ? "border-accent/40 bg-accent/10 text-foreground"
                        : "border-border text-muted-foreground",
                    ].join(" ")}
                    aria-pressed={selectedObjectAssetKey === asset.key}
                    onClick={() => {
                      onObjectAssetChange(asset.key);
                      onToolChange("object");
                    }}
                  >
                    {asset.glyph} {asset.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-muted-foreground">
          Upload custom prop
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-xs"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadAsset(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <div className="text-sm font-semibold text-foreground">Selected object</div>
        {selectedEntity ? (
          <div className="mt-2 grid gap-2 text-sm">
            <div className="font-semibold">
              {selectedEntity.label || selectedAsset?.label || selectedEntity.kind}
            </div>
            <div className="text-xs text-muted-foreground">
              Cell {selectedEntity.cell.x}, {selectedEntity.cell.y} · Rotation{" "}
              {selectedEntity.rotation ?? 0}°
            </div>
            {selectedEntity.kind === "stairs" ? (
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Linked floor
                <select
                  className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold text-foreground"
                  value={selectedEntity.linkedId ?? ""}
                  onChange={(event) => onObjectLinkChange(selectedEntity.id, event.target.value)}
                >
                  <option value="">Unresolved stair</option>
                  {floorLocations.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
                type="button"
                onClick={() => onRotateEntity(selectedEntity.id)}
              >
                Rotate
              </button>
              <button
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
                type="button"
                onClick={() => onDuplicateEntity(selectedEntity.id)}
              >
                Duplicate
              </button>
              <button
                className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
                type="button"
                onClick={() => onMoveEntityToSelection(selectedEntity.id)}
              >
                Move to selected cell
              </button>
              <button
                className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-semibold text-destructive"
                type="button"
                onClick={() => onDeleteEntity(selectedEntity.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Select a placed object to edit it.</p>
        )}
      </div>
    </div>
  );
}
