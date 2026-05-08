import { Pencil, Plus, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import { Button, Field, FormSection, Input, Select } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign, PlayerFormState, StandardLibraryEntry } from "../../types";

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

const pickerCategories = ["classes", "species", "backgrounds", "feats"];

export function PlayerBasicsSection({
  campaigns,
  form,
  setForm,
}: {
  campaigns: Campaign[];
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  const [entries, setEntries] = useState<StandardLibraryEntry[]>([]);
  const [featInput, setFeatInput] = useState("");
  const selectedCampaign = campaigns.find((campaign) => campaign.id === form.campaignId);
  const sources = selectedCampaign?.allowedStandardSources ?? ["srd-2014"];

  useEffect(() => {
    if (!form.campaignId) return;
    void Promise.all(
      pickerCategories.map((category) => api.standardLibraryEntries({ category, source: sources })),
    ).then((payloads) => setEntries(payloads.flatMap((payload) => payload.entries)));
  }, [form.campaignId, sources.join(",")]);

  const optionsByCategory = useMemo(
    () => ({
      classes: entryNames(entries, "classes"),
      species: entryNames(entries, "species"),
      backgrounds: entryNames(entries, "backgrounds"),
      feats: entryNames(entries, "feats"),
    }),
    [entries],
  );

  function addFeat() {
    const feat = featInput.trim();
    if (!feat || form.feats.includes(feat)) return;
    setForm({ ...form, feats: [...form.feats, feat] });
    setFeatInput("");
  }

  return (
    <FormSection title="Basic Info">
      <AvatarImagePicker
        label="Character avatar"
        name={form.characterName}
        assetId={form.avatarAssetId}
        url={form.avatarUrl}
        uploadImage={(file) => api.uploadImage(file)}
        onChange={(avatar) =>
          setForm({ ...form, avatarAssetId: avatar.assetId, avatarUrl: avatar.url })
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Character Name">
          <Input
            value={form.characterName}
            onChange={(event) => setForm({ ...form, characterName: event.target.value })}
            required
          />
        </Field>
        <Field label="Player Name">
          <Input
            value={form.playerName}
            onChange={(event) => setForm({ ...form, playerName: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Campaign">
        <Select
          options={campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id }))}
          placeholder="Select campaign"
          value={form.campaignId}
          onValueChange={(value) => setForm({ ...form, campaignId: value })}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_140px]">
        <LibraryTextPicker
          label="Class"
          value={form.className}
          options={optionsByCategory.classes}
          onChange={(className) => setForm({ ...form, className })}
        />
        <Field label="Level">
          <Input
            type="number"
            min={1}
            max={20}
            value={form.level}
            onChange={(event) => setForm({ ...form, level: event.target.value })}
          />
        </Field>
        <Field label="XP">
          <Input
            type="number"
            min={0}
            value={form.experiencePoints}
            onChange={(event) => setForm({ ...form, experiencePoints: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <LibraryTextPicker
          label="Species"
          value={form.species}
          options={optionsByCategory.species}
          onChange={(species) => setForm({ ...form, species })}
        />
        <LibraryTextPicker
          label="Background / Origin"
          value={form.background}
          options={optionsByCategory.backgrounds}
          onChange={(background) => setForm({ ...form, background })}
        />
      </div>
      <section className="grid gap-2">
        <h3 className="text-[0.82rem] font-semibold text-muted-foreground">Feats</h3>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {form.feats.map((feat) => (
              <button
                key={feat}
                type="button"
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                onClick={() =>
                  setForm({ ...form, feats: form.feats.filter((current) => current !== feat) })
                }
              >
                <span className="min-w-0 truncate">{feat}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <LibraryTextPicker
              label="Add feat"
              value={featInput}
              options={optionsByCategory.feats}
              onChange={setFeatInput}
            />
            <Button type="button" icon={Plus} variant="success" onClick={addFeat}>
              Add
            </Button>
          </div>
        </div>
      </section>
    </FormSection>
  );
}

function LibraryTextPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const isCustomValue = Boolean(value && !options.includes(value));
  const useCustomInput = customMode || isCustomValue;
  const normalizedOptions = options.map((option) => ({ label: option, value: option }));

  return (
    <Field className="min-w-0" label={label}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        {useCustomInput ? (
          <Input
            className="min-w-0"
            value={value}
            placeholder={`Custom ${label.toLowerCase()}`}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Select
            options={normalizedOptions}
            placeholder={options.length > 0 ? `Choose ${label}` : "Loading SRD choices..."}
            value={options.includes(value) ? value : ""}
            onValueChange={onChange}
          />
        )}
        <Button
          type="button"
          icon={Pencil}
          size="sm"
          variant={useCustomInput ? "secondary" : "ghost"}
          onClick={() => setCustomMode((current) => !current)}
        >
          <span className="sr-only">{useCustomInput ? "Use SRD list" : "Enter custom text"}</span>
        </Button>
      </div>
      {useCustomInput && options.length > 0 && (
        <button
          type="button"
          className="justify-self-start text-xs font-semibold text-primary hover:underline"
          onClick={() => {
            setCustomMode(false);
            if (!options.includes(value)) onChange("");
          }}
        >
          Pick from SRD list
        </button>
      )}
    </Field>
  );
}

function entryNames(entries: StandardLibraryEntry[], category: string) {
  return entries
    .filter((entry) => entry.category === category)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
