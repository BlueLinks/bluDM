import { Eye, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { avatarImageSrc } from "../../../components/AvatarImagePicker";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { InitialsAvatar, PropertyCard } from "../../../components/shared/displayPrimitives";
import { Button, Field, Input, Modal } from "../../../components/ui";
import type { Creature } from "../../../types";
import { CampaignWorldEmptyState } from "./CampaignWorldEmptyState";
import {
  filterSearchableOptions,
  SearchableOptionPicker,
  type SearchableOption,
} from "./SearchableOptionPicker";
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
  const [linkType, setLinkType] = useState(commerceMode ? "merchant" : "associated");
  const [notes, setNotes] = useState("");
  const [editingLink, setEditingLink] = useState<CampaignNpcLocationLink | null>(null);
  const [editLinkType, setEditLinkType] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
        linkType: linkType.trim() || (commerceMode ? "merchant" : "associated"),
        visibility: "dm",
        notes: notes.trim(),
      });
      setCreatureID("");
      setNpcSearch("");
      setLinkType(commerceMode ? "merchant" : "associated");
      setNotes("");
      setLinkOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect NPC");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingLink) return;
    setSaving(true);
    setError("");
    try {
      await onDelete(editingLink.id);
      await onCreate({
        creatureId: editingLink.creatureId,
        locationId: location.id,
        linkType: editLinkType.trim() || editingLink.linkType || "associated",
        visibility: editingLink.visibility || "dm",
        notes: editNotes.trim(),
      });
      setEditingLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update NPC role");
    } finally {
      setSaving(false);
    }
  }

  function openEditLink(link: CampaignNpcLocationLink) {
    setEditingLink(link);
    setEditLinkType(link.linkType || (commerceMode ? "merchant" : "associated"));
    setEditNotes(link.notes || "");
    setError("");
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
        meta={loading ? "Loading" : links.length ? `${links.length} here` : undefined}
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
              onEdit={openEditLink}
              onOpenNpc={setSelectedNpc}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <CampaignWorldEmptyState
            icon={UserRound}
            title={commerceMode ? "No staff linked yet" : "No NPCs here yet"}
            copy={
              commerceMode
                ? "Link an owner, clerk, or regular employee so shop prep starts with people."
                : "Link residents, visitors, enemies, or witnesses who matter in this place."
            }
          />
        </div>
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

      <NpcLinkModal
        commerceMode={commerceMode}
        creatureID={selectedCreatureID}
        error={error}
        linkType={linkType}
        notes={notes}
        npcSearch={npcSearch}
        open={linkOpen}
        options={filteredNpcOptions}
        saving={saving}
        onCreatureChange={setCreatureID}
        onLinkTypeChange={setLinkType}
        onNotesChange={setNotes}
        onOpenChange={setLinkOpen}
        onSearchChange={setNpcSearch}
        onSubmit={submitLink}
      />

      <NpcRoleModal
        commerceMode={commerceMode}
        editingLink={editingLink}
        error={error}
        linkType={editLinkType}
        notes={editNotes}
        saving={saving}
        onClose={() => setEditingLink(null)}
        onLinkTypeChange={setEditLinkType}
        onNotesChange={setEditNotes}
        onSubmit={submitEdit}
      />

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

function NpcLinkModal({
  commerceMode,
  creatureID,
  error,
  linkType,
  notes,
  npcSearch,
  open,
  options,
  saving,
  onCreatureChange,
  onLinkTypeChange,
  onNotesChange,
  onOpenChange,
  onSearchChange,
  onSubmit,
}: {
  commerceMode: boolean;
  creatureID: string;
  error: string;
  linkType: string;
  notes: string;
  npcSearch: string;
  open: boolean;
  options: SearchableOption[];
  saving: boolean;
  onCreatureChange: (value: string) => void;
  onLinkTypeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={commerceMode ? "Add merchant to shop" : "Add NPC to location"}
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <SearchableOptionPicker
          emptyMessage={commerceMode ? "No matching merchants." : "No matching NPCs."}
          label={commerceMode ? "Merchant" : "NPC"}
          options={options}
          placeholder={commerceMode ? "Search merchant roster..." : "Search campaign NPCs..."}
          search={npcSearch}
          selectedID={creatureID}
          onSearchChange={onSearchChange}
          onSelect={onCreatureChange}
        />
        <Field label={commerceMode ? "Role in shop" : "Role in location"}>
          <Input
            placeholder={commerceMode ? "owner, clerk, fence" : "resident, visitor, guard"}
            value={linkType}
            onChange={(event) => onLinkTypeChange(event.target.value)}
          />
        </Field>
        <Field label={commerceMode ? "Merchant notes" : "NPC notes"}>
          <Input value={notes} onChange={(event) => onNotesChange(event.target.value)} />
        </Field>
        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        <ActionRow justify="end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" icon={UserRound} disabled={saving}>
            {commerceMode ? "Add merchant" : "Add NPC"}
          </Button>
        </ActionRow>
      </form>
    </Modal>
  );
}

function NpcRoleModal({
  commerceMode,
  editingLink,
  error,
  linkType,
  notes,
  saving,
  onClose,
  onLinkTypeChange,
  onNotesChange,
  onSubmit,
}: {
  commerceMode: boolean;
  editingLink: CampaignNpcLocationLink | null;
  error: string;
  linkType: string;
  notes: string;
  saving: boolean;
  onClose: () => void;
  onLinkTypeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}) {
  return (
    <Modal
      open={Boolean(editingLink)}
      onOpenChange={(open) => !open && onClose()}
      title="Edit NPC role here"
    >
      {editingLink ? (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Field label={commerceMode ? "Role in shop" : "Role in location"}>
            <Input value={linkType} onChange={(event) => onLinkTypeChange(event.target.value)} />
          </Field>
          <Field label={commerceMode ? "Merchant notes" : "NPC notes"}>
            <Input value={notes} onChange={(event) => onNotesChange(event.target.value)} />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <ActionRow justify="end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" icon={UserRound} disabled={saving}>
              Save role
            </Button>
          </ActionRow>
        </form>
      ) : null}
    </Modal>
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
  onEdit,
  onOpenNpc,
}: {
  link: CampaignNpcLocationLink;
  npcs: Creature[];
  onDelete: (linkID: string) => Promise<void>;
  onEdit: (link: CampaignNpcLocationLink) => void;
  onOpenNpc: (npc: Creature) => void;
}) {
  const npc = npcs.find((candidate) => candidate.id === link.creatureId);
  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <NpcAvatar npc={npc} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="[overflow-wrap:anywhere] font-semibold">
              {npc?.name ?? "Unknown NPC"}
            </span>
            <span className="rounded-md border border-border px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground">
              {link.linkType.replaceAll("-", " ")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {link.notes || npc?.description || "No notes yet."}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1">
        {npc ? (
          <Button type="button" icon={Eye} size="sm" variant="ghost" onClick={() => onOpenNpc(npc)}>
            Open
          </Button>
        ) : null}
        <Button type="button" icon={Pencil} size="sm" variant="ghost" onClick={() => onEdit(link)}>
          Edit
        </Button>
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

function NpcAvatar({ npc }: { npc?: Creature }) {
  const src = avatarImageSrc(npc?.imageAssetId, npc?.avatarUrl);
  return <InitialsAvatar name={npc?.name || "NPC"} size="sm" src={src} />;
}

function NpcSheet({ npc }: { npc: Creature }) {
  return (
    <div className="grid gap-4">
      {npc.description ? <p className="text-sm text-muted-foreground">{npc.description}</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <PropertyCard label="Type" value={npc.creatureType || "Unknown"} />
        <PropertyCard label="AC" value={npc.armorClass || "-"} tone="primary" />
        <PropertyCard label="HP" value={npc.hitPoints || "-"} tone="tertiary" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <PropertyCard label="Alignment" value={npc.alignment || "Unknown"} />
        <PropertyCard label="Challenge" value={npc.challengeRating || "0"} tone="custom" />
      </div>
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
