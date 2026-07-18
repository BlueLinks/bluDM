import {
  Castle,
  DoorOpen,
  Home,
  Landmark,
  Link2,
  MapPin,
  Mountain,
  Store,
  Trees,
  Warehouse,
} from "lucide-react";
import { type FormEvent } from "react";
import { ActionRow, ResponsiveGrid } from "../../../components/layout";
import { Button, Callout, Field, Input, Modal, Textarea } from "../../../components/ui";
import { Select } from "../../../components/uiSelect";
import type { CampaignLocation, CampaignLocationInput } from "./travelTypes";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import { shopTemplateOptions } from "./campaignWorldShopTemplates";

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
  shopTemplate,
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
  onShopTemplateChange,
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
        {!editingLocation ? (
          <LocationTypeChooser value={locationType} onChange={onLocationTypeChange} />
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Field label={editingLocation ? "Edit location name" : "Location name"}>
            <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
          </Field>
          <Field label="Parent">
            <Select
              value={parentID}
              placeholder="No parent"
              options={parentOptions(locations, editingLocation)}
              onValueChange={onParentIDChange}
            />
          </Field>
        </div>
        <Field label="Specific type">
          <Select
            value={locationType}
            placeholder="Choose type"
            options={specificTypeOptions(editingLocation)}
            onValueChange={onLocationTypeChange}
          />
        </Field>
        {locationType === "dungeon" && !editingLocation ? <DungeonStudioCreateHint /> : null}
        {locationType === "shop" ? (
          <Field
            label="Shop template"
            help="Templates set a shop subtype and fill useful starter notes when the fields are still blank."
          >
            <Select
              value={shopTemplate}
              placeholder="Choose shop template"
              options={shopTemplateOptions}
              onValueChange={onShopTemplateChange}
            />
          </Field>
        ) : null}
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

function LocationTypeChooser({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const types = [
    {
      value: "region",
      title: "Region",
      copy: "A broad area with towns, routes, and landmarks.",
      icon: Mountain,
    },
    {
      value: "settlement",
      title: "Town / settlement",
      copy: "A populated place with people, services, and local notes.",
      icon: Castle,
    },
    {
      value: "dungeon",
      title: "Dungeon / cave",
      copy: "A room-based adventure site that can open in Dungeon Studio.",
      icon: Landmark,
    },
    {
      value: "shop",
      title: "Shop / business",
      copy: "A commerce-focused location with inventory and staff.",
      icon: Store,
    },
    {
      value: "landmark",
      title: "Point of interest",
      copy: "A ruin, shrine, watchtower, road marker, or clue site.",
      icon: MapPin,
    },
    {
      value: "wilderness",
      title: "Wilderness location",
      copy: "A wild place away from settlement structure.",
      icon: Trees,
    },
  ];
  return (
    <div className="grid gap-2">
      <div>
        <h3 className="font-semibold">Choose a location type</h3>
        <p className="text-sm text-muted-foreground">
          Pick the mode first; details stay simple until the place needs more prep.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {types.map((type) => {
          const Icon = type.icon;
          const active = value === type.value;
          return (
            <button
              className={[
                "flex min-w-0 items-start gap-3 rounded-md border p-3 text-left transition",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/60",
              ].join(" ")}
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block font-semibold">{type.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{type.copy}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DungeonStudioCreateHint() {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
      Creating a dungeon opens Dungeon Studio, where you choose either a fully custom map or the
      generator preview before editing.
    </div>
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
  customTypeLabel,
}: {
  parentID: string;
  name: string;
  locationType: string;
  summary: string;
  publicNotes: string;
  dmNotes: string;
  tags: string;
  mapMarker: string;
  customTypeLabel?: string;
}): CampaignLocationInput {
  const trimmedCustomTypeLabel = customTypeLabel?.trim();
  return {
    parentLocationId: parentID || undefined,
    name: name.trim(),
    locationType,
    ...(trimmedCustomTypeLabel ? { customTypeLabel: trimmedCustomTypeLabel } : {}),
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
  { label: "Place or building", value: "building", icon: Home },
  { label: "Shop", value: "shop", icon: Store },
  { label: "Home", value: "house", icon: Home },
  { label: "Dungeon", value: "dungeon", icon: Landmark },
  { label: "Floor", value: "floor", icon: DoorOpen },
  { label: "Room", value: "room", icon: DoorOpen },
  { label: "Landmark", value: "landmark", icon: MapPin },
  { label: "Wilderness location", value: "wilderness", icon: Trees },
  { label: "Portal", value: "portal", icon: Link2 },
  { label: "Custom", value: "custom", icon: Warehouse },
];

function specificTypeOptions(editingLocation: CampaignLocation | null) {
  if (editingLocation?.locationType === "floor" || editingLocation?.locationType === "room") {
    return locationTypeOptions;
  }
  return locationTypeOptions.filter(
    (option) => option.value !== "floor" && option.value !== "room",
  );
}

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
  shopTemplate: string;
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
  onShopTemplateChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onSummaryChange: (value: string) => void;
  onTagsChange: (value: string) => void;
};
