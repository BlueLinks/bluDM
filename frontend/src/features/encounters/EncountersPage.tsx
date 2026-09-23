import { ClipboardList, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { WorkspaceBanner } from "../../components/layout";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyState,
  MutedPanel,
  Page,
  SectionPanel,
  Select,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { CampaignEncounterCreateDialog } from "../campaigns/CampaignEncounterCreateDialog";
import { CampaignWorkspaceTabs } from "../campaigns/CampaignWorkspaceTabs";
import { useCampaignWorkspaceData } from "../campaigns/world/useCampaignWorkspaceData";
import { api } from "../../lib/api";
import { campaignEncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Campaign, Encounter } from "../../types";
import { EncounterList } from "./EncounterList";

export function EncountersPage() {
  const { campaignID } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(
    campaignID || searchParams.get("campaign") || "",
  );

  useEffect(() => {
    setCampaignsLoading(true);
    void api
      .campaigns()
      .then((payload) => {
        setCampaigns(payload.campaigns);
        setSelectedCampaignId((current) =>
          campaignID || payload.campaigns.some((campaign) => campaign.id === current)
            ? campaignID || current
            : payload.campaigns[0]?.id || "",
        );
      })
      .catch((error) =>
        setCampaignsError(error instanceof Error ? error.message : "Could not load campaigns"),
      )
      .finally(() => setCampaignsLoading(false));
  }, [campaignID]);

  if (campaignsLoading) return <MutedPanel>Loading encounters...</MutedPanel>;
  if (campaignsError) {
    return (
      <Page>
        <Callout tone="danger">{campaignsError}</Callout>
      </Page>
    );
  }
  if (!campaigns.length || !selectedCampaignId) {
    return (
      <Page>
        <EmptyState
          icon={ClipboardList}
          title="No campaigns yet"
          copy="Create a campaign before adding encounters."
        />
      </Page>
    );
  }

  return (
    <CampaignEncountersWorkspace
      campaignId={selectedCampaignId}
      campaigns={campaigns}
      scoped={Boolean(campaignID)}
      onCampaignChange={(value) => {
        setSelectedCampaignId(value);
        setSearchParams({ campaign: value });
      }}
    />
  );
}

function CampaignEncountersWorkspace({
  campaignId,
  campaigns,
  scoped,
  onCampaignChange,
}: {
  campaignId: string;
  campaigns: Campaign[];
  scoped: boolean;
  onCampaignChange: (campaignId: string) => void;
}) {
  const navigate = useNavigate();
  const { detail, error, loading, locations, loadCampaign, setError } =
    useCampaignWorkspaceData(campaignId);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [removeEncounter, setRemoveEncounter] = useState<Encounter | null>(null);
  const toast = useToasts();

  async function startEncounter(encounter: Encounter, test: boolean) {
    setError("");
    try {
      const payload = await api.startEncounter(encounter.id, test);
      toast.push(test ? "Test run snapshot created" : "Encounter run snapshot created");
      void navigate(`/encounter-runs/${payload.run.id}/initiative`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start encounter");
    }
  }

  async function cloneEncounter(encounter: Encounter) {
    setError("");
    try {
      const payload = await api.cloneEncounter(encounter.id);
      toast.push(`${payload.encounter.name} cloned`);
      await loadCampaign();
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : "Could not clone encounter");
    }
  }

  async function confirmRemoveEncounter() {
    if (!removeEncounter) return;
    try {
      await api.deleteEncounter(removeEncounter.id);
      toast.push(`${removeEncounter.name} removed`);
      setRemoveEncounter(null);
      await loadCampaign();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove encounter");
    }
  }

  if (loading) return <MutedPanel>Loading encounters...</MutedPanel>;
  if (!detail) {
    return (
      <Page>
        <Callout tone="danger">{error || "Campaign not found"}</Callout>
      </Page>
    );
  }

  return (
    <Page size="workspace">
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to={scoped ? `/campaigns/${campaignId}` : "/campaigns"} />
      <Breadcrumbs
        items={
          scoped
            ? [
                { label: "Campaigns", to: "/campaigns" },
                { label: detail.campaign.name, to: `/campaigns/${campaignId}` },
                { label: "Encounters" },
              ]
            : [{ label: "Encounters" }]
        }
      />
      <WorkspaceBanner
        eyebrow="Encounters"
        title={detail.campaign.name}
        copy="Search, filter, run, and manage every encounter in this campaign."
        tone="secondary"
        action={
          <div className="flex flex-wrap items-start gap-2">
            <Link to={`/import?tab=markdown&campaign=${encodeURIComponent(campaignId)}`}>
              <Button type="button" icon={Upload} variant="outline">
                Import
              </Button>
            </Link>
            <CampaignEncounterCreateDialog
              allowedStandardSources={detail.campaign.allowedStandardSources}
              campaignId={campaignId}
              difficultyRuleset={campaignEncounterRuleset(detail.campaign)}
              locations={locations}
              npcs={detail.npcs}
              open={encounterOpen}
              players={detail.players}
              trigger={
                <Button type="button" icon={Plus}>
                  Add encounter
                </Button>
              }
              onCreated={loadCampaign}
              onOpenChange={setEncounterOpen}
            />
          </div>
        }
      />
      {scoped ? <CampaignWorkspaceTabs campaignId={campaignId} /> : null}
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <SectionPanel
        title={`${detail.encounters.length} encounter${detail.encounters.length === 1 ? "" : "s"}`}
        icon={ClipboardList}
        action={
          !scoped && campaigns.length > 1 ? (
            <Select
              ariaLabel="Campaign"
              className="min-w-52"
              placeholder="Choose campaign"
              value={campaignId}
              options={campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id }))}
              onValueChange={onCampaignChange}
            />
          ) : undefined
        }
      >
        <EncounterList
          campaignId={campaignId}
          encounters={detail.encounters}
          extendedActions
          pageSize={10}
          onClone={(encounter) => void cloneEncounter(encounter)}
          onRemove={setRemoveEncounter}
          onStart={(encounter, test) => void startEncounter(encounter, test)}
        />
      </SectionPanel>
      <ConfirmDialog
        open={Boolean(removeEncounter)}
        title="Remove encounter?"
        confirmLabel="Remove encounter"
        onCancel={() => setRemoveEncounter(null)}
        onConfirm={() => void confirmRemoveEncounter()}
      >
        This removes {removeEncounter?.name} and its prepared combatants. Creature and player
        library records are not affected.
      </ConfirmDialog>
    </Page>
  );
}
