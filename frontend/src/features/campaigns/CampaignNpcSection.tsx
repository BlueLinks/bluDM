import { Pencil, Plus, Swords, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, EmptyMini, Modal, SectionPanel } from "../../components/ui";
import type { Creature } from "../../types";
import { CampaignNpcDialog } from "./CampaignDialogs";

export function CampaignNpcSection({
  allCreatures,
  linkedNpcs,
  open,
  onLink,
  onOpenDialog,
  onOpenChange,
  onRemove,
}: {
  allCreatures: Creature[];
  linkedNpcs: Creature[];
  open: boolean;
  onLink: (creature: Creature) => void;
  onOpenDialog: () => void;
  onOpenChange: (open: boolean) => void;
  onRemove: (creature: Creature) => void;
}) {
  return (
    <SectionPanel title="NPCs" icon={Swords}>
      {linkedNpcs.length === 0 ? (
        <EmptyMini copy="No campaign NPCs linked yet. NPC disposition can be changed later per encounter." />
      ) : (
        <div className="grid gap-3">
          {linkedNpcs.map((creature) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
              key={creature.id}
            >
              <div>
                <div className="font-semibold">{creature.name}</div>
                <div className="text-xs text-muted-foreground">
                  AC {creature.armorClass} · HP {creature.hitPoints} · CR{" "}
                  {creature.challengeRating || "-"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/npcs/${creature.id}/edit`}>
                  <Button type="button" icon={Pencil} size="sm" variant="secondary">
                    Edit
                  </Button>
                </Link>
                <Button
                  type="button"
                  icon={Trash2}
                  size="sm"
                  variant="danger"
                  onClick={() => onRemove(creature)}
                >
                  Unlink
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Modal
          open={open}
          onOpenChange={onOpenChange}
          title="Add campaign NPC"
          trigger={
            <Button type="button" icon={Plus} onClick={onOpenDialog}>
              Add NPC link
            </Button>
          }
        >
          <CampaignNpcDialog
            creatures={allCreatures}
            linkedCreatureIds={linkedNpcs.map((creature) => creature.id)}
            onLink={onLink}
          />
        </Modal>
        <Link to="/npcs">
          <Button type="button" variant="secondary">
            Open creature library
          </Button>
        </Link>
      </div>
    </SectionPanel>
  );
}
