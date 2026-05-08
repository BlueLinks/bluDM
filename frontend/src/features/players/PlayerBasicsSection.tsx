import { Plus, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import { Badge, Button, Field, FormSection, Input, Select } from "../../components/ui";
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
      <div className="grid gap-4 md:grid-cols-[minmax(180px,1fr)_120px_140px]">
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
                className="inline-flex items-center gap-2"
                onClick={() =>
                  setForm({ ...form, feats: form.feats.filter((current) => current !== feat) })
                }
              >
                <Badge>
                  {feat}
                  <X className="ml-1 inline h-3 w-3" />
                </Badge>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
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
  const listID = `player-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <Field className="min-w-0" label={label}>
      <Input list={listID} value={value} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listID}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </Field>
  );
}

function entryNames(entries: StandardLibraryEntry[], category: string) {
  return entries
    .filter((entry) => entry.category === category)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}
