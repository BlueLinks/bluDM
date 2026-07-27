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
import type { Campaign } from "../types";

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
  const [preview, setPreview] = useState<MarkdownEncounterPreview | null>(null);
  const [result, setResult] = useState<MarkdownEncounterImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedCampaignID = campaigns.some((campaign) => campaign.id === campaignID)
    ? campaignID
    : (campaigns[0]?.id ?? "");

  async function chooseFile(file: File | null) {
    setPreview(null);
    setResult(null);
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

  async function runPreview() {
    if (!source || !selectedCampaignID) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const payload = await api.previewMarkdownEncounters(selectedCampaignID, {
        markdown: source.markdown,
        sourcePath: source.sourcePath,
      });
      setPreview(payload.preview);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not preview the Markdown encounters");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!source || !selectedCampaignID || !preview?.canImport) return;
    setBusy(true);
    setError("");
    try {
      const payload = await api.importMarkdownEncounters(selectedCampaignID, {
        markdown: source.markdown,
        sourcePath: source.sourcePath,
      });
      setPreview(payload.preview);
      setResult(payload.import);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import the Markdown encounters");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentStack>
      <Callout>
        Keep your campaign writing in Markdown. bluDM reads only fenced <code>bludm-encounter</code>{" "}
        blocks and imports their runnable combat state.
      </Callout>
      <ResponsiveGrid variant="equal2">
        <MarkdownFilePanel
          campaigns={campaigns}
          campaignID={selectedCampaignID}
          filename={source?.filename ?? ""}
          onCampaignChange={(value) => {
            setCampaignID(value);
            setPreview(null);
            setResult(null);
          }}
          onChooseFile={(file) => void chooseFile(file)}
        />
        <MarkdownImportActions
          busy={busy}
          canImport={Boolean(preview?.canImport)}
          ready={Boolean(source && selectedCampaignID)}
          onImport={() => void runImport()}
          onPreview={() => void runPreview()}
        />
      </ResponsiveGrid>
      {error && <Callout tone="danger">{error}</Callout>}
      {preview && <MarkdownPreviewPanel preview={preview} />}
      {result && <MarkdownImportResultPanel campaignID={selectedCampaignID} result={result} />}
    </ContentStack>
  );
}

function MarkdownFilePanel({
  campaigns,
  campaignID,
  filename,
  onCampaignChange,
  onChooseFile,
}: {
  campaigns: Campaign[];
  campaignID: string;
  filename: string;
  onCampaignChange: (value: string) => void;
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
        <p className="text-sm text-muted-foreground">
          {filename || "Choose one Markdown note. Preview never writes encounter data."}
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
            Import encounters
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
