import { Castle, ChevronRight, Map, Plus, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { ResponsiveGrid, SidebarDetailLayout, WorkspaceBanner } from "../../components/layout";
import {
  Button,
  Callout,
  EmptyMini,
  EmptyState,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  SectionPanel,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import { campaignEncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { Campaign, Creature, Encounter, Player } from "../../types";
import { CampaignEncountersSection } from "./CampaignEncountersSection";
import { CampaignForm } from "./CampaignForm";
import { CampaignNpcSection } from "./CampaignNpcSection";
import { CampaignOverviewCards } from "./CampaignOverviewCards";
import { CampaignPartySection } from "./CampaignPartySection";
import { CampaignRemovalDialogs } from "./CampaignRemovalDialogs";
import { CampaignSourceSettings } from "./CampaignSourceSettings";
import { CampaignTravelTool } from "./CampaignTravelTool";
import { CampaignWorkspaceHub } from "./CampaignWorkspaceHub";
import { CampaignWorkspaceTabs } from "./CampaignWorkspaceTabs";
import { TravelPanel } from "./world/TravelPanel";
import { useCampaignWorkspaceData } from "./world/useCampaignWorkspaceData";
import type { CampaignJourney } from "./world/travelTypes";

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCampaigns() {
    setLoading(true);
    setError("");
    try {
      const payload = await api.campaigns();
      setCampaigns(payload.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  return (
    <Page>
      <BackButton to="/players">Back to players</BackButton>
      <Breadcrumbs items={[{ label: "Players", to: "/players" }, { label: "New" }]} />
      <PageHeader
        eyebrow="Campaigns"
        title="Choose the table"
        copy="Open a campaign to manage its party, encounters, NPCs, and rest state."
        action={
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Create campaign"
            trigger={<Button icon={Plus}>New campaign</Button>}
          >
            <CampaignForm
              onCreated={(campaign) => {
                setCampaigns((current) => [campaign, ...current]);
                setModalOpen(false);
              }}
            />
          </Modal>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading && <MutedPanel>Loading campaigns...</MutedPanel>}
      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={Castle}
          title="No campaigns yet"
          copy="Create a campaign to start building party state and encounters."
        />
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((campaign) => (
          <article
            className="rounded-lg border border-border bg-card p-5 transition hover:border-primary hover:shadow-md"
            key={campaign.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  className="group inline-flex items-start gap-2"
                  to={`/campaigns/${campaign.id}`}
                >
                  <span>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {campaign.description || "No description yet."}
                    </p>
                  </span>
                  <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Updated {new Date(campaign.updatedAt).toLocaleDateString()}
              </p>
              <Link
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-accent transition hover:border-primary hover:text-primary"
                to={`/campaigns/${campaign.id}/world`}
              >
                <Map className="h-3.5 w-3.5" />
                Open world
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Page>
  );
}

export function CampaignDetailPage() {
  const { campaignID } = useParams();
  const navigate = useNavigate();
  const { detail, error, journeys, loading, locations, loadCampaign, setDetail, setError } =
    useCampaignWorkspaceData(campaignID);
  const [editingJourney, setEditingJourney] = useState<CampaignJourney | null>(null);
  const [partyOpen, setPartyOpen] = useState(false);
  const [npcOpen, setNpcOpen] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [removePlayer, setRemovePlayer] = useState<Player | null>(null);
  const [removeNpc, setRemoveNpc] = useState<Creature | null>(null);
  const [removeEncounter, setRemoveEncounter] = useState<Encounter | null>(null);
  const [allCreatures, setAllCreatures] = useState<Creature[]>([]);
  const toast = useToasts();

  async function longRest() {
    if (!campaignID) return;
    setError("");
    try {
      const payload = await api.longRestCampaign(campaignID);
      toast.push(`Party long rested (${payload.restedPlayers} updated)`, {
        actionLabel: "Undo",
        durationMs: 8000,
        onAction: () =>
          void api
            .undoLongRestCampaign(campaignID, payload.snapshot)
            .then(async () => {
              toast.push("Long rest undone");
              await loadCampaign();
            })
            .catch((err) =>
              setError(err instanceof Error ? err.message : "Could not undo long rest"),
            ),
      });
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not long rest party");
    }
  }

  async function confirmRemovePlayer() {
    if (!removePlayer) return;
    await api.deletePlayer(removePlayer.id);
    toast.push(`${removePlayer.characterName} removed from party`);
    setRemovePlayer(null);
    await loadCampaign();
  }

  async function openNpcDialog() {
    setNpcOpen(true);
    try {
      const payload = await api.creatures();
      setAllCreatures(payload.creatures);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load creature library");
    }
  }

  async function linkNpc(creature: Creature) {
    if (!detail) return;
    await api.linkCampaignNpc(detail.campaign.id, creature.id);
    toast.push(`${creature.name} linked to campaign`);
    await loadCampaign();
  }

  async function confirmRemoveNpc() {
    if (!detail || !removeNpc) return;
    await api.unlinkCampaignNpc(detail.campaign.id, removeNpc.id);
    toast.push(`${removeNpc.name} unlinked from campaign`);
    setRemoveNpc(null);
    await loadCampaign();
  }

  async function cloneEncounter(encounter: Encounter) {
    setError("");
    try {
      const payload = await api.cloneEncounter(encounter.id);
      toast.push(`${payload.encounter.name} cloned`);
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clone encounter");
    }
  }

  async function startEncounter(encounter: Encounter, test: boolean) {
    setError("");
    try {
      const payload = await api.startEncounter(encounter.id, test);
      toast.push(test ? "Test run snapshot created" : "Encounter run snapshot created");
      void navigate(`/encounter-runs/${payload.run.id}/initiative`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start encounter");
    }
  }

  async function confirmRemoveEncounter() {
    if (!removeEncounter) return;
    await api.deleteEncounter(removeEncounter.id);
    toast.push(`${removeEncounter.name} removed`);
    setRemoveEncounter(null);
    await loadCampaign();
  }

  if (loading) return <MutedPanel>Loading campaign...</MutedPanel>;
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
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <CampaignTravelTool
        campaignId={detail.campaign.id}
        editingJourney={editingJourney}
        hidden={encounterOpen}
        locations={locations}
        onEditComplete={() => setEditingJourney(null)}
        onJourneySaved={loadCampaign}
      />
      <BackButton hidden={encounterOpen} to="/campaigns">
        Back to campaigns
      </BackButton>
      <Breadcrumbs
        hidden={encounterOpen}
        items={[{ label: "Campaigns", to: "/campaigns" }, { label: detail.campaign.name }]}
      />
      <WorkspaceBanner
        eyebrow="Campaign"
        title={detail.campaign.name}
        copy={
          detail.campaign.description ||
          "Party state, encounters, and campaign-specific NPCs will gather here."
        }
        action={
          <Link to={`/campaigns/${detail.campaign.id}/world`}>
            <Button type="button" icon={Map} variant="secondary">
              Open world
            </Button>
          </Link>
        }
        tone="secondary"
      />
      <CampaignWorkspaceTabs campaignId={detail.campaign.id} />
      {error && <Callout tone="danger">{error}</Callout>}
      <CampaignOverviewCards detail={detail} />
      <SidebarDetailLayout variant="workspace">
        <CampaignWorkspaceHub campaignId={detail.campaign.id} detail={detail} journeys={journeys} />
        <CampaignSourceSettings
          campaign={detail.campaign}
          onSaved={(campaign) =>
            setDetail((current) => (current ? { ...current, campaign } : current))
          }
        />
      </SidebarDetailLayout>
      <ResponsiveGrid variant="equal2">
        <TravelPanel
          campaignId={detail.campaign.id}
          journeys={journeys}
          locations={locations}
          onEditJourney={setEditingJourney}
          onChanged={loadCampaign}
        />
        <div id="campaign-encounters">
          <CampaignEncountersSection
            campaignID={detail.campaign.id}
            difficultyRuleset={campaignEncounterRuleset(detail.campaign)}
            encounterOpen={encounterOpen}
            encounters={detail.encounters}
            locations={locations}
            npcs={detail.npcs}
            players={detail.players}
            onClone={(encounter) => void cloneEncounter(encounter)}
            onCreated={loadCampaign}
            onOpenChange={setEncounterOpen}
            onRemove={setRemoveEncounter}
            onStart={(encounter, test) => void startEncounter(encounter, test)}
          />
        </div>
        <div id="campaign-party">
          <CampaignPartySection
            campaignID={detail.campaign.id}
            open={partyOpen}
            players={detail.players}
            onLongRest={() => void longRest()}
            onOpenChange={setPartyOpen}
            onRemovePlayer={setRemovePlayer}
          />
        </div>
        <div id="campaign-npcs">
          <CampaignNpcSection
            allCreatures={allCreatures}
            linkedNpcs={detail.npcs}
            open={npcOpen}
            onLink={(creature) => void linkNpc(creature)}
            onOpenDialog={() => void openNpcDialog()}
            onOpenChange={setNpcOpen}
            onRemove={setRemoveNpc}
          />
        </div>
        <SectionPanel title="Recent Notes" icon={ScrollText}>
          <EmptyMini copy="Combat summaries, XP awards, and loot reminders will appear here." />
        </SectionPanel>
      </ResponsiveGrid>
      <CampaignRemovalDialogs
        encounter={removeEncounter}
        npc={removeNpc}
        player={removePlayer}
        onCancelEncounter={() => setRemoveEncounter(null)}
        onCancelNpc={() => setRemoveNpc(null)}
        onCancelPlayer={() => setRemovePlayer(null)}
        onConfirmEncounter={() => void confirmRemoveEncounter()}
        onConfirmNpc={() => void confirmRemoveNpc()}
        onConfirmPlayer={() => void confirmRemovePlayer()}
      />
    </Page>
  );
}
