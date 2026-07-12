import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import {
  Button,
  Callout,
  MutedPanel,
  Page,
  ToastViewport,
  useToasts,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import type { Encounter } from "../../../types";
import { CampaignEncounterCreateDialog } from "../CampaignEncounterCreateDialog";
import { CampaignTravelTool } from "../CampaignTravelTool";
import { CampaignWorkspaceTabs } from "../CampaignWorkspaceTabs";
import { CampaignWorldSection } from "./CampaignWorldSection";
import { useCampaignWorkspaceData } from "./useCampaignWorkspaceData";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";
import "./campaignWorldExperience.scss";

export function CampaignWorldPage() {
  const { campaignID, locationID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mapsMode = location.pathname.endsWith("/world/maps");
  const { detail, error, journeys, loading, locations, loadCampaign, setError } =
    useCampaignWorkspaceData(campaignID);
  const [editingJourney, setEditingJourney] = useState<CampaignJourney | null>(null);
  const [travelPlanningLocation, setTravelPlanningLocation] = useState<CampaignLocation | null>(
    null,
  );
  const [travelOpenRequest, setTravelOpenRequest] = useState(0);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [encounterLocationId, setEncounterLocationId] = useState("");
  const toast = useToasts();

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

  async function deleteEncounter(encounter: Encounter) {
    setError("");
    try {
      await api.deleteEncounter(encounter.id);
      toast.push(`${encounter.name} deleted`);
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete encounter");
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

  function planTravelFromLocation(location: CampaignLocation) {
    setEditingJourney(null);
    setTravelPlanningLocation(location);
    setTravelOpenRequest((request) => request + 1);
  }

  function generateEncounterAtLocation(location: CampaignLocation) {
    setEncounterLocationId(location.id);
    setEncounterOpen(true);
  }

  if (loading) return <MutedPanel>Loading world workspace...</MutedPanel>;
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
    <Page
      className="campaign-world-experience content-start px-3 py-3 md:px-4 md:py-4 2xl:px-5"
      size="workspace"
    >
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <CampaignTravelTool
        campaignId={detail.campaign.id}
        editingJourney={editingJourney}
        locations={locations}
        openRequestKey={travelOpenRequest}
        planningLocation={travelPlanningLocation}
        onEditComplete={() => {
          setEditingJourney(null);
          setTravelPlanningLocation(null);
        }}
        onJourneySaved={loadCampaign}
      />
      <BackButton to={`/campaigns/${detail.campaign.id}`}>Back to campaign</BackButton>
      <Breadcrumbs
        items={[
          { label: "Campaigns", to: "/campaigns" },
          { label: detail.campaign.name, to: `/campaigns/${detail.campaign.id}` },
          { label: "World" },
        ]}
      />
      <CampaignWorldCommandBar campaignName={detail.campaign.name} />
      <CampaignWorkspaceTabs campaignId={detail.campaign.id} />
      {error && <Callout tone="danger">{error}</Callout>}
      <CampaignWorldSection
        campaignId={detail.campaign.id}
        encounters={detail.encounters}
        locations={locations}
        npcs={detail.npcs}
        journeys={journeys}
        mapsMode={mapsMode}
        routeLocationID={locationID}
        onManageNpcs={() => void navigate(`/campaigns/${detail.campaign.id}#campaign-npcs`)}
        onPlanTravel={planTravelFromLocation}
        onChanged={loadCampaign}
        onCloneEncounter={(encounter) => void cloneEncounter(encounter)}
        onDeleteEncounter={(encounter) => void deleteEncounter(encounter)}
        onGenerateEncounter={generateEncounterAtLocation}
        onStartEncounter={(encounter, test) => void startEncounter(encounter, test)}
      />
      <CampaignEncounterCreateDialog
        campaignId={detail.campaign.id}
        initialLocationId={encounterLocationId}
        locations={locations}
        npcs={detail.npcs}
        open={encounterOpen}
        players={detail.players}
        onCreated={loadCampaign}
        onOpenChange={(open) => {
          setEncounterOpen(open);
          if (!open) setEncounterLocationId("");
        }}
      />
    </Page>
  );
}

function CampaignWorldCommandBar({ campaignName }: { campaignName: string }) {
  return (
    <header className="campaign-world-command-bar">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{campaignName} world</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse places, prepare what happens there, and keep table context close at hand.
      </p>
    </header>
  );
}
