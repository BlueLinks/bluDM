import { MoreHorizontal, Pencil, Search, Swords, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { Button, EmptyMini, Input, Modal, SectionPanel } from "../../components/ui";
import { ListPagination } from "../encounters/EncounterList";
import type { Creature } from "../../types";
import { CampaignNpcDialog } from "./CampaignDialogs";

export function CampaignNpcOverview({
  allCreatures,
  npcs,
  open,
  onLink,
  onOpenChange,
  onOpenDialog,
  onRemove,
}: {
  allCreatures: Creature[];
  npcs: Creature[];
  open: boolean;
  onLink: (npc: Creature) => void;
  onOpenChange: (open: boolean) => void;
  onOpenDialog: () => void;
  onRemove: (npc: Creature) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return npcs.filter((npc) =>
      `${npc.name} ${npc.creatureType} ${npc.description}`.toLowerCase().includes(needle),
    );
  }, [npcs, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * 5, safePage * 5 + 5);

  useEffect(() => setPage(0), [query]);

  return (
    <SectionPanel
      className="min-w-0"
      title={`Campaign NPCs · ${npcs.length}`}
      icon={Swords}
      action={
        <div className="flex gap-2">
          <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Add campaign NPC"
            trigger={
              <Button type="button" size="sm" variant="secondary" onClick={onOpenDialog}>
                Link NPC
              </Button>
            }
          >
            <CampaignNpcDialog
              creatures={allCreatures}
              linkedCreatureIds={npcs.map((npc) => npc.id)}
              onLink={onLink}
            />
          </Modal>
          <Link to="/npcs">
            <Button type="button" size="sm" variant="outline">
              View all
            </Button>
          </Link>
        </div>
      }
    >
      <label className="relative mb-3 block">
        <span className="sr-only">Search campaign NPCs</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search campaign NPCs"
          className="bg-surface pl-9"
          placeholder="Search NPCs"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visible.length ? (
        <div className="divide-y divide-border overflow-visible rounded-lg border border-border bg-background">
          {visible.map((npc) => (
            <NpcRow key={npc.id} npc={npc} onRemove={onRemove} />
          ))}
        </div>
      ) : (
        <EmptyMini
          copy={npcs.length ? "No NPCs match this search." : "No campaign NPCs linked yet."}
        />
      )}
      <div className="mt-3">
        <ListPagination
          count={filtered.length}
          itemLabel="NPCs"
          page={safePage}
          pageCount={pageCount}
          pageSize={5}
          onPageChange={setPage}
        />
      </div>
    </SectionPanel>
  );
}

function NpcRow({ npc, onRemove }: { npc: Creature; onRemove: (npc: Creature) => void }) {
  const avatarSrc = npc.imageAssetId ? `/api/assets/${npc.imageAssetId}` : npc.avatarUrl;
  return (
    <article className="flex min-w-0 items-center gap-3 px-3 py-3">
      <InitialsAvatar name={npc.name} size="sm" src={avatarSrc} tone="tertiary" />
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold">{npc.name}</h4>
        <p className="truncate text-xs text-muted-foreground">
          {[
            npc.creatureType,
            `AC ${npc.armorClass}`,
            `HP ${npc.hitPoints}`,
            `CR ${npc.challengeRating || "—"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <details className="relative shrink-0">
        <summary
          aria-label={`Actions for ${npc.name}`}
          className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md border border-border bg-surface text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden"
        >
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-20 mt-1 grid w-40 rounded-lg border border-border bg-card p-1 shadow-xl">
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface"
            to={`/npcs/${npc.id}/edit`}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <button
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-surface"
            type="button"
            onClick={() => onRemove(npc)}
          >
            <Trash2 className="h-4 w-4" />
            Unlink
          </button>
        </div>
      </details>
    </article>
  );
}
