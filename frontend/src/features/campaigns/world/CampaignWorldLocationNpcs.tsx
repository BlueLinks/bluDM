import { Eye, Plus, Trash2, UserRound } from "lucide-react";
import type React from "react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Button, Field, Input, Modal } from "../../../components/ui";
import type { Creature } from "../../../types";
import { filterSearchableOptions, SearchableOptionPicker } from "./SearchableOptionPicker";
import type { CampaignLocation, CampaignNpcLocationLink } from "./travelTypes";

export function CampaignWorldLocationNpcs({
  links,
  loading,
  location,
  npcs,
  onCreateNpc,
  commerceMode = false,
  onCreate,
  onDelete,
}: {
  links: CampaignNpcLocationLink[];
  loading: boolean;
  location: CampaignLocation;
  npcs: Creature[];
  commerceMode?: boolean;
  onCreateNpc: () => void;
  onCreate: (input: NpcLocationFormInput) => Promise<void>;
  onDelete: (linkID: string) => Promise<void>;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState<Creature | null>(null);
  const [creatureID, setCreatureID] = useState("");
  const [npcSearch, setNpcSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const connectedIDs = useMemo(() => new Set(links.map((link) => link.creatureId)), [links]);
  const options = useMemo(
    () => npcs.filter((npc) => !connectedIDs.has(npc.id)),
    [connectedIDs, npcs],
  );
  const npcOptions = useMemo(() => options.map(npcToSearchableOption), [options]);
  const filteredNpcOptions = useMemo(
    () => filterSearchableOptions(npcOptions, npcSearch),
    [npcOptions, npcSearch],
  );
  const selectedCreatureID = creatureID || filteredNpcOptions[0]?.id || options[0]?.id || "";

  async function submitLink(event: FormEvent) {
    event.preventDefault();
    if (!selectedCreatureID) return;
    setSaving(true);
    setError("");
    try {
      await onCreate({
        creatureId: selectedCreatureID,
        locationId: location.id,
        linkType: commerceMode ? "merchant" : "associated",
        visibility: "dm",
        notes: notes.trim(),
      });
      setCreatureID("");
      setNpcSearch("");
      setNotes("");
      setLinkOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect NPC");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection>
      <SectionHeader
        action={
          <ActionRow justify="end">
            <Button type="button" size="sm" variant="secondary" onClick={onCreateNpc}>
              Manage NPCs
            </Button>
            <Button
              type="button"
              icon={Plus}
              size="sm"
              variant="secondary"
              disabled={!options.length}
              onClick={() => setLinkOpen(true)}
            >
              {commerceMode ? "Add merchant" : "Add NPC"}
            </Button>
          </ActionRow>
        }
        icon={UserRound}
        meta={loading ? "Loading" : `${links.length} linked`}
        title={commerceMode ? "Merchants and staff" : "NPCs here"}
      />

      {links.length ? (
        <div className="mt-3 grid gap-2">
          {links.map((link) => (
            <ConnectedNpcRow
              key={link.id}
              link={link}
              npcs={npcs}
              onDelete={onDelete}
              onOpenNpc={setSelectedNpc}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {commerceMode
            ? "No merchants or staff are connected to this shop yet."
            : "No NPCs connected to this location yet."}
        </p>
      )}

      {!options.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          <span>No unlinked campaign NPCs are available.</span>
          <Link to="/npcs/new">
            <Button type="button" size="sm" variant="secondary">
              Create NPC
            </Button>
          </Link>
        </div>
      ) : null}

      <Modal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title={commerceMode ? "Add merchant to shop" : "Add NPC to location"}
      >
        <form className="grid gap-4" onSubmit={submitLink}>
          <SearchableOptionPicker
            emptyMessage={commerceMode ? "No matching merchants." : "No matching NPCs."}
            label={commerceMode ? "Merchant" : "NPC"}
            options={filteredNpcOptions}
            placeholder={
              commerceMode
                ? "Search by merchant name, type, alignment, or challenge..."
                : "Search by NPC name, type, alignment, or challenge..."
            }
            search={npcSearch}
            selectedID={selectedCreatureID}
            onSearchChange={setNpcSearch}
            onSelect={setCreatureID}
          />
          <Field label={commerceMode ? "Merchant notes" : "NPC notes"}>
            <Input
              placeholder={
                commerceMode
                  ? "Owner, clerk, prices, opening hours, secret stock..."
                  : "Why they are here, mood, secret, schedule..."
              }
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <ActionRow justify="end">
            <Button type="button" variant="secondary" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={UserRound} disabled={saving}>
              {commerceMode ? "Add merchant" : "Add NPC"}
            </Button>
          </ActionRow>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedNpc)}
        onOpenChange={(open) => !open && setSelectedNpc(null)}
        title={selectedNpc?.name ?? "NPC sheet"}
      >
        {selectedNpc ? <NpcSheet npc={selectedNpc} /> : null}
      </Modal>
    </CardSection>
  );
}

function npcToSearchableOption(npc: Creature) {
  const description = [npc.creatureType, npc.alignment, `CR ${npc.challengeRating || "0"}`]
    .filter(Boolean)
    .join(" - ");
  return {
    id: npc.id,
    label: npc.name,
    description,
    searchText: [npc.name, npc.creatureType, npc.alignment, npc.challengeRating, npc.description]
      .filter(Boolean)
      .join(" "),
  };
}

function ConnectedNpcRow({
  link,
  npcs,
  onDelete,
  onOpenNpc,
}: {
  link: CampaignNpcLocationLink;
  npcs: Creature[];
  onDelete: (linkID: string) => Promise<void>;
  onOpenNpc: (npc: Creature) => void;
}) {
  const npc = npcs.find((candidate) => candidate.id === link.creatureId);
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="[overflow-wrap:anywhere] font-semibold">
            {npc?.name ?? "Unknown NPC"}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
            {link.linkType.replaceAll("-", " ")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {link.notes || npc?.description || "No notes yet."}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {npc ? (
          <Button type="button" icon={Eye} size="sm" variant="ghost" onClick={() => onOpenNpc(npc)}>
            Open
          </Button>
        ) : null}
        <Button
          type="button"
          icon={Trash2}
          size="sm"
          variant="ghost"
          onClick={() => onDelete(link.id)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function NpcSheet({ npc }: { npc: Creature }) {
  return (
    <div className="grid gap-4">
      {npc.description ? <p className="text-sm text-muted-foreground">{npc.description}</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <NpcStat label="Type" value={npc.creatureType || "Unknown"} />
        <NpcStat label="AC" value={npc.armorClass || "-"} />
        <NpcStat label="HP" value={npc.hitPoints || "-"} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <NpcStat label="Alignment" value={npc.alignment || "Unknown"} />
        <NpcStat label="Challenge" value={npc.challengeRating || "0"} />
      </div>
    </div>
  );
}

function NpcStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

export type NpcLocationFormInput = {
  creatureId: string;
  locationId: string;
  linkType: string;
  visibility: string;
  notes: string;
};
