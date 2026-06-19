import { Image as ImageIcon } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { ActionRow, FieldGrid } from "../../../components/layout";
import { Button, Field, Input, Select, Textarea } from "../../../components/ui";
import { api } from "../../../lib/api";
import type {
  CampaignLocation,
  CampaignMapDistanceUnit,
  CampaignMapInput,
  CampaignMapType,
} from "./travelTypes";
import {
  mapDefaultsForLocation,
  mapDefaultsForType,
  mapTypeForLocation,
} from "./campaignWorldMapDefaults";

const mapTypeOptions = [
  { value: "world", label: "World" },
  { value: "region", label: "Region" },
  { value: "settlement", label: "Settlement / town" },
  { value: "dungeon", label: "Dungeon" },
  { value: "floor", label: "Dungeon floor" },
  { value: "custom", label: "Custom" },
];

const scaleUnitOptions = [
  { value: "feet", label: "Feet" },
  { value: "miles", label: "Miles" },
  { value: "kilometers", label: "Kilometers" },
  { value: "kilometres", label: "Kilometres" },
];

export function CampaignWorldMapForm({
  campaignId,
  currentLocation,
  onCreated,
  onError,
}: {
  campaignId: string;
  currentLocation: CampaignLocation;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const initialType = mapTypeForLocation(currentLocation);
  const initialDefaults = mapDefaultsForLocation(currentLocation);
  const [name, setName] = useState(`${currentLocation.name} map`);
  const [description, setDescription] = useState("");
  const [mapType, setMapType] = useState<CampaignMapType>(initialType);
  const [width, setWidth] = useState(String(initialDefaults.width));
  const [height, setHeight] = useState(String(initialDefaults.height));
  const [scaleDistance, setScaleDistance] = useState(String(initialDefaults.scaleDistancePerPixel));
  const [scaleUnit, setScaleUnit] = useState<CampaignMapDistanceUnit>(
    initialDefaults.scaleDistanceUnit,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    onError("");
    try {
      let imageAssetId = "";
      if (imageFile) {
        const uploaded = await api.uploadImage(imageFile, imageFile.name);
        imageAssetId = uploaded.assetId;
      }
      const payload: CampaignMapInput = {
        parentLocationId: currentLocation.id,
        name: trimmedName,
        description: description.trim(),
        mapType,
        mode: imageAssetId ? "image" : "blank",
        imageAssetId,
        width: Number(width) || 1000,
        height: Number(height) || 700,
        scaleDistancePerPixel: Number(scaleDistance) || 1,
        scaleDistanceUnit: scaleUnit,
      };
      await api.createCampaignMap(campaignId, payload);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create map");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-card p-3">
      <FieldGrid variant="worldMapForm">
        <Field label="Map name">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Type">
          <Select
            value={mapType}
            placeholder="Map type"
            options={mapTypeOptions}
            onValueChange={(value) => {
              const nextType = value as CampaignMapType;
              const nextDefaults = mapDefaultsForType(nextType);
              setMapType(nextType);
              setWidth(String(nextDefaults.width));
              setHeight(String(nextDefaults.height));
              setScaleDistance(String(nextDefaults.scaleDistancePerPixel));
              setScaleUnit(nextDefaults.scaleDistanceUnit);
            }}
          />
        </Field>
        <Field label="Width">
          <Input
            min="1"
            type="number"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
          />
        </Field>
        <Field label="Height">
          <Input
            min="1"
            type="number"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </Field>
      </FieldGrid>
      <p className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        This map will be attached to {currentLocation.name}. Use parent maps to pin this location in
        its wider context.
      </p>
      <Field label="Description / notes">
        <Textarea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Distance per pixel">
          <Input
            min="0.0001"
            step="0.0001"
            type="number"
            value={scaleDistance}
            onChange={(event) => setScaleDistance(event.target.value)}
          />
        </Field>
        <Field label="Scale unit">
          <Select
            value={scaleUnit}
            placeholder="Scale unit"
            options={scaleUnitOptions}
            onValueChange={(value) => setScaleUnit(value as CampaignMapDistanceUnit)}
          />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Optional image
            </span>
          }
        >
          <Input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setImageFile(event.target.files?.[0] ?? null)
            }
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        {mapDefaultsForType(mapType).scaleDescription}
      </p>
      <ActionRow justify="end">
        <Button type="button" disabled={!name.trim() || saving} onClick={() => void submit()}>
          Create map
        </Button>
      </ActionRow>
    </div>
  );
}
