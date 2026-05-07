import { Castle, ChevronRight, ClipboardList, Copy, FlaskConical, HeartPulse, Pencil, Play, Plus, ScrollText, Swords, Trash2, UsersRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { PlayerCard } from "../../components/PlayerCard";
import { Badge, Button, Callout, ConfirmDialog, DashboardCard, EmptyMini, EmptyState, Field, FloatingInput, Modal, MutedPanel, Page, PageHeader, SectionPanel, Select, Textarea, ToastViewport, useToasts } from "../../components/ui";
import { api } from "../../lib/api";
import { encounterStatusOptions } from "../../lib/domain/options";
import type { Campaign, CampaignDetail, Creature, Encounter, Player } from "../../types";
import { CampaignNpcDialog, CampaignPartyDialog } from "./CampaignDialogs";
import { CampaignForm } from "./CampaignForm";

function encounterStatusLabel(status: string) {
  return encounterStatusOptions.find((option) => option.value === status)?.label ?? "Planned";
}

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
          <Modal open={modalOpen} onOpenChange={setModalOpen} title="Create campaign" trigger={<Button icon={Plus}>New campaign</Button>}>
            <CampaignForm onCreated={(campaign) => {
              setCampaigns((current) => [campaign, ...current]);
              setModalOpen(false);
            }} />
          </Modal>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading && <MutedPanel>Loading campaigns...</MutedPanel>}
      {!loading && campaigns.length === 0 && <EmptyState icon={Castle} title="No campaigns yet" copy="Create a campaign to start building party state and encounters." />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((campaign) => (
          <Link className="group rounded-lg border border-border bg-card p-5 transition hover:border-primary hover:shadow-md" key={campaign.id} to={`/campaigns/${campaign.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{campaign.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{campaign.description || "No description yet."}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Updated {new Date(campaign.updatedAt).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}

export function CampaignDetailPage() {
  const { campaignID } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [partyOpen, setPartyOpen] = useState(false);
  const [npcOpen, setNpcOpen] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [encounterName, setEncounterName] = useState("");
  const [encounterDescription, setEncounterDescription] = useState("");
  const [encounterStatus, setEncounterStatus] = useState("planned");
  const [encounterLocation, setEncounterLocation] = useState("");
  const [encounterRoomNumber, setEncounterRoomNumber] = useState("");
  const [removePlayer, setRemovePlayer] = useState<Player | null>(null);
  const [removeNpc, setRemoveNpc] = useState<Creature | null>(null);
  const [removeEncounter, setRemoveEncounter] = useState<Encounter | null>(null);
  const [allCreatures, setAllCreatures] = useState<Creature[]>([]);
  const toast = useToasts();

  async function loadCampaign() {
    if (!campaignID) return;
    setLoading(true);
    setError("");
    try {
      setDetail(await api.campaign(campaignID));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaign();
  }, [campaignID]);

  async function longRest() {
    if (!campaignID) return;
    setError("");
    try {
      const payload = await api.longRestCampaign(campaignID);
      toast.push(`Party long rested (${payload.restedPlayers} updated)`, {
        actionLabel: "Undo",
        durationMs: 8000,
        onAction: () => void api.undoLongRestCampaign(campaignID, payload.snapshot)
          .then(async () => {
            toast.push("Long rest undone");
            await loadCampaign();
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Could not undo long rest"))
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
        roomNumber: encounterRoomNumber
      });
      toast.push(`${payload.encounter.name} created`);
      setEncounterName("");
      setEncounterDescription("");
      setEncounterStatus("planned");
      setEncounterLocation("");
      setEncounterRoomNumber("");
      setEncounterOpen(false);
      await loadCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create encounter");
    }
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
        <Button variant="secondary" onClick={() => void navigate("/campaigns")}>Back to campaigns</Button>
      </Page>
    );
  }
  if (!detail) return null;

  return (
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <BackButton to="/campaigns">Back to campaigns</BackButton>
      <Breadcrumbs items={[{ label: "Campaigns", to: "/campaigns" }, { label: detail.campaign.name }]} />
      <PageHeader eyebrow="Campaign" title={detail.campaign.name} copy={detail.campaign.description || "Party state, encounters, and campaign-specific NPCs will gather here."} />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard icon={UsersRound} title="Player Characters" value={detail.playerCount} copy="Character cards will show portrait, AC, current HP, temporary HP, and key passives." />
        <DashboardCard icon={ClipboardList} title="Encounters" value={detail.encounterCount} copy="Prepared encounters will appear here with start and duplicate actions." />
        <DashboardCard icon={Swords} title="Campaign NPCs" value={detail.npcs.length} copy="Friendly NPCs, rivals, and recurring monsters linked to this campaign." />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Party" icon={UsersRound}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <div>
              <h4 className="font-semibold">Party tools</h4>
              <p className="text-sm text-muted-foreground">Manage campaign characters and rest state.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Modal open={partyOpen} onOpenChange={setPartyOpen} title="Edit party" trigger={<Button icon={UsersRound} variant="secondary">Edit party</Button>}>
                <CampaignPartyDialog campaignID={detail.campaign.id} players={detail.players} onAddPlayer={() => {
                  setPartyOpen(false);
                  void navigate("/players/new");
                }} onRemovePlayer={setRemovePlayer} />
              </Modal>
              <Button icon={HeartPulse} onClick={() => void longRest()}>Long rest party</Button>
            </div>
          </div>
          {detail.players.length === 0 ? <EmptyMini copy="No player characters yet. Use the Players section to add structured character sheets." /> : (
            <div className="grid gap-3">
              {detail.players.map((player) => <PlayerCard key={player.id} player={player} showCampaign={false} />)}
            </div>
          )}
        </SectionPanel>
        <SectionPanel title="Encounters" icon={ClipboardList}>
          {detail.encounters.length === 0 ? <EmptyMini copy="No encounters yet. Create one here, then open the full builder to add players, allies, and enemies." /> : (
            <div className="grid gap-3">
              {detail.encounters.map((encounter) => (
                <div className="rounded-md border border-border bg-background p-3" key={encounter.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{encounter.name}</div>
                      {encounter.description && <p className="mt-1 text-sm text-muted-foreground">{encounter.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{encounterStatusLabel(encounter.status)}</Badge>
                        {encounter.location && <Badge>{encounter.location}</Badge>}
                        {encounter.roomNumber && <Badge>Room {encounter.roomNumber}</Badge>}
                        <Badge>{encounter.combatantCount} combatants</Badge>
                        <Badge>{encounter.enemyCount} enemies</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" icon={Play} size="sm" onClick={() => void startEncounter(encounter, false)}>Run</Button>
                      <Button type="button" icon={FlaskConical} size="sm" variant="secondary" onClick={() => void startEncounter(encounter, true)}>Test</Button>
                      <Link to={`/campaigns/${detail.campaign.id}/encounters/${encounter.id}/edit`}>
                        <Button type="button" icon={Pencil} size="sm" variant="secondary">Edit</Button>
                      </Link>
                      <Button type="button" icon={Copy} size="sm" variant="secondary" onClick={() => void cloneEncounter(encounter)}>Clone</Button>
                      <Button type="button" icon={Trash2} size="sm" variant="danger" onClick={() => setRemoveEncounter(encounter)}>Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Modal open={encounterOpen} onOpenChange={setEncounterOpen} title="Add encounter" trigger={<Button type="button" icon={Plus} variant="success">Add encounter</Button>}>
              <form className="grid gap-4" onSubmit={(event) => void createEncounter(event)}>
                <FloatingInput label="Encounter name" value={encounterName} onChange={setEncounterName} required />
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Status"><Select value={encounterStatus} placeholder="Status" options={encounterStatusOptions} onValueChange={setEncounterStatus} /></Field>
                  <FloatingInput label="Location" value={encounterLocation} onChange={setEncounterLocation} />
                  <FloatingInput label="Room number" value={encounterRoomNumber} onChange={setEncounterRoomNumber} />
                </div>
                <Field label="Description">
                  <Textarea rows={4} value={encounterDescription} onChange={(event) => setEncounterDescription(event.target.value)} placeholder="Optional notes, setup, terrain, or goals" />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEncounterOpen(false)}>Cancel</Button>
                  <Button type="submit" icon={Plus} variant="success">Create encounter</Button>
                </div>
              </form>
            </Modal>
            <Button type="button" variant="secondary" disabled>Import encounter</Button>
          </div>
        </SectionPanel>
        <SectionPanel title="NPCs" icon={Swords}>
          {detail.npcs.length === 0 ? <EmptyMini copy="No campaign NPCs linked yet. NPC disposition can be changed later per encounter." /> : (
            <div className="grid gap-3">
              {detail.npcs.map((creature) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3" key={creature.id}>
                  <div>
                    <div className="font-semibold">{creature.name}</div>
                    <div className="text-xs text-muted-foreground">AC {creature.armorClass} · HP {creature.hitPoints} · CR {creature.challengeRating || "-"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/npcs/${creature.id}/edit`}>
                      <Button type="button" icon={Pencil} size="sm" variant="secondary">Edit</Button>
                    </Link>
                    <Button type="button" icon={Trash2} size="sm" variant="danger" onClick={() => setRemoveNpc(creature)}>Unlink</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Modal open={npcOpen} onOpenChange={setNpcOpen} title="Add campaign NPC" trigger={<Button type="button" icon={Plus} variant="success" onClick={() => void openNpcDialog()}>Add NPC link</Button>}>
              <CampaignNpcDialog creatures={allCreatures} linkedCreatureIds={detail.npcs.map((creature) => creature.id)} onLink={(creature) => void linkNpc(creature)} />
            </Modal>
            <Link to="/npcs"><Button type="button" variant="secondary">Open creature library</Button></Link>
          </div>
        </SectionPanel>
        <SectionPanel title="Recent Notes" icon={ScrollText}>
          <EmptyMini copy="Combat summaries, XP awards, and loot reminders will appear here." />
        </SectionPanel>
      </div>
      <ConfirmDialog open={Boolean(removePlayer)} title="Remove player from campaign?" confirmLabel="Remove player" onCancel={() => setRemovePlayer(null)} onConfirm={() => void confirmRemovePlayer()}>
        This will remove {removePlayer?.characterName} from this campaign.
      </ConfirmDialog>
      <ConfirmDialog open={Boolean(removeNpc)} title="Unlink NPC from campaign?" confirmLabel="Unlink NPC" onCancel={() => setRemoveNpc(null)} onConfirm={() => void confirmRemoveNpc()}>
        This removes {removeNpc?.name} from this campaign list, but keeps the reusable creature in the NPC library.
      </ConfirmDialog>
      <ConfirmDialog open={Boolean(removeEncounter)} title="Remove encounter?" confirmLabel="Remove encounter" onCancel={() => setRemoveEncounter(null)} onConfirm={() => void confirmRemoveEncounter()}>
        This removes {removeEncounter?.name} and its prepared combatants. Creature and player library records are not affected.
      </ConfirmDialog>
    </Page>
  );
}
