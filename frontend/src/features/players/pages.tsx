import { Plus, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { useUiDensity } from "../../app/uiDensity";
import { ActionRow } from "../../components/layout";
import {
  Button,
  Callout,
  ConfirmDialog,
  Field,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  SectionPanel,
  Select,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign, Player } from "../../types";
import { PlayerForm } from "./PlayerForm";
import { PlayerDensityToggle, PlayersRoster } from "./PlayersRoster";

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [removePlayer, setRemovePlayer] = useState<Player | null>(null);
  const [movePlayer, setMovePlayer] = useState<Player | null>(null);
  const [moveCampaignId, setMoveCampaignId] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const { density, onDensityChange } = useUiDensity();
  const rosterDensity = density === "compact" ? "compact" : "comfy";
  const toast = useToasts();

  useEffect(() => {
    Promise.all([api.players(), api.campaigns()])
      .then(([playerPayload, campaignPayload]) => {
        setPlayers(playerPayload.players);
        setCampaigns(campaignPayload.campaigns);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load players"))
      .finally(() => setLoading(false));
  }, []);

  function openMoveDialog(player: Player) {
    setMovePlayer(player);
    setMoveCampaignId(player.campaignId);
  }

  async function confirmMovePlayer() {
    if (!movePlayer || moveCampaignId === movePlayer.campaignId) return;
    setActionBusy(true);
    setError("");
    try {
      const payload = await api.movePlayer(movePlayer.id, moveCampaignId);
      setPlayers((current) =>
        current.map((player) => (player.id === payload.player.id ? payload.player : player)),
      );
      const destination =
        campaigns.find((campaign) => campaign.id === moveCampaignId)?.name ?? "Unassigned";
      toast.push(`${movePlayer.characterName} moved to ${destination}`);
      setMovePlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move character");
    } finally {
      setActionBusy(false);
    }
  }

  async function clonePlayer(player: Player) {
    setActionBusy(true);
    setError("");
    try {
      const payload = await api.clonePlayer(player.id);
      setPlayers((current) => [...current, payload.player]);
      toast.push(`${payload.player.characterName} created in the same campaign`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clone character");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmRemovePlayer() {
    if (!removePlayer) return;
    setError("");
    try {
      await api.deletePlayer(removePlayer.id);
      setPlayers((current) => current.filter((player) => player.id !== removePlayer.id));
      toast.push(`${removePlayer.characterName} deleted`);
      setRemovePlayer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove player");
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Players"
        title="Character sheets"
        copy="Characters are organised by campaign so party membership is clear at a glance."
        action={
          <Link to="/players/new">
            <Button icon={Plus}>Add player</Button>
          </Link>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <SectionPanel
        title="Saved characters"
        icon={UsersRound}
        action={
          <PlayerDensityToggle
            density={rosterDensity}
            onChange={(nextDensity) => onDensityChange(nextDensity)}
          />
        }
      >
        {loading && <p className="text-sm text-muted-foreground">Loading players...</p>}
        {!loading && (
          <PlayersRoster
            campaigns={campaigns}
            density={rosterDensity}
            players={players}
            onClone={(player) => void clonePlayer(player)}
            onDelete={setRemovePlayer}
            onMove={openMoveDialog}
          />
        )}
      </SectionPanel>
      <Modal
        open={Boolean(movePlayer)}
        title="Move character"
        onOpenChange={(open) => !open && setMovePlayer(null)}
      >
        <p className="text-sm text-muted-foreground">
          Choose where <strong className="text-foreground">{movePlayer?.characterName}</strong>{" "}
          should appear.
        </p>
        <Field className="mt-5" label="Campaign">
          <Select
            options={[
              ...campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id })),
              { label: "Unassigned", value: "" },
            ]}
            placeholder="Choose a campaign"
            value={moveCampaignId}
            onValueChange={setMoveCampaignId}
          />
        </Field>
        <ActionRow className="mt-6" justify="end">
          <Button type="button" variant="outline" onClick={() => setMovePlayer(null)}>
            Cancel
          </Button>
          <Button
            disabled={
              actionBusy || !movePlayer || moveCampaignId === (movePlayer?.campaignId ?? "")
            }
            type="button"
            onClick={() => void confirmMovePlayer()}
          >
            {actionBusy ? "Moving..." : "Move character"}
          </Button>
        </ActionRow>
      </Modal>
      <ConfirmDialog
        open={Boolean(removePlayer)}
        title="Delete character?"
        confirmLabel="Delete character"
        onCancel={() => setRemovePlayer(null)}
        onConfirm={() => void confirmRemovePlayer()}
      >
        This permanently removes {removePlayer?.characterName ?? "this character"} from saved
        characters. Campaign party references will also be removed.
      </ConfirmDialog>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </Page>
  );
}

export function PlayerCreatePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api
      .campaigns()
      .then((payload) => setCampaigns(payload.campaigns))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load campaigns"));
  }, []);

  return (
    <Page size="content">
      <PageHeader
        eyebrow="Players"
        title="Add player character"
        copy="Use the full page form for structured character details and derived modifiers."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <SectionPanel title="Create Player Character" icon={UserRound}>
        <PlayerForm campaigns={campaigns} onCreated={() => void navigate("/players")} />
      </SectionPanel>
    </Page>
  );
}

export function PlayerEditPage() {
  const { playerID } = useParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playerID) return;
    Promise.all([api.campaigns(), api.player(playerID)])
      .then(([campaignPayload, playerPayload]) => {
        setCampaigns(campaignPayload.campaigns);
        setPlayer(playerPayload.player);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load player"))
      .finally(() => setLoading(false));
  }, [playerID]);

  if (loading) {
    return <MutedPanel>Loading player sheet...</MutedPanel>;
  }
  if (!player || !playerID) {
    return (
      <Page>
        <Callout tone="danger">{error || "Player not found"}</Callout>
        <Link to="/players">
          <Button type="button" variant="secondary">
            Back to players
          </Button>
        </Link>
      </Page>
    );
  }

  return (
    <Page size="content">
      <BackButton to="/players">Back to players</BackButton>
      <Breadcrumbs
        items={[
          { label: "Players", to: "/players" },
          { label: player.characterName },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        eyebrow="Players"
        title={`Edit ${player.characterName}`}
        copy="Update this character sheet and campaign assignment."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <SectionPanel title="Edit Player Character" icon={UserRound}>
        <PlayerForm
          campaigns={campaigns}
          initialPlayer={player}
          submitLabel="Save player"
          onCreated={() => void navigate("/players")}
        />
      </SectionPanel>
    </Page>
  );
}
