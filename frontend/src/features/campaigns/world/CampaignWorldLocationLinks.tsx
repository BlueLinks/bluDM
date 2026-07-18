import { Link2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ActionRow, CardSection, FieldGrid, SectionHeader } from "../../../components/layout";
import { Button, Field, Input, Modal } from "../../../components/ui";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { InferredRoomConnection } from "./campaignWorldConnectedRooms";
import type { CampaignLocation, CampaignLocationLink } from "./travelTypes";

export function CampaignWorldLocationLinks({
  actionLabel = "Link",
  defaultLinkType = "passage",
  emptyCopy = "No linked places yet.",
  inferredConnections = [],
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
  inferredConnections?: InferredRoomConnection[];
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
  const visibleInferredConnections = useMemo(
    () =>
      inferredConnections.filter(
        (connection) =>
          !links.some((link) => linkedTargetId(link, location.id) === connection.targetLocation.id),
      ),
    [inferredConnections, links, location.id],
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
        meta={
          loading
            ? "Loading"
            : links.length || visibleInferredConnections.length
              ? `${links.length + visibleInferredConnections.length} connected`
              : undefined
        }
        title={title}
      />

      {links.length || visibleInferredConnections.length ? (
        <div className="mt-3 grid gap-2">
          {visibleInferredConnections.map((connection) => (
            <InferredConnectedRoomRow
              connection={connection}
              key={connection.id}
              onSelectLocation={onSelectLocation}
            />
          ))}
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

function InferredConnectedRoomRow({
  connection,
  onSelectLocation,
}: {
  connection: InferredRoomConnection;
  onSelectLocation: (locationID: string) => void;
}) {
  const targetName = readableLocationName(connection.targetLocation);
  return (
    <button
      className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-surface-foreground transition hover:border-primary/60 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      type="button"
      onClick={() => onSelectLocation(connection.targetLocation.id)}
    >
      <span className="min-w-0">
        <span className="block font-semibold [overflow-wrap:anywhere]">
          {connectionText(connection.connectionType, targetName)}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Connected room from the Dungeon Studio map
        </span>
      </span>
    </button>
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
  const targetName = target ? readableLocationName(target) : fallbackLinkedTargetName(targetID);
  const supportingText = link.notes.trim();
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <button
        className="min-w-0 flex-1 text-left"
        type="button"
        disabled={!target}
        onClick={() => target && onSelectLocation(target.id)}
      >
        <div className="min-w-0 [overflow-wrap:anywhere] font-semibold">
          {connectionText(link.linkType, targetName, link.label)}
        </div>
        {supportingText ? (
          <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {supportingText}
          </p>
        ) : null}
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

function linkedTargetId(link: CampaignLocationLink, locationId: string) {
  return link.sourceLocationId === locationId ? link.targetLocationId : link.sourceLocationId;
}

function connectionText(linkType: string, targetName: string, label = "") {
  const routeName = label.trim();
  if (routeName && !looksInternalId(routeName)) return `${routeName} to ${targetName}`;
  const type = readableConnectionType(linkType);
  if (type === "connected") return `Connected to ${targetName}`;
  return `${type} to ${targetName}`;
}

function readableConnectionType(linkType: string) {
  const normalized = linkType.trim().toLowerCase();
  if (normalized === "door") return "Door";
  if (normalized === "stairs" || normalized === "stair") return "Stairs";
  if (normalized === "passage") return "Passage";
  if (normalized === "portal") return "Portal";
  if (normalized === "secret") return "Secret route";
  if (normalized === "road") return "Road";
  return "connected";
}

function readableLocationName(location: CampaignLocation) {
  const name = location.name.trim();
  if (name && !looksInternalId(name)) return name;
  return fallbackLocationName(location);
}

function fallbackLocationName(location: Pick<CampaignLocation, "id" | "locationType">) {
  if ((location.locationType ?? "").toLowerCase() === "room") {
    if (isUuid(location.id)) return "Unnamed room";
    const roomNumber = trailingNumber(location.id);
    return roomNumber ? `Room ${roomNumber}` : "Unnamed room";
  }
  return "Unnamed location";
}

function fallbackLinkedTargetName(targetID: string) {
  if (/^room[-_]/i.test(targetID)) {
    return fallbackLocationName({ id: targetID, locationType: "room" });
  }
  return "Unnamed location";
}

function looksInternalId(value: string) {
  const trimmed = value.trim();
  return isUuid(trimmed) || /^[a-z]+-[0-9a-f-]{6,}$/i.test(trimmed);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function trailingNumber(value: string) {
  return value.match(/(\d+)$/)?.[1] ?? "";
}

export type LinkFormInput = {
  sourceLocationId: string;
  targetLocationId: string;
  linkType: string;
  label: string;
  notes: string;
};
