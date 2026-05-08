import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyMini, FloatingInput } from "../../components/ui";
import type { Creature, Player } from "../../types";

export function CampaignPartyDialog({
  campaignID,
  players,
  onAddPlayer,
  onRemovePlayer,
}: {
  campaignID: string;
  players: Player[];
  onAddPlayer: () => void;
  onRemovePlayer: (player: Player) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Party members</h3>
            <p className="text-sm text-muted-foreground">
              Add full character sheets from the player editor, or remove characters from this
              campaign.
            </p>
          </div>
          <Button type="button" icon={Plus} variant="success" onClick={onAddPlayer}>
            Add player
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          {players.length === 0 && <EmptyMini copy="No players in this campaign yet." />}
          {players.map((player) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
              key={player.id}
            >
              <div>
                <div className="font-semibold">{player.characterName}</div>
                <div className="text-xs text-muted-foreground">
                  AC {player.armorClass} · HP {player.currentHitPoints}/{player.maxHitPoints}
                </div>
              </div>
              <Button
                type="button"
                icon={Trash2}
                variant="danger"
                size="sm"
                onClick={() => onRemovePlayer(player)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="font-semibold">Campaign NPCs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            NPC linking will use the creature library once campaign-scoped NPC membership lands.
          </p>
          <Link className="mt-3 inline-flex" to="/npcs">
            <Button type="button" variant="secondary">
              Open creature library
            </Button>
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="font-semibold">Encounters</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Encounter creation is planned as a full-page builder so it can reuse party and NPC data
            cleanly.
          </p>
          <Button className="mt-3" type="button" variant="secondary" disabled>
            Encounter builder pending
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Campaign ID: {campaignID}</p>
    </div>
  );
}

export function CampaignNpcDialog({
  creatures,
  linkedCreatureIds,
  onLink,
}: {
  creatures: Creature[];
  linkedCreatureIds: string[];
  onLink: (creature: Creature) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = creatures.filter((creature) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      creature.name.toLowerCase().includes(query) ||
      creature.creatureType.toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid gap-4">
      <FloatingInput
        icon={Search}
        label="Search NPCs and monsters"
        value={search}
        onChange={setSearch}
      />
      <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
        {filtered.map((creature) => {
          const linked = linkedCreatureIds.includes(creature.id);
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
              key={creature.id}
            >
              <div>
                <div className="font-semibold">{creature.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[creature.size, creature.creatureType, `CR ${creature.challengeRating || "-"}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Button
                type="button"
                icon={Plus}
                variant={linked ? "secondary" : "success"}
                size="sm"
                disabled={linked}
                onClick={() => onLink(creature)}
              >
                {linked ? "Linked" : "Link"}
              </Button>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyMini copy="No creatures match that search." />}
      </div>
    </div>
  );
}
