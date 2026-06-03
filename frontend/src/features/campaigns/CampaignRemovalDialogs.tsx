import { ConfirmDialog } from "../../components/ui";
import type { Creature, Encounter, Player } from "../../types";

export function CampaignRemovalDialogs({
  encounter,
  npc,
  onCancelEncounter,
  onCancelNpc,
  onCancelPlayer,
  onConfirmEncounter,
  onConfirmNpc,
  onConfirmPlayer,
  player,
}: {
  encounter: Encounter | null;
  npc: Creature | null;
  onCancelEncounter: () => void;
  onCancelNpc: () => void;
  onCancelPlayer: () => void;
  onConfirmEncounter: () => void;
  onConfirmNpc: () => void;
  onConfirmPlayer: () => void;
  player: Player | null;
}) {
  return (
    <>
      <ConfirmDialog
        open={Boolean(player)}
        title="Remove player from campaign?"
        confirmLabel="Remove player"
        onCancel={onCancelPlayer}
        onConfirm={onConfirmPlayer}
      >
        This will remove {player?.characterName} from this campaign.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(npc)}
        title="Unlink NPC from campaign?"
        confirmLabel="Unlink NPC"
        onCancel={onCancelNpc}
        onConfirm={onConfirmNpc}
      >
        This removes {npc?.name} from this campaign list, but keeps the reusable creature in the NPC
        library.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(encounter)}
        title="Remove encounter?"
        confirmLabel="Remove encounter"
        onCancel={onCancelEncounter}
        onConfirm={onConfirmEncounter}
      >
        This removes {encounter?.name} and its prepared combatants. Creature and player library
        records are not affected.
      </ConfirmDialog>
    </>
  );
}
