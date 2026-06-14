import { HeartPulse, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PlayerCard } from "../../components/PlayerCard";
import { Button, EmptyMini, Modal, SectionPanel } from "../../components/ui";
import type { Player } from "../../types";
import { CampaignPartyDialog } from "./CampaignDialogs";

export function CampaignPartySection({
  campaignID,
  open,
  players,
  onLongRest,
  onOpenChange,
  onRemovePlayer,
}: {
  campaignID: string;
  open: boolean;
  players: Player[];
  onLongRest: () => void;
  onOpenChange: (open: boolean) => void;
  onRemovePlayer: (player: Player) => void;
}) {
  const navigate = useNavigate();
  return (
    <SectionPanel title="Party" icon={UsersRound}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
        <div>
          <h4 className="font-semibold">Party tools</h4>
          <p className="text-sm text-muted-foreground">
            Manage campaign characters and rest state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Edit party"
            trigger={
              <Button icon={UsersRound} variant="secondary">
                Edit party
              </Button>
            }
          >
            <CampaignPartyDialog
              campaignID={campaignID}
              players={players}
              onAddPlayer={() => {
                onOpenChange(false);
                void navigate("/players/new");
              }}
              onRemovePlayer={onRemovePlayer}
            />
          </Modal>
          <Button icon={HeartPulse} onClick={onLongRest}>
            Long rest party
          </Button>
        </div>
      </div>
      {players.length === 0 ? (
        <EmptyMini copy="No player characters yet. Use the Players section to add structured character sheets." />
      ) : (
        <div className="grid gap-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} showCampaign={false} />
          ))}
        </div>
      )}
    </SectionPanel>
  );
}
