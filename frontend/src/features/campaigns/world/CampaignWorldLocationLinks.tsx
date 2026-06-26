import { Link2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ActionRow, CardSection, FieldGrid, SectionHeader } from "../../../components/layout";
import { Button, Field, Input, Modal } from "../../../components/ui";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation, CampaignLocationLink } from "./travelTypes";

export function CampaignWorldLocationLinks({
  actionLabel = "Link",
  defaultLinkType = "passage",
  emptyCopy = "No exits, roads, doors, or other linked places yet.",
  links,
  location,
  locations,
  loading,
  open: controlledOpen,
  title = "Linked locations",
  onCreate,
  onDelete,
  onOpenChange,
  onSelectLocation,
}: {
  actionLabel?: string;
  defaultLinkType?: string;
  emptyCopy?: string;
  links: CampaignLocationLink[];
  location: CampaignLocation;
  locations: CampaignLocation[];
  loading: boolean;
  open?: boolean;
  title?: string;
  onCreate: (input: LinkFormInput) => Promise<void>;
  onDelete: (linkID: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onSelectLocation: (locationID: string) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [targetID, setTargetID] = useState("");
  const [linkType, setLinkType] = useState(defaultLinkType);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const options = useMemo(
    () => locations.filter((candidate) => candidate.id !== location.id),
    [location.id, locations],
  );

  async function submitLink(event: FormEvent) {
    event.preventDefault();
    const selectedTargetID = targetID || options[0]?.id || "";
    if (!selectedTargetID) return;
    setSaving(true);
    setError("");
    try {
      await onCreate({
        sourceLocationId: location.id,
        targetLocationId: selectedTargetID,
        linkType,
        label: label.trim(),
        notes: notes.trim(),
      });
      setTargetID("");
      setLabel("");
      setNotes("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect locations");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CardSection>
      <SectionHeader
        action={
          <Button
            type="button"
            icon={Plus}
            size="sm"
            variant="secondary"
            disabled={!options.length}
            onClick={() => setOpen(true)}
          >
            {actionLabel}
          </Button>
        }
        icon={Link2}
        meta={loading ? "Loading" : links.length ? `${links.length} connected` : undefined}
        title={title}
      />

      {links.length ? (
        <div className="mt-3 grid gap-2">
          {links.map((link) => (
            <ConnectedLocationRow
              key={link.id}
              link={link}
              location={location}
              locations={locations}
              onDelete={onDelete}
              onSelectLocation={onSelectLocation}
            />
          ))}
        </div>
      ) : (
        <EmptyRelation copy={emptyCopy} />
      )}

      <Modal open={open} onOpenChange={setOpen} title="Link location">
        <form className="grid gap-4" onSubmit={submitLink}>
          <Field label="Connect to">
            <select
              className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
              value={targetID}
              onChange={(event) => setTargetID(event.target.value)}
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {locationPathLabel(option)}
                </option>
              ))}
            </select>
          </Field>
          <FieldGrid variant="link">
            <Field label="Link type">
              <select
                className="min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 transition focus:ring-2"
                value={linkType}
                onChange={(event) => setLinkType(event.target.value)}
              >
                <option value="road">Road</option>
                <option value="door">Door</option>
                <option value="stairs">Stairs</option>
                <option value="passage">Passage</option>
                <option value="portal">Portal</option>
                <option value="secret">Secret</option>
              </select>
            </Field>
            <Field label="Label">
              <Input
                placeholder="North alley, cellar hatch"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
          </FieldGrid>
          <Field label="Connection notes">
            <Input
              placeholder="Locked, hidden, one-way, guarded..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <ActionRow justify="end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={Link2} disabled={saving}>
              Connect
            </Button>
          </ActionRow>
        </form>
      </Modal>
    </CardSection>
  );
}

function ConnectedLocationRow({
  link,
  location,
  locations,
  onDelete,
  onSelectLocation,
}: {
  link: CampaignLocationLink;
  location: CampaignLocation;
  locations: CampaignLocation[];
  onDelete: (linkID: string) => Promise<void>;
  onSelectLocation: (locationID: string) => void;
}) {
  const targetID =
    link.sourceLocationId === location.id ? link.targetLocationId : link.sourceLocationId;
  const target = locations.find((candidate) => candidate.id === targetID);
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <button
        className="min-w-0 flex-1 text-left"
        type="button"
        disabled={!target}
        onClick={() => target && onSelectLocation(target.id)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 [overflow-wrap:anywhere] font-semibold">
            {target ? locationPathLabel(target) : "Unknown"}
          </span>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
            {link.linkType || "link"}
          </span>
        </div>
        {(link.label || link.notes) && (
          <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {[link.label, link.notes].filter(Boolean).join(" - ")}
          </p>
        )}
      </button>
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
  );
}

function EmptyRelation({ copy }: { copy: string }) {
  return (
    <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
      {copy}
    </p>
  );
}

export type LinkFormInput = {
  sourceLocationId: string;
  targetLocationId: string;
  linkType: string;
  label: string;
  notes: string;
};
