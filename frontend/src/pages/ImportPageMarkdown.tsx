import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ActionRow, ContentStack, ResponsiveGrid } from "../components/layout";
import { Badge, Button, Callout, Field, SectionPanel, Select } from "../components/ui";
import { api } from "../lib/api";
import type {
  MarkdownEncounterChange,
  MarkdownEncounterImport,
  MarkdownEncounterPreview,
} from "../lib/api/markdownEncounters";
import type {
  MarkdownAssetPayload,
  MarkdownWorldImport,
  MarkdownWorldPreview,
} from "../lib/api/markdownWorld";
import type { Campaign } from "../types";
import {
  markdownAssetFromFile,
  MarkdownWorldPreviewPanel,
  MarkdownWorldResultPanel,
} from "./ImportPageMarkdownWorld";

type MarkdownSource = {
  markdown: string;
  sourcePath: string;
  filename: string;
};

export function MarkdownEncounterTab({
  campaigns,
  initialCampaignID,
}: {
  campaigns: Campaign[];
  initialCampaignID: string;
}) {
  const [campaignID, setCampaignID] = useState(initialCampaignID);
  const [source, setSource] = useState<MarkdownSource | null>(null);
  const [assets, setAssets] = useState<MarkdownAssetPayload[]>([]);
  const [preview, setPreview] = useState<MarkdownEncounterPreview | null>(null);
  const [worldPreview, setWorldPreview] = useState<MarkdownWorldPreview | null>(null);
  const [result, setResult] = useState<MarkdownEncounterImport | null>(null);
  const [worldResult, setWorldResult] = useState<MarkdownWorldImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedCampaignID = campaigns.some((campaign) => campaign.id === campaignID)
    ? campaignID
    : (campaigns[0]?.id ?? "");

  async function chooseFile(file: File | null) {
    setPreview(null);
    setWorldPreview(null);
    setResult(null);
    setWorldResult(null);
    setError("");
    if (!file) {
      setSource(null);
      return;
    }
    try {
      const relativePath = "webkitRelativePath" in file ? String(file.webkitRelativePath) : "";
      setSource({
        markdown: await file.text(),
        sourcePath: relativePath || file.name,
        filename: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the Markdown file");
    }
  }

  async function chooseAssets(files: FileList | null) {
    setAssets([]);
    setPreview(null);
    setWorldPreview(null);
    setResult(null);
    setWorldResult(null);
    setError("");
    if (!files?.length) return;
    try {
      setAssets(await Promise.all([...files].map(markdownAssetFromFile)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the related image files");
    }
  }

  async function runPreview() {
    if (!source || !selectedCampaignID) return;
    setBusy(true);
    setError("");
    setResult(null);
    setWorldResult(null);
    try {
      const hasEncounters = source.markdown.includes("bludm-encounter");
      const hasWorldContent =
        source.markdown.includes("bludm-npc") || source.markdown.includes("bludm-dungeon");
      if (!hasEncounters && !hasWorldContent) {
        throw new Error(
          "No bludm-encounter, bludm-npc, or bludm-dungeon blocks were found in this note",
        );
      }
      const [encounterPayload, worldPayload] = await Promise.all([
        hasEncounters
          ? api.previewMarkdownEncounters(selectedCampaignID, {
              markdown: source.markdown,
              sourcePath: source.sourcePath,
            })
          : null,
        hasWorldContent
          ? api.previewMarkdownWorld(selectedCampaignID, {
              markdown: source.markdown,
              sourcePath: source.sourcePath,
              assets,
            })
          : null,
      ]);
      setPreview(encounterPayload?.preview ?? null);
      setWorldPreview(worldPayload?.preview ?? null);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not preview the Markdown content");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (
      !source ||
      !selectedCampaignID ||
      (preview && !preview.canImport) ||
      (worldPreview && !worldPreview.canImport) ||
      (!preview && !worldPreview)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const [encounterPayload, worldPayload] = await Promise.all([
        preview
          ? api.importMarkdownEncounters(selectedCampaignID, {
              markdown: source.markdown,
              sourcePath: source.sourcePath,
            })
          : null,
        worldPreview
          ? api.importMarkdownWorld(selectedCampaignID, {
              markdown: source.markdown,
              sourcePath: source.sourcePath,
              assets,
            })
          : null,
      ]);
      setPreview(encounterPayload?.preview ?? null);
      setResult(encounterPayload?.import ?? null);
      setWorldPreview(worldPayload?.preview ?? null);
      setWorldResult(worldPayload?.import ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import the Markdown content");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentStack>
      <Callout>
        Keep your campaign writing in Markdown. bluDM imports only fenced{" "}
        <code>bludm-encounter</code>, <code>bludm-npc</code>, and <code>bludm-dungeon</code> blocks;
        the rest of each Vault note remains in your Vault.
      </Callout>
      <ResponsiveGrid variant="equal2">
        <MarkdownFilePanel
          campaigns={campaigns}
          campaignID={selectedCampaignID}
          filename={source?.filename ?? ""}
          assetCount={assets.length}
          onCampaignChange={(value) => {
            setCampaignID(value);
            setPreview(null);
            setWorldPreview(null);
            setResult(null);
            setWorldResult(null);
          }}
          onChooseAssets={(files) => void chooseAssets(files)}
          onChooseFile={(file) => void chooseFile(file)}
        />
        <MarkdownImportActions
          busy={busy}
          canImport={Boolean(
            (preview || worldPreview) &&
            (!preview || preview.canImport) &&
            (!worldPreview || worldPreview.canImport),
          )}
          ready={Boolean(source && selectedCampaignID)}
          onImport={() => void runImport()}
          onPreview={() => void runPreview()}
        />
      </ResponsiveGrid>
      {error && <Callout tone="danger">{error}</Callout>}
      {preview && <MarkdownPreviewPanel preview={preview} />}
      {worldPreview && <MarkdownWorldPreviewPanel preview={worldPreview} />}
      {result && <MarkdownImportResultPanel campaignID={selectedCampaignID} result={result} />}
      {worldResult && (
        <MarkdownWorldResultPanel campaignID={selectedCampaignID} result={worldResult} />
      )}
    </ContentStack>
  );
}

function MarkdownFilePanel({
  campaigns,
  campaignID,
  filename,
  assetCount,
  onCampaignChange,
  onChooseAssets,
  onChooseFile,
}: {
  campaigns: Campaign[];
  campaignID: string;
  filename: string;
  assetCount: number;
  onCampaignChange: (value: string) => void;
  onChooseAssets: (files: FileList | null) => void;
  onChooseFile: (file: File | null) => void;
}) {
  return (
    <SectionPanel title="Markdown source" icon={UploadCloud}>
      <div className="grid gap-4">
        <Field label="Campaign">
          <Select
            value={campaignID}
            placeholder="Choose campaign"
            options={campaigns.map((campaign) => ({
              value: campaign.id,
              label: campaign.name,
            }))}
            onValueChange={onCampaignChange}
          />
        </Field>
        <Field label="Vault note">
          <input
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:font-semibold file:text-foreground hover:file:bg-card"
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Related images (optional)">
          <input
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:font-semibold file:text-foreground hover:file:bg-card"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event) => onChooseAssets(event.target.files)}
          />
        </Field>
        <p className="text-sm text-muted-foreground">
          {filename || "Choose one Markdown note. Preview never writes campaign data."}
          {assetCount > 0
            ? ` ${assetCount} related image${assetCount === 1 ? "" : "s"} ready.`
            : ""}
        </p>
      </div>
    </SectionPanel>
  );
}

function MarkdownImportActions({
  busy,
  canImport,
  ready,
  onImport,
  onPreview,
}: {
  busy: boolean;
  canImport: boolean;
  ready: boolean;
  onImport: () => void;
  onPreview: () => void;
}) {
  return (
    <SectionPanel title="Review and import" icon={FileText}>
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Preview resolves exact player, custom creature, SRD creature, and location references.
          Nothing is created until the preview is clear and you choose Import.
        </p>
        <ActionRow>
          <Button type="button" variant="secondary" disabled={!ready || busy} onClick={onPreview}>
            {busy ? "Working..." : "Preview"}
          </Button>
          <Button type="button" disabled={!canImport || busy} onClick={onImport}>
            Import content
          </Button>
        </ActionRow>
      </div>
    </SectionPanel>
  );
}

function MarkdownPreviewPanel({ preview }: { preview: MarkdownEncounterPreview }) {
  return (
    <SectionPanel
      title="Encounter preview"
      icon={preview.canImport ? CheckCircle2 : AlertTriangle}
      action={
        <Badge tone={preview.canImport ? "success" : "danger"}>
          {preview.canImport ? "Ready to import" : "Needs attention"}
        </Badge>
      }
    >
      <div className="grid gap-3">
        {preview.encounters.map((encounter) => (
          <MarkdownEncounterPreviewCard encounter={encounter} key={encounter.blockId} />
        ))}
      </div>
    </SectionPanel>
  );
}

function MarkdownEncounterPreviewCard({ encounter }: { encounter: MarkdownEncounterChange }) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold">{encounter.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Block <code>{encounter.blockId}</code> · line {encounter.line}
          </p>
        </div>
        <Badge tone={encounter.operation === "create" ? "success" : "imported"}>
          {encounter.operation === "create" ? "Create" : "Update existing"}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {encounter.location && <Badge tone="shared">{encounter.location}</Badge>}
        {encounter.room && <Badge tone="metadata">Room {encounter.room}</Badge>}
        <Badge tone="info">{encounter.combatants.length} roster entries</Badge>
      </div>
      {encounter.combatants.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm">
          {encounter.combatants.map((combatant, index) => (
            <li
              className="flex flex-wrap justify-between gap-2 border-t border-border pt-2"
              key={`${combatant.name}-${combatant.side}-${index}`}
            >
              <span>
                {combatant.quantity}× {combatant.name} · {combatant.side}
              </span>
              <span className="text-muted-foreground">
                {combatant.source} · AC {combatant.armorClass} · HP {combatant.hitPoints}
              </span>
            </li>
          ))}
        </ul>
      )}
      {encounter.warnings.map((warning) => (
        <Callout key={warning} tone="warning">
          {warning}
        </Callout>
      ))}
      {encounter.errors.map((message) => (
        <Callout key={message} tone="danger">
          {message}
        </Callout>
      ))}
    </article>
  );
}

function MarkdownImportResultPanel({
  campaignID,
  result,
}: {
  campaignID: string;
  result: MarkdownEncounterImport;
}) {
  return (
    <SectionPanel title="Imported encounters" icon={CheckCircle2}>
      <div className="grid gap-3">
        {result.encounters.map((encounter, index) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            key={encounter.id}
          >
            <div>
              <div className="font-semibold">{encounter.name}</div>
              <div className="text-sm text-muted-foreground">
                {result.operations[index] === "create" ? "Created" : "Updated"} ·{" "}
                {encounter.combatantCount} combatants
              </div>
            </div>
            <Link to={`/campaigns/${campaignID}/encounters/${encounter.id}/edit`}>
              <Button type="button" size="sm">
                Open encounter
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}
