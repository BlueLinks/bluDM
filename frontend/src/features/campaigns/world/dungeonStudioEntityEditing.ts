import type { DungeonStudioDocument, DungeonStudioEntity, GridCell } from "./dungeonStudioDocument";
import { dungeonStudioAssetByKey } from "./dungeonStudioObjectCatalog";

export function placeObjectEntity(
  document: DungeonStudioDocument,
  cell: GridCell,
  assetKey: string,
): DungeonStudioDocument {
  if (!cellInBounds(document, cell)) return document;
  const asset = dungeonStudioAssetByKey(assetKey, document.customAssets);
  if (!asset) return document;
  const id = nextEntityId(document, asset.key);
  const entity = {
    id,
    kind: asset.entityKind,
    cell,
    assetKey,
    label: asset.defaultLabel,
    rotation: 0,
    metadata:
      asset.category === "stairs"
        ? { direction: asset.key.includes("down") ? "down" : "up" }
        : undefined,
  } satisfies DungeonStudioEntity;
  return { ...document, entities: [...document.entities, entity] };
}

export function moveObjectEntity(
  document: DungeonStudioDocument,
  entityId: string,
  cell: GridCell,
): DungeonStudioDocument {
  if (!cellInBounds(document, cell)) return document;
  return {
    ...document,
    entities: document.entities.map((entity) =>
      entity.id === entityId ? { ...entity, cell } : entity,
    ),
  };
}

export function rotateObjectEntity(document: DungeonStudioDocument, entityId: string) {
  return {
    ...document,
    entities: document.entities.map((entity) =>
      entity.id === entityId
        ? {
            ...entity,
            rotation: (((entity.rotation ?? 0) + 90) % 360) as DungeonStudioEntity["rotation"],
          }
        : entity,
    ),
  };
}

export function duplicateObjectEntity(document: DungeonStudioDocument, entityId: string) {
  const entity = document.entities.find((item) => item.id === entityId);
  if (!entity) return document;
  const nextCell = cellInBounds(document, { x: entity.cell.x + 1, y: entity.cell.y })
    ? { x: entity.cell.x + 1, y: entity.cell.y }
    : entity.cell;
  return {
    ...document,
    entities: [
      ...document.entities,
      { ...entity, id: nextEntityId(document, entity.assetKey ?? entity.kind), cell: nextCell },
    ],
  };
}

export function updateObjectEntityLink(
  document: DungeonStudioDocument,
  entityId: string,
  linkedId: string | undefined,
) {
  return {
    ...document,
    entities: document.entities.map((entity) =>
      entity.id === entityId ? { ...entity, linkedId: linkedId || undefined } : entity,
    ),
  };
}

export function deleteObjectEntity(document: DungeonStudioDocument, entityId: string) {
  return { ...document, entities: document.entities.filter((entity) => entity.id !== entityId) };
}

export function entityAtCell(document: DungeonStudioDocument, cell: GridCell) {
  return [...document.entities]
    .reverse()
    .find((entity) => entity.cell.x === cell.x && entity.cell.y === cell.y);
}

export function addCustomAsset(
  document: DungeonStudioDocument,
  asset: NonNullable<DungeonStudioDocument["customAssets"]>[number],
) {
  const existing = document.customAssets ?? [];
  return {
    ...document,
    customAssets: [...existing.filter((item) => item.key !== asset.key), asset],
  };
}

function cellInBounds(document: DungeonStudioDocument, cell: GridCell) {
  return (
    cell.x >= 0 && cell.x < document.grid.width && cell.y >= 0 && cell.y < document.grid.height
  );
}

function nextEntityId(document: DungeonStudioDocument, prefix: string) {
  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "entity";
  let index = document.entities.length + 1;
  const existing = new Set(document.entities.map((entity) => entity.id));
  while (existing.has(`${safePrefix}-${index}`)) index += 1;
  return `${safePrefix}-${index}`;
}
