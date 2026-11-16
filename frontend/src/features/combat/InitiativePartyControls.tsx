import { HeartPulse, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionRow } from "../../components/layout";
import { Button, Callout, Input, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import type { EncounterRun, EncounterRunCombatant, Player } from "../../types";

export function InitiativePartyControls({
  busy,
  campaignID,
  players,
  runID,
  onCommand,
}: {
  busy: boolean;
  campaignID?: string;
  players: EncounterRunCombatant[];
  runID: string;
  onCommand: (fn: () => Promise<{ run: EncounterRun }>) => Promise<EncounterRun | null>;
}) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [healed, setHealed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void api.players().then(
      ({ players: allPlayers }) => {
        if (!cancelled) {
          setAvailable(allPlayers);
          setLoading(false);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load players");
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const choices = available.filter(
    (player) =>
      player.campaignId === campaignID &&
      !players.some((combatant) => combatant.playerId === player.id) &&
      `${player.characterName} ${player.playerName}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <ActionRow>
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={Plus}
          disabled={busy || !campaignID}
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
        >
          Add player
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={HeartPulse}
          disabled={busy || players.length === 0}
          onClick={() => {
            void onCommand(() => api.healRunParty(runID)).then((next) => setHealed(Boolean(next)));
          }}
        >
          Heal all
        </Button>
        {healed ? (
          <span role="status" className="text-xs text-success">
            Party healed to full HP.
          </span>
        ) : null}
      </ActionRow>
      <Modal open={open} onOpenChange={setOpen} title="Add player to this run">
        <div className="grid min-w-0 gap-3">
          <Input
            aria-label="Search party players"
            placeholder="Search players"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {error ? <Callout tone="danger">{error}</Callout> : null}
          {loading ? <p role="status">Loading players…</p> : null}
          {!loading && !error && choices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available players in this campaign.</p>
          ) : null}
          <ul className="grid max-h-72 min-h-0 gap-2 overflow-y-auto">
            {choices.map((player) => (
              <li key={player.id}>
                <ActionRow justify="between">
                  <div className="min-w-0">
                    <div className="break-words font-medium">{player.characterName}</div>
                    <div className="text-xs text-muted-foreground">{player.playerName}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    aria-label={`Add ${player.characterName}`}
                    onClick={() => {
                      void onCommand(() => api.addRunPlayer(runID, player.id)).then((next) => {
                        if (next) {
                          setOpen(false);
                          setHealed(false);
                        } else {
                          setError("Could not add this player. Try again.");
                        }
                      });
                    }}
                  >
                    Add
                  </Button>
                </ActionRow>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}
