import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Button, Callout, SectionPanel } from "../components/ui";
import type {
  MarkdownAssetPayload,
  MarkdownDungeonChange,
  MarkdownWorldImport,
  MarkdownWorldNPCChange,
  MarkdownWorldPreview,
} from "../lib/api/markdownWorld";

export function MarkdownWorldPreviewPanel({ preview }: { preview: MarkdownWorldPreview }) {
  return (
    <SectionPanel
      title="NPC and dungeon preview"
      icon={preview.canImport ? CheckCircle2 : AlertTriangle}
      action={
        <Badge tone={preview.canImport ? "success" : "danger"}>
          {preview.canImport ? "Ready to import" : "Needs attention"}
        </Badge>
      }
    >
      <div className="grid gap-3">
        {preview.npcs.map((npc) => (
          <MarkdownNPCPreviewCard key={npc.blockId} npc={npc} />
        ))}
        {preview.dungeons.map((dungeon) => (
          <MarkdownDungeonPreviewCard dungeon={dungeon} key={dungeon.blockId} />
        ))}
      </div>
    </SectionPanel>
  );
}

function MarkdownNPCPreviewCard({ npc }: { npc: MarkdownWorldNPCChange }) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <MarkdownWorldCardHeader
        blockId={npc.blockId}
        line={npc.line}
        name={npc.name}
        operation={npc.operation}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="personal">NPC</Badge>
        {npc.location ? <Badge tone="shared">{npc.location}</Badge> : null}
        {npc.avatarPath ? <Badge tone="metadata">Portrait attached</Badge> : null}
      </div>
      <MarkdownMessages warnings={npc.warnings} errors={npc.errors} />
    </article>
  );
}

function MarkdownDungeonPreviewCard({ dungeon }: { dungeon: MarkdownDungeonChange }) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <MarkdownWorldCardHeader
        blockId={dungeon.blockId}
        line={dungeon.line}
        name={dungeon.name}
        operation={dungeon.operation}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="imported">Dungeon</Badge>
        <Badge tone="info">
          {dungeon.floorCount} floor{dungeon.floorCount === 1 ? "" : "s"}
        </Badge>
        {dungeon.maps.map((map) => (
          <Badge key={map.name} tone="metadata">
            {map.name} · {map.kind === "image" ? "image" : `${map.roomCount} rooms`}
          </Badge>
        ))}
      </div>
      <MarkdownMessages warnings={dungeon.warnings} errors={dungeon.errors} />
    </article>
  );
}

function MarkdownWorldCardHeader({
  blockId,
  line,
  name,
  operation,
}: {
  blockId: string;
  line: number;
  name: string;
  operation: "create" | "update";
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="font-semibold">{name}</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Block <code>{blockId}</code> · line {line}
        </p>
      </div>
      <Badge tone={operation === "create" ? "success" : "imported"}>
        {operation === "create" ? "Create" : "Update existing"}
      </Badge>
    </div>
  );
}

function MarkdownMessages({ warnings, errors }: { warnings: string[]; errors: string[] }) {
  return (
    <>
      {warnings.map((warning) => (
        <Callout key={warning} tone="warning">
          {warning}
        </Callout>
      ))}
      {errors.map((message) => (
        <Callout key={message} tone="danger">
          {message}
        </Callout>
      ))}
    </>
  );
}

export function MarkdownWorldResultPanel({
  campaignID,
  result,
}: {
  campaignID: string;
  result: MarkdownWorldImport;
}) {
  return (
    <SectionPanel title="Imported NPCs and dungeons" icon={CheckCircle2}>
      <div className="grid gap-3">
        {result.npcs.map(({ creature, operation }) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            key={creature.id}
          >
            <div>
              <div className="font-semibold">{creature.name}</div>
              <div className="text-sm text-muted-foreground">
                {operation === "create" ? "Created" : "Updated"} campaign NPC
              </div>
            </div>
            <Link to={`/npcs/${creature.id}/edit`}>
              <Button type="button" size="sm" variant="secondary">
                Open NPC
              </Button>
            </Link>
          </div>
        ))}
        {result.dungeons.map(({ location, operation }) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            key={location.id}
          >
            <div>
              <div className="font-semibold">{location.name}</div>
              <div className="text-sm text-muted-foreground">
                {operation === "create" ? "Created" : "Updated"} dungeon and maps
              </div>
            </div>
            <Link to={`/campaigns/${campaignID}/world/location/${location.id}`}>
              <Button type="button" size="sm">
                Open dungeon
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}

export async function markdownAssetFromFile(file: File): Promise<MarkdownAssetPayload> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const relativePath = "webkitRelativePath" in file ? String(file.webkitRelativePath) : "";
  return {
    path: relativePath || file.name,
    filename: file.name,
    contentType: file.type,
    dataBase64: btoa(binary),
  };
}
