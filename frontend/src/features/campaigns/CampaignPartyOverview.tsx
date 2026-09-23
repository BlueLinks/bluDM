import { HeartPulse, Shield, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ClassNameText } from "../../components/shared/categoryText";
import { InitialsAvatar, VitalStatCard } from "../../components/shared/displayPrimitives";
import { Button, EmptyMini, Modal, SectionPanel } from "../../components/ui";
import type { Player } from "../../types";
import { CampaignPartyDialog } from "./CampaignDialogs";

export function CampaignPartyOverview({
  campaignId,
  open,
  players,
  onLongRest,
  onOpenChange,
  onRemovePlayer,
}: {
  campaignId: string;
  open: boolean;
  players: Player[];
  onLongRest: () => void;
  onOpenChange: (open: boolean) => void;
  onRemovePlayer: (player: Player) => void;
}) {
  const navigate = useNavigate();
  return (
    <SectionPanel
      title={`Party · ${players.length}`}
      icon={UsersRound}
      action={
        <div className="flex flex-wrap gap-2">
          <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Edit party"
            trigger={
              <Button type="button" size="sm" variant="secondary">
                Edit party
              </Button>
            }
          >
            <CampaignPartyDialog
              campaignID={campaignId}
              players={players}
              onAddPlayer={() => {
                onOpenChange(false);
                void navigate("/players/new");
              }}
              onRemovePlayer={onRemovePlayer}
            />
          </Modal>
          <Button type="button" icon={HeartPulse} size="sm" onClick={onLongRest}>
            Long rest
          </Button>
        </div>
      }
    >
      {players.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <PartyMember key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <EmptyMini copy="No player characters are assigned to this campaign." />
      )}
    </SectionPanel>
  );
}

function PartyMember({ player }: { player: Player }) {
  const sheet = player.characterSheet;
  const className = typeof sheet.className === "string" ? sheet.className : "Adventurer";
  const level = typeof sheet.level === "number" ? sheet.level : undefined;
  const avatarSrc = player.avatarAssetId ? `/api/assets/${player.avatarAssetId}` : player.avatarUrl;
  return (
    <article className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-3">
      <div className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={player.characterName} size="md" src={avatarSrc} />
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-semibold">{player.characterName}</h4>
          <p className="truncate text-sm">
            <ClassNameText>{className}</ClassNameText>
            {level ? <span className="text-muted-foreground"> · Level {level}</span> : null}
          </p>
          {player.playerName ? (
            <p className="truncate text-xs text-muted-foreground">{player.playerName}</p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <VitalStatCard icon={Shield} label="AC" size="sm" value={player.armorClass} />
        <VitalStatCard
          icon={HeartPulse}
          label="HP"
          size="sm"
          tone="tertiary"
          value={`${player.currentHitPoints}/${player.maxHitPoints + player.temporaryMaxHitPoints}`}
        />
      </div>
    </article>
  );
}
