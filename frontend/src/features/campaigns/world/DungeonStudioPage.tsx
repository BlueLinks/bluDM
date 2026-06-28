import { ArrowLeft, DraftingCompass, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import {
  Badge,
  Button,
  Callout,
  EmptyMini,
  MutedPanel,
  Page,
  PageHeader,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import { mapInputFromMap } from "./campaignWorldMapScale";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import {
  createDungeonStudioDocument,
  dungeonStudioMapInput,
  parseDungeonStudioDocument,
  serializeDungeonStudioMetadata,
  studioMapForLocation,
  studioScopeForLocation,
  type DungeonStudioDocument,
} from "./dungeonStudioDocument";
import { locationProfile } from "./locationProfiles";
import { useCampaignWorkspaceData } from "./useCampaignWorkspaceData";
import type { CampaignMap } from "./travelTypes";

export function DungeonStudioPage() {
  const { campaignID, locationID } = useParams();
  const navigate = useNavigate();
  const { detail, error, loading, locations } = useCampaignWorkspaceData(campaignID);
  const [maps, setMaps] = useState<CampaignMap[]>([]);
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [document, setDocument] = useState<DungeonStudioDocument | null>(null);
  const [loadingStudio, setLoadingStudio] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studioError, setStudioError] = useState("");
  const location = useMemo(
    () => locations.find((item) => item.id === locationID),
    [locationID, locations],
  );
  const profile = location ? locationProfile(location) : null;
  const studioAllowed = profile?.variant === "dungeon" || profile?.variant === "floor";
  const returnPath =
    campaignID && locationID
      ? `/campaigns/${campaignID}/world/location/${locationID}`
      : "/campaigns";

  useEffect(() => {
    if (!campaignID || !location || !studioAllowed) return;
    const activeCampaignId = campaignID;
    const activeLocation = location;
    let active = true;
    async function loadOrCreateStudioMap() {
      setLoadingStudio(true);
      setStudioError("");
      try {
        const { maps: nextMaps } = await api.campaignMaps(activeCampaignId);
        if (!active) return;
        setMaps(nextMaps);
        const existingMap = studioMapForLocation(nextMaps, activeLocation.id);
        if (existingMap) {
          const parsed = parseDungeonStudioDocument(existingMap.metadata, {
            scope: studioScopeForLocation(activeLocation),
          });
          setMap(existingMap);
          setDocument(parsed);
          return;
        }
        const starterDocument = createDungeonStudioDocument({
          scope: studioScopeForLocation(activeLocation),
        });
        const { map: createdMap } = await api.createCampaignMap(
          activeCampaignId,
          dungeonStudioMapInput(activeLocation, starterDocument),
        );
        if (!active) return;
        setMaps([...nextMaps, createdMap]);
        setMap(createdMap);
        setDocument(starterDocument);
      } catch (err) {
        if (active)
          setStudioError(err instanceof Error ? err.message : "Could not open Dungeon Studio");
      } finally {
        if (active) setLoadingStudio(false);
      }
    }
    void loadOrCreateStudioMap();
    return () => {
      active = false;
    };
  }, [campaignID, location, studioAllowed]);

  async function saveStudioMetadata() {
    if (!campaignID || !map || !document) return;
    setSaving(true);
    setStudioError("");
    try {
      const metadata = serializeDungeonStudioMetadata(map.metadata, document);
      const { map: savedMap } = await api.updateCampaignMap(
        campaignID,
        map.id,
        mapInputFromMap(map, { metadata }),
      );
      setMap(savedMap);
      setMaps((current) => current.map((item) => (item.id === savedMap.id ? savedMap : item)));
    } catch (err) {
      setStudioError(err instanceof Error ? err.message : "Could not save Dungeon Studio map");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <MutedPanel>Loading Dungeon Studio...</MutedPanel>;
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
      <PageHeader
        eyebrow="Campaign World"
        title="Dungeon Studio"
        copy="Sketch grid-based dungeon structure from the location context, then bind rooms and prep back to Campaign World."
        action={
          <ActionRow justify="end">
            <Link to={returnPath}>
              <Button type="button" icon={ArrowLeft} variant="secondary">
                Return to World
              </Button>
            </Link>
            <Button
              type="button"
              icon={Save}
              disabled={!document || !map || saving}
              onClick={() => void saveStudioMetadata()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </ActionRow>
        }
      />
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
      ) : (
        <DungeonStudioShell
          document={document}
          locationName={location.name}
          map={map}
          maps={maps}
        />
      )}
    </Page>
  );
}

function DungeonStudioShell({
  document,
  locationName,
  map,
  maps,
}: {
  document: DungeonStudioDocument;
  locationName: string;
  map: CampaignMap;
  maps: CampaignMap[];
}) {
  const floorCells = document.layers
    .filter((layer) => layer.cellKind === "floor")
    .reduce((total, layer) => total + layer.cells.length, 0);
  const roomCells = document.rooms.reduce((total, room) => total + room.cells.length, 0);
  const unassignedFloorCells = Math.max(0, floorCells - roomCells);
  return (
    <div className="grid min-w-0 gap-4">
      <CardSection tone="background" className="p-4">
        <SectionHeader
          icon={DraftingCompass}
          title={locationName}
          meta={`${map.name} • ${document.tileset} tileset • ${document.grid.width}×${document.grid.height} • ${document.grid.cellSizeFeet} ft grid`}
          action={<Badge tone="friendly">Read-only Phase 1</Badge>}
        />
      </CardSection>
      <div className="grid min-w-0 gap-4 xl:grid-cols-4">
        <CardSection className="grid content-start gap-3 xl:col-span-1">
          <SectionHeader title="Tools" meta="Structure, Rooms, Generator" />
          <ToolPill active label="Structure" copy="Grid preview and starter map setup." />
          <ToolPill label="Rooms" copy="Room overlays arrive in Phase 4." />
          <ToolPill label="Generator" copy="Random drafts arrive after manual tools." />
        </CardSection>
        <CardSection className="grid min-w-0 gap-3 xl:col-span-2">
          <SectionHeader title="Canvas" meta="Read-only grid preview with pan and zoom" />
          <DungeonStudioPreview document={document} />
        </CardSection>
        <CardSection className="grid content-start gap-3 xl:col-span-1">
          <SectionHeader title="Inspector" meta="Studio document" />
          <InspectorRow label="Map record" value={map.name} />
          <InspectorRow label="Scope" value={document.scope} />
          <InspectorRow label="Floor cells" value={String(floorCells)} />
          <InspectorRow label="Walls / doors" value={String(document.edges.length)} />
          <InspectorRow label="Room regions" value={String(document.rooms.length)} />
          <EmptyMini copy="Manual drawing controls are intentionally deferred to Phase 2. This slice verifies route, map ownership, metadata, and preview rendering." />
        </CardSection>
      </div>
      <CardSection tone="background">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <ActionRow>
            <Badge>Floor layer ✓</Badge>
            <Badge>Walls ✓</Badge>
            <Badge>Rooms ✓</Badge>
            <Badge>{maps.length} campaign maps loaded</Badge>
          </ActionRow>
          <span className="font-semibold">Unassigned floor: {unassignedFloorCells} cells</span>
        </div>
      </CardSection>
    </div>
  );
}

function ToolPill({
  active = false,
  copy,
  label,
}: {
  active?: boolean;
  copy: string;
  label: string;
}) {
  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        active ? "border-accent/40 bg-accent/10" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="font-semibold">
        {active ? "● " : ""}
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
    </div>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 font-semibold [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}
