import { Minus, Pencil, Plus, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Button, Callout, Field, FormSection, Input, Select } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign, PlayerFormState, StandardLibraryEntry } from "../../types";

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

const pickerCategories = ["classes", "species", "backgrounds", "feats"];
const levelXpThresholds = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];

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
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [featInput, setFeatInput] = useState("");
  const selectedCampaign = campaigns.find((campaign) => campaign.id === form.campaignId);
  const campaignSources = selectedCampaign?.allowedStandardSources?.length
    ? selectedCampaign.allowedStandardSources
    : ["srd-2014"];
  const [browseSources, setBrowseSources] = useState(campaignSources);

  useEffect(() => {
    setBrowseSources(campaignSources);
  }, [campaignSources.join(",")]);

  const hasCampaignSourceMismatch =
    Boolean(selectedCampaign) && browseSources.some((source) => !campaignSources.includes(source));

  useEffect(() => {
    let cancelled = false;

    async function loadEntries(sourceKeys: string[]) {
      const payloads = await Promise.all(
        pickerCategories.map((category) =>
          api.standardLibraryEntries({ category, source: sourceKeys, compact: true }),
        ),
      );
      return payloads.flatMap((payload) => payload.entries);
    }

    setLoadingEntries(true);
    void loadEntries(browseSources)
      .then(async (loadedEntries) => {
        const shouldFallbackTo2014 =
          loadedEntries.length === 0 && !browseSources.includes("srd-2014");
        return shouldFallbackTo2014 ? loadEntries(["srd-2014"]) : loadedEntries;
      })
      .then((loadedEntries) => {
        if (!cancelled) setEntries(loadedEntries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false);
      });

    return () => {
      cancelled = true;
    };
  }, [browseSources.join(",")]);

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
      <section className="grid gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Browse standard character options</h3>
            <p className="text-xs text-muted-foreground">
              Campaign settings choose the default SRD sources, but you can browse another source
              while creating or editing this character.
            </p>
          </div>
          <InfoHelpButton title="SRD 2014 vs SRD 5.2.1">
            <p>
              SRD 2014 reflects the older fifth-edition rules reference. It is well structured in
              the current API, but has sparse character-origin data: one background and one feat.
            </p>
            <p>
              SRD 5.2.1 reflects the newer 2024 rules reference. bluDM keeps it separate so a
              campaign can opt into 2014, 2024, or both without mixing rules by accident.
            </p>
          </InfoHelpButton>
        </div>
        <StandardSourceToggles selected={browseSources} onChange={setBrowseSources} />
        {hasCampaignSourceMismatch && selectedCampaign && (
          <Callout>
            This character can still be saved to {selectedCampaign.name}, but your browse filters
            include SRD content that campaign does not currently allow. Update the campaign sources
            if that is intentional.
          </Callout>
        )}
      </section>
      <div className="grid min-w-0 gap-4">
        <LibraryTextPicker
          label="Class"
          value={form.className}
          options={optionsByCategory.classes}
          loading={loadingEntries}
          onChange={(className) => setForm({ ...form, className })}
        />
        <CharacterProgressFields form={form} setForm={setForm} />
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <LibraryTextPicker
          label="Species"
          value={form.species}
          options={optionsByCategory.species}
          loading={loadingEntries}
          onChange={(species) => setForm({ ...form, species })}
        />
        <LibraryTextPicker
          label="Background / Origin"
          value={form.background}
          options={optionsByCategory.backgrounds}
          loading={loadingEntries}
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
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <LibraryTextPicker
              label="Add feat"
              value={featInput}
              options={optionsByCategory.feats}
              loading={loadingEntries}
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

function CharacterProgressFields({
  form,
  setForm,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  const suggestedLevel = levelFromXP(Number(form.experiencePoints) || 0);
  const currentLevel = Number(form.level) || 1;
  const setLevel = (level: number) =>
    setForm({ ...form, level: String(Math.min(20, Math.max(1, level))) });

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(150px,180px)_minmax(160px,220px)_minmax(180px,1fr)]">
      <Field className="min-w-0" label="Level">
        <div className="inline-flex max-w-[180px] overflow-hidden rounded-md border border-border bg-background">
          <button
            className="grid h-10 w-10 place-items-center border-r border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setLevel(currentLevel - 1)}
            aria-label="Decrease level"
          >
            <Minus className="h-4 w-4" />
          </button>
          <Input
            className="h-10 min-h-0 w-16 rounded-none border-0 text-center font-semibold focus:ring-0"
            type="number"
            min={1}
            max={20}
            value={form.level}
            onChange={(event) => setLevel(Number(event.target.value) || 1)}
          />
          <button
            className="grid h-10 w-10 place-items-center border-l border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setLevel(currentLevel + 1)}
            aria-label="Increase level"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Field>
      <Field className="min-w-0" label="XP">
        <Input
          type="number"
          min={0}
          value={form.experiencePoints}
          onChange={(event) => setForm({ ...form, experiencePoints: event.target.value })}
        />
      </Field>
      <div className="self-end rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        XP suggests level <span className="font-semibold text-foreground">{suggestedLevel}</span>
        {suggestedLevel !== currentLevel && (
          <button
            type="button"
            className="ml-2 font-semibold text-primary hover:underline"
            onClick={() => setLevel(suggestedLevel)}
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}

function LibraryTextPicker({
  label,
  value,
  options,
  loading = false,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(false);
  const isCustomValue = Boolean(value && !options.includes(value));
  const useCustomInput = customMode || isCustomValue;
  const normalizedOptions = options.map((option) => ({ label: option, value: option }));

  return (
    <Field className="min-w-0" label={label}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
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
            placeholder={pickerPlaceholder(label, options.length, loading)}
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
        <Button
          type="button"
          icon={X}
          size="sm"
          variant="ghost"
          disabled={!value}
          onClick={() => onChange("")}
        >
          <span className="sr-only">Clear {label}</span>
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

function pickerPlaceholder(label: string, optionCount: number, loading: boolean) {
  if (optionCount > 0) return `Choose ${label}`;
  if (loading) return "Loading SRD choices...";
  return `No SRD ${label.toLowerCase()} found`;
}

function entryNames(entries: StandardLibraryEntry[], category: string) {
  return entries
    .filter((entry) => entry.category === category)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function levelFromXP(xp: number) {
  const boundedXP = Math.max(0, xp);
  let level = 1;
  for (const [index, threshold] of levelXpThresholds.entries()) {
    if (boundedXP >= threshold) level = index + 1;
  }
  return Math.min(20, level);
}
