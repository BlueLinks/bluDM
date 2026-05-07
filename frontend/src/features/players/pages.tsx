import { Pencil, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../app/shell";
import { PlayerCard } from "../../components/PlayerCard";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  MutedPanel,
  Page,
  PageHeader,
  SectionPanel,
  ToastViewport,
  useToasts
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign, Player } from "../../types";
import { PlayerForm } from "./PlayerForm";

export function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [removePlayer, setRemovePlayer] = useState<Player | null>(null);
  const toast = useToasts();

  useEffect(() => {
    api
      .players()
      .then((payload) => setPlayers(payload.players))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load players"))
      .finally(() => setLoading(false));
  }, []);

  async function confirmRemovePlayer() {
    if (!removePlayer) return;
    setError("");
    try {
      await api.deletePlayer(removePlayer.id);
      setPlayers((current) => current.filter((player) => player.id !== removePlayer.id));
      toast.push(`${removePlayer.characterName} removed`);
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
        copy="Structured player input belongs here: stats, saves, skills, AC, health, temp HP, resources, and rest state."
        action={
          <Link to="/players/new">
            <Button icon={Plus}>Add player</Button>
          </Link>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <SectionPanel title="Saved Characters" icon={UsersRound}>
        {loading && <p className="text-sm text-muted-foreground">Loading players...</p>}
        {!loading && players.length === 0 && <EmptyMini copy="No saved players yet. Create a full player record from the Add player page." />}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <div className="grid gap-2" key={player.id}>
              <PlayerCard player={player} />
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/players/${player.id}/edit`}>
                  <Button type="button" icon={Pencil} variant="secondary" className="w-full">Edit character</Button>
                </Link>
                <Button type="button" icon={Trash2} variant="danger" onClick={() => setRemovePlayer(player)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
      <ConfirmDialog
        open={Boolean(removePlayer)}
        title="Remove player character?"
        confirmLabel="Remove character"
        onCancel={() => setRemovePlayer(null)}
        onConfirm={() => void confirmRemovePlayer()}
      >
        This will remove {removePlayer?.characterName ?? "this character"} from the character sheet page and any campaign party lists.
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
    <Page>
      <PageHeader
        eyebrow="Players"
        title="Add player character"
        copy="Use the full page form for structured character details and derived modifiers."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="max-w-5xl">
        <SectionPanel title="Create Player Character" icon={UserRound}>
          <PlayerForm campaigns={campaigns} onCreated={() => void navigate("/players")} />
        </SectionPanel>
      </div>
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
          <Button type="button" variant="secondary">Back to players</Button>
        </Link>
      </Page>
    );
  }

  return (
    <Page>
      <BackButton to="/players">Back to players</BackButton>
      <Breadcrumbs items={[{ label: "Players", to: "/players" }, { label: player.characterName }, { label: "Edit" }]} />
      <PageHeader
        eyebrow="Players"
        title={`Edit ${player.characterName}`}
        copy="Update this character sheet and campaign assignment."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="max-w-5xl">
        <SectionPanel title="Edit Player Character" icon={UserRound}>
          <PlayerForm
            campaigns={campaigns}
            initialPlayer={player}
            submitLabel="Save player"
            onCreated={() => void navigate("/players")}
          />
        </SectionPanel>
      </div>
    </Page>
  );
}
