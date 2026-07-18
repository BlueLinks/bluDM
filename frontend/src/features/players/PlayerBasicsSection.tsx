import { Pencil, Plus, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import { Button, Callout, Field, FormSection, Input, Select } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign, PlayerFormState, StandardLibraryEntry } from "../../types";
import { CharacterProgressFields } from "./CharacterProgressFields";

type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

const pickerCategories = ["classes", "species", "backgrounds", "feats"];
const noCampaignValue = "__no_campaign";

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
      <div className="grid gap-4 md:grid-cols-[minmax(220px,360px)_minmax(180px,280px)]">
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
      <CampaignSelect campaigns={campaigns} form={form} setForm={setForm} />
      <StandardCharacterOptionsBrowser
        browseSources={browseSources}
        selectedCampaign={selectedCampaign}
        hasCampaignSourceMismatch={hasCampaignSourceMismatch}
        setBrowseSources={setBrowseSources}
      />
      <div className="grid min-w-0 gap-4">
        <div className="max-w-xl">
          <LibraryTextPicker
            label="Class"
            value={form.className}
            options={optionsByCategory.classes}
            loading={loadingEntries}
            onChange={(className) => setForm({ ...form, className })}
          />
        </div>
        <CharacterProgressFields form={form} setForm={setForm} />
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(220px,360px)_minmax(220px,360px)]">
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
      <FeatPicker
        feats={form.feats}
        featInput={featInput}
        options={optionsByCategory.feats}
        loading={loadingEntries}
        onFeatInputChange={setFeatInput}
        onAddFeat={addFeat}
        onRemoveFeat={(feat) =>
          setForm({ ...form, feats: form.feats.filter((current) => current !== feat) })
        }
      />
    </FormSection>
  );
}

function CampaignSelect({
  campaigns,
  form,
  setForm,
}: {
  campaigns: Campaign[];
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  return (
    <Field className="max-w-md" label="Campaign">
      <Select
        options={[
          { label: "No campaign", value: noCampaignValue },
          ...campaigns.map((campaign) => ({ label: campaign.name, value: campaign.id })),
        ]}
        placeholder="Select campaign"
        value={form.campaignId || noCampaignValue}
        onValueChange={(value) =>
          setForm({ ...form, campaignId: value === noCampaignValue ? "" : value })
        }
      />
    </Field>
  );
}

function StandardCharacterOptionsBrowser({
  browseSources,
  selectedCampaign,
  hasCampaignSourceMismatch,
  setBrowseSources,
}: {
  browseSources: string[];
  selectedCampaign?: Campaign;
  hasCampaignSourceMismatch: boolean;
  setBrowseSources: (sources: string[]) => void;
}) {
  return (
    <section className="grid gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Browse standard character options</h3>
          <p className="text-xs text-muted-foreground">
            Campaign settings choose the default SRD sources, but you can browse another source
            while creating or editing this character.
          </p>
        </div>
        <InfoHelpButton title="5e SRD vs 2024 SRD">
          <p>
            5e SRD (2014) is the original fifth-edition open rules reference. It is well structured
            in the current API, but has sparse character-origin data: one background and one feat.
          </p>
          <p>
            5.5e / 2024 SRD uses Wizards' document version number, 5.2.1. bluDM shows both names so
            the edition is clear while still matching the official source.
          </p>
        </InfoHelpButton>
      </div>
      <StandardSourceToggles selected={browseSources} onChange={setBrowseSources} />
      {hasCampaignSourceMismatch && selectedCampaign && (
        <Callout>
          This character can still be saved to {selectedCampaign.name}, but your browse filters
          include SRD content that campaign does not currently allow. Update the campaign sources if
          that is intentional.
        </Callout>
      )}
    </section>
  );
}

function FeatPicker({
  feats,
  featInput,
  options,
  loading,
  onFeatInputChange,
  onAddFeat,
  onRemoveFeat,
}: {
  feats: string[];
  featInput: string;
  options: string[];
  loading: boolean;
  onFeatInputChange: (value: string) => void;
  onAddFeat: () => void;
  onRemoveFeat: (feat: string) => void;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="text-[0.82rem] font-semibold text-muted-foreground">Feats</h3>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          {feats.map((feat) => (
            <button
              key={feat}
              type="button"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-companion-custom/25 bg-companion-custom/10 px-2.5 py-1 text-xs font-semibold text-companion-custom"
              onClick={() => onRemoveFeat(feat)}
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
            options={options}
            loading={loading}
            onChange={onFeatInputChange}
          />
          <Button type="button" icon={Plus} onClick={onAddFeat}>
            Add
          </Button>
        </div>
      </div>
    </section>
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
