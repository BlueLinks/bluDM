import type { FormEvent } from "react";
import { CampaignWorldLocationEditor } from "./CampaignWorldLocationEditor";
import { DeleteLocationConfirm } from "./CampaignWorldSectionHelpers";
import type { CampaignLocation } from "./travelTypes";

export function CampaignWorldLocationEditorDialogs({
  deleteLocation,
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
  onCancelDelete,
  onClose,
  onConfirmDelete,
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
}: CampaignWorldLocationEditorDialogsProps) {
  return (
    <>
      <CampaignWorldLocationEditor
        editingLocation={editingLocation}
        error={error}
        locationType={locationType}
        mapMarker={mapMarker}
        name={name}
        open={open}
        parentID={parentID}
        publicNotes={publicNotes}
        shopTemplate={shopTemplate}
        summary={summary}
        tags={tags}
        locations={locations}
        dmNotes={dmNotes}
        onClose={onClose}
        onDmNotesChange={onDmNotesChange}
        onLocationTypeChange={onLocationTypeChange}
        onMapMarkerChange={onMapMarkerChange}
        onNameChange={onNameChange}
        onOpenChange={onOpenChange}
        onParentIDChange={onParentIDChange}
        onPublicNotesChange={onPublicNotesChange}
        onShopTemplateChange={onShopTemplateChange}
        onSubmit={onSubmit}
        onSummaryChange={onSummaryChange}
        onTagsChange={onTagsChange}
      />
      <DeleteLocationConfirm
        locationName={deleteLocation?.name}
        open={Boolean(deleteLocation)}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

type CampaignWorldLocationEditorDialogsProps = {
  deleteLocation: CampaignLocation | null;
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
  onCancelDelete: () => void;
  onClose: () => void;
  onConfirmDelete: () => void;
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
