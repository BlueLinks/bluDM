import { ResponsiveGrid } from "../components/layout";
import { Checkbox, Field, Select } from "../components/ui";
import type { Campaign } from "../types";

const scopeOptions = [
  ["campaigns:read", "Campaigns"],
  ["campaigns:write", "Campaign write"],
  ["party:read", "Party"],
  ["party:write", "Party write"],
  ["world:read", "World read"],
  ["world:write", "World write"],
  ["library:read", "Library read"],
  ["library:write", "Library write"],
  ["encounters:read", "Encounters read"],
  ["encounters:write", "Encounters write"],
  ["generation:run", "Generation"],
  ["content:import", "Imports"],
  ["sessions:read", "Session summaries"],
] as const;

export const tokenPresets = {
  read_only: [
    "campaigns:read",
    "party:read",
    "world:read",
    "library:read",
    "encounters:read",
    "sessions:read",
  ],
  encounter_builder: [
    "campaigns:read",
    "party:read",
    "world:read",
    "library:read",
    "encounters:read",
    "encounters:write",
    "generation:run",
  ],
  campaign_writer: scopeOptions.map(([scope]) => scope),
  custom: [],
} satisfies Record<string, readonly string[]>;

type TokenPreset = keyof typeof tokenPresets;
type CampaignMode = "all" | "selected";

export function APITokenAccessFields({
  preset,
  scopes,
  campaignMode,
  campaigns,
  campaignIds,
  onPresetChange,
  onScopesChange,
  onCampaignModeChange,
  onCampaignIdsChange,
}: {
  preset: TokenPreset;
  scopes: string[];
  campaignMode: CampaignMode;
  campaigns: Campaign[];
  campaignIds: string[];
  onPresetChange: (value: TokenPreset) => void;
  onScopesChange: (value: string[]) => void;
  onCampaignModeChange: (value: CampaignMode) => void;
  onCampaignIdsChange: (value: string[]) => void;
}) {
  function selectPreset(value: string) {
    const next = value as TokenPreset;
    onPresetChange(next);
    if (next !== "custom") onScopesChange([...tokenPresets[next]]);
  }

  return (
    <>
      <ResponsiveGrid variant="form2">
        <Field label="Access preset">
          <Select
            value={preset}
            placeholder="Choose access"
            options={[
              { value: "read_only", label: "Read-only" },
              { value: "encounter_builder", label: "Encounter builder" },
              { value: "campaign_writer", label: "Campaign writer" },
              { value: "custom", label: "Custom" },
            ]}
            onValueChange={selectPreset}
          />
        </Field>
        <Field label="Campaign access">
          <Select
            value={campaignMode}
            placeholder="Choose campaigns"
            options={[
              { value: "all", label: "All my campaigns" },
              { value: "selected", label: "Selected campaigns" },
            ]}
            onValueChange={(value) => onCampaignModeChange(value as CampaignMode)}
          />
        </Field>
      </ResponsiveGrid>
      {preset === "custom" && (
        <CheckboxGroup
          label="Allowed capabilities"
          options={scopeOptions}
          selected={scopes}
          onChange={onScopesChange}
        />
      )}
      {campaignMode === "selected" && (
        <CheckboxGroup
          label="Allowed campaigns"
          options={campaigns.map((campaign) => [campaign.id, campaign.name] as const)}
          selected={campaignIds}
          onChange={onCampaignIdsChange}
        />
      )}
    </>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<readonly [string, string]>;
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, optionLabel]) => (
          <Checkbox
            key={value}
            compact
            label={optionLabel}
            checked={selected.includes(value)}
            onChange={(checked) =>
              onChange(
                checked
                  ? [...selected, value]
                  : selected.filter((candidate) => candidate !== value),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
