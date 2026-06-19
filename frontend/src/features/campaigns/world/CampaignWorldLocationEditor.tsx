import {
  Castle,
  DoorOpen,
  Home,
  Landmark,
  Link2,
  MapPin,
  Mountain,
  Store,
  Warehouse,
} from "lucide-react";
import type { FormEvent } from "react";
import { ActionRow, ResponsiveGrid } from "../../../components/layout";
import { Button, Callout, Field, Input, Modal, Textarea } from "../../../components/ui";
import { Select } from "../../../components/uiSelect";
import type { CampaignLocation, CampaignLocationInput } from "./travelTypes";
import { locationPathLabel } from "./campaignWorldLocationUtils";

export function CampaignWorldLocationEditor({
  editingLocation,
  error,
  locationType,
  locations,
  mapMarker,
  name,
  open,
  parentID,
  publicNotes,
  summary,
  tags,
  dmNotes,
  onClose,
  onDmNotesChange,
  onLocationTypeChange,
  onMapMarkerChange,
  onNameChange,
  onOpenChange,
  onParentIDChange,
  onPublicNotesChange,
  onSubmit,
  onSummaryChange,
  onTagsChange,
}: CampaignWorldLocationEditorProps) {
  return (
    <Modal
      open={open}
      title={editingLocation ? "Edit World Location" : "Add World Location"}
      onOpenChange={onOpenChange}
      className="max-w-3xl"
    >
      {error && <Callout tone="danger">{error}</Callout>}
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label={editingLocation ? "Edit location name" : "Location name"}>
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </Field>
        <ResponsiveGrid variant="form2">
          <Field label="Type">
            <Select
              value={locationType}
              placeholder="Choose type"
              options={locationTypeOptions}
              onValueChange={onLocationTypeChange}
            />
          </Field>
          <Field label="Parent">
            <Select
              value={parentID}
              placeholder="No parent"
              options={parentOptions(locations, editingLocation)}
              onValueChange={onParentIDChange}
            />
          </Field>
        </ResponsiveGrid>
        <Field label="Summary">
          <Input value={summary} onChange={(event) => onSummaryChange(event.target.value)} />
        </Field>
        <Field label="Public notes">
          <Textarea
            rows={3}
            value={publicNotes}
            onChange={(event) => onPublicNotesChange(event.target.value)}
          />
        </Field>
        <Field label="DM-only notes">
          <Textarea
            rows={3}
            value={dmNotes}
            onChange={(event) => onDmNotesChange(event.target.value)}
          />
        </Field>
        <ResponsiveGrid variant="form2">
          <Field label="Tags">
            <Input
              placeholder="shop, rumor hub, hidden"
              value={tags}
              onChange={(event) => onTagsChange(event.target.value)}
            />
          </Field>
          <Field label="Map marker">
            <Input
              placeholder="town-pin, cellar-room, portal"
              value={mapMarker}
              onChange={(event) => onMapMarkerChange(event.target.value)}
            />
          </Field>
        </ResponsiveGrid>
        <ActionRow justify="end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{editingLocation ? "Save location" : "Create location"}</Button>
        </ActionRow>
      </form>
    </Modal>
  );
}

export function worldLocationPayload({
  parentID,
  name,
  locationType,
  summary,
  publicNotes,
  dmNotes,
  tags,
  mapMarker,
}: {
  parentID: string;
  name: string;
  locationType: string;
  summary: string;
  publicNotes: string;
  dmNotes: string;
  tags: string;
  mapMarker: string;
}): CampaignLocationInput {
  return {
    parentLocationId: parentID || undefined,
    name: name.trim(),
    locationType,
    summary: summary.trim(),
    notes: publicNotes.trim(),
    publicNotes: publicNotes.trim(),
    dmNotes: dmNotes.trim(),
    tags: tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    mapAnchor: mapMarker.trim() ? { marker: mapMarker.trim() } : {},
  };
}

const locationTypeOptions = [
  { label: "Region", value: "region", icon: Mountain },
  { label: "Town or settlement", value: "settlement", icon: Castle },
  { label: "Shop", value: "shop", icon: Store },
  { label: "Home", value: "house", icon: Home },
  { label: "Dungeon", value: "dungeon", icon: Landmark },
  { label: "Floor", value: "floor", icon: DoorOpen },
  { label: "Room", value: "room", icon: DoorOpen },
  { label: "Landmark", value: "landmark", icon: MapPin },
  { label: "Portal", value: "portal", icon: Link2 },
  { label: "Custom", value: "custom", icon: Warehouse },
];

function parentOptions(locations: CampaignLocation[], editingLocation: CampaignLocation | null) {
  return [
    { label: "No parent", value: "" },
    ...locations
      .filter((location) => location.id !== editingLocation?.id)
      .map((location) => ({
        label: locationPathLabel(location),
        value: location.id,
      })),
  ];
}

type CampaignWorldLocationEditorProps = {
  editingLocation: CampaignLocation | null;
  error: string;
  locationType: string;
  locations: CampaignLocation[];
  mapMarker: string;
  name: string;
  open: boolean;
  parentID: string;
  publicNotes: string;
  summary: string;
  tags: string;
  dmNotes: string;
  onClose: () => void;
  onDmNotesChange: (value: string) => void;
  onLocationTypeChange: (value: string) => void;
  onMapMarkerChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onParentIDChange: (value: string) => void;
  onPublicNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onSummaryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
};
