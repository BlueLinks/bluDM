import { Minus, Pencil, Plus, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Button, Callout, Field, FormSection, Input, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { effectiveCharacterLevel, levelFromExperience } from "../../lib/domain/progression";
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
  const xpLevel = levelFromExperience(Number(form.experiencePoints) || 0);
  const effectiveLevel = effectiveCharacterLevel(form.level, form.experiencePoints);
  const overrideActive = form.level.trim() !== "";
  const setLevel = (level: number) =>
    setForm({ ...form, level: String(Math.min(20, Math.max(1, level))) });

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(160px,220px)_minmax(150px,190px)_minmax(210px,1fr)]">
      <Field className="min-w-0" label="XP">
        <Input
          type="number"
          min={0}
          disabled={overrideActive}
          value={form.experiencePoints}
          onChange={(event) => setForm({ ...form, experiencePoints: event.target.value })}
        />
      </Field>
      <div className="self-end rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        XP level <span className="font-semibold text-foreground">{xpLevel}</span>
      </div>
      <div className="grid min-w-0 gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.82rem] font-semibold text-muted-foreground">Level override</span>
          <span className="text-xs text-muted-foreground">Using level {effectiveLevel}</span>
        </div>
        <div className="grid max-w-[172px] grid-cols-[2.25rem_4rem_2.25rem_2.25rem] overflow-hidden rounded-md border border-border bg-background">
          <button
            className="flex h-10 w-9 shrink-0 appearance-none items-center justify-center border-r border-border p-0 leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setLevel(effectiveLevel - 1)}
            aria-label="Decrease level override"
          >
            <Minus className="h-4 w-4" />
          </button>
          <Input
            className="h-10 min-h-0 w-16 rounded-none border-0 text-center font-semibold focus:ring-0"
            type="number"
            min={1}
            max={20}
            value={form.level}
            placeholder="Auto"
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") {
                setForm({ ...form, level: "" });
                return;
              }
              setLevel(Number(value) || 1);
            }}
          />
          <button
            className="flex h-10 w-9 shrink-0 appearance-none items-center justify-center border-l border-border p-0 leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setLevel(effectiveLevel + 1)}
            aria-label="Increase level override"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            className="flex h-10 w-9 shrink-0 appearance-none items-center justify-center border-l border-border p-0 leading-none text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
            type="button"
            disabled={!overrideActive}
            onClick={() => setForm({ ...form, level: "" })}
            aria-label="Clear level override"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
    <div className="grid min-w-0 gap-2 text-sm font-medium">
      <span className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-muted-foreground">
        {label}
      </span>
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
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCustomMode(false);
            onChange("");
          }}
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
    </div>
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
