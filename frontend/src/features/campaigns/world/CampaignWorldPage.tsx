import { ClipboardList, Map, Plus, Swords } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { ActionRow, ResponsiveGrid } from "../../../components/layout";
import {
  Button,
  Callout,
  EmptyMini,
  MutedPanel,
  Page,
  PageHeader,
  ToastViewport,
  useToasts,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import { CampaignEncounterCreateDialog } from "../CampaignEncounterCreateDialog";
import { CampaignTravelTool } from "../CampaignTravelTool";
import { CampaignWorkspaceTabs } from "../CampaignWorkspaceTabs";
import { CampaignWorldSection } from "./CampaignWorldSection";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import { locationProfile } from "./locationProfiles";
import { TravelPanel } from "./TravelPanel";
import { useCampaignWorkspaceData } from "./useCampaignWorkspaceData";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";

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
  const [encounterName, setEncounterName] = useState("");
  const [encounterDescription, setEncounterDescription] = useState("");
  const [encounterStatus, setEncounterStatus] = useState("planned");
  const [encounterLocation, setEncounterLocation] = useState("");
  const [encounterLocationID, setEncounterLocationID] = useState("");
  const [encounterRoomNumber, setEncounterRoomNumber] = useState("");
  const toast = useToasts();

  async function createEncounter(event: FormEvent) {
    event.preventDefault();
    if (!detail || !encounterName.trim()) return;
    setError("");
    try {
      const payload = await api.createEncounter(detail.campaign.id, {
        name: encounterName,
        description: encounterDescription,
        status: encounterStatus,
        location: encounterLocation,
        locationId: encounterLocationID || undefined,
        roomNumber: encounterRoomNumber,
      });
      toast.push(`${payload.encounter.name} created`);
      setEncounterName("");
      setEncounterDescription("");
      setEncounterStatus("planned");
      setEncounterLocation("");
      setEncounterLocationID("");
      setEncounterRoomNumber("");
      setEncounterOpen(false);
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create encounter");
    }
  }

  function planTravelFromLocation(location: CampaignLocation) {
    setEditingJourney(null);
    setTravelPlanningLocation(location);
    setTravelOpenRequest((request) => request + 1);
  }

  function generateEncounterAtLocation(location: CampaignLocation) {
    const path = locationPathLabel(location);
    const profile = locationProfile(location);
    const roomContext =
      profile.profile === "room" ? location.name : profile.variant === "floor" ? location.name : "";
    setEncounterName(`Incident at ${location.name}`);
    setEncounterDescription(
      `Generated from ${profile.label.toLowerCase()} location: ${path}. Prep what happens here, then refine trigger, difficulty, and combatants before starting play.`,
    );
    setEncounterStatus("planned");
    setEncounterLocation(path);
    setEncounterLocationID(location.id);
    setEncounterRoomNumber(roomContext);
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
    <Page className="2xl:px-2">
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
      <PageHeader
        eyebrow="Campaign World"
        title={`${detail.campaign.name} World`}
        copy="Build the campaign map, connect NPCs and shops, and generate encounters from the exact place the party stirs up trouble."
        action={
          <ActionRow>
            <Link to={`/campaigns/${detail.campaign.id}`}>
              <Button type="button" variant="secondary">
                Overview
              </Button>
            </Link>
            <CampaignEncounterCreateDialog
              description={encounterDescription}
              location={encounterLocation}
              locationID={encounterLocationID}
              locations={locations}
              name={encounterName}
              open={encounterOpen}
              roomNumber={encounterRoomNumber}
              status={encounterStatus}
              trigger={
                <Button type="button" icon={Plus} variant="secondary">
                  New encounter
                </Button>
              }
              onCreate={(event: FormEvent) => void createEncounter(event)}
              onDescriptionChange={setEncounterDescription}
              onLocationChange={setEncounterLocation}
              onLocationIDChange={setEncounterLocationID}
              onNameChange={setEncounterName}
              onOpenChange={setEncounterOpen}
              onRoomNumberChange={setEncounterRoomNumber}
              onStatusChange={setEncounterStatus}
            />
          </ActionRow>
        }
      />
      <CampaignWorkspaceTabs campaignId={detail.campaign.id} />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="grid gap-4">
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
          onGenerateEncounter={generateEncounterAtLocation}
        />
        <ResponsiveGrid variant="equal2">
          <WorldSummary
            encounterCount={detail.encounterCount}
            locationCount={detail.locationCount}
            npcCount={detail.npcs.length}
          />
          <TravelPanel
            campaignId={detail.campaign.id}
            journeys={journeys}
            locations={locations}
            onEditJourney={(journey) => {
              setTravelPlanningLocation(null);
              setEditingJourney(journey);
            }}
            onChanged={loadCampaign}
          />
        </ResponsiveGrid>
      </div>
    </Page>
  );
}

function WorldSummary({
  encounterCount,
  locationCount,
  npcCount,
}: {
  encounterCount: number;
  locationCount: number;
  npcCount: number;
}) {
  const stats = [
    { label: "Locations", value: locationCount, icon: Map },
    { label: "Linked NPCs", value: npcCount, icon: Swords },
    { label: "Encounters", value: encounterCount, icon: ClipboardList },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">World summary</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep an eye on the structures and hooks that support session improvisation.
      </p>
      <ResponsiveGrid className="mt-4" variant="stats3">
        {stats.map((stat) => (
          <div className="rounded-md border border-border bg-background p-3" key={stat.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase text-accent">{stat.label}</div>
                <div className="mt-1 text-2xl font-semibold">{stat.value}</div>
              </div>
              <stat.icon className="h-5 w-5 text-accent" />
            </div>
          </div>
        ))}
      </ResponsiveGrid>
      <div className="mt-4">
        <EmptyMini copy="Use the World workspace to create locations. Travel keeps the reusable route calculations and journey history beside it." />
      </div>
    </section>
  );
}
