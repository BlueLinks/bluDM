import { useEffect, useState } from "react";
import { StandardSourceChecklist } from "../../components/shared/StandardSourceChecklist";
import { Button, Callout, Field, Select } from "../../components/ui";
import { api } from "../../lib/api";
import {
  campaignEncounterRuleset,
  encounterRulesetForSources,
  encounterRulesetOptions,
} from "../../lib/domain/encounterRulesets";
import type { Campaign } from "../../types";

export function CampaignSourceSettings({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
}) {
  const [sources, setSources] = useState(campaign.allowedStandardSources);
  const [encounterRuleset, setEncounterRuleset] = useState(() =>
    campaignEncounterRuleset(campaign),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSources(campaign.allowedStandardSources);
    setEncounterRuleset(campaignEncounterRuleset(campaign));
  }, [campaign]);

  const dirty =
    sources.join(",") !== campaign.allowedStandardSources.join(",") ||
    encounterRuleset !== campaignEncounterRuleset(campaign);
  const mixedSources = sources.includes("srd-2014") && sources.includes("srd-5-2-1");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = await api.updateCampaign(campaign.id, {
        name: campaign.name,
        description: campaign.description,
        allowedStandardSources: sources,
        encounterRuleset,
      });
      onSaved(payload.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save campaign sources");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <StandardSourceChecklist
        selected={sources}
        onChange={(nextSources) => {
          setSources(nextSources);
          setEncounterRuleset((current) => encounterRulesetForSources(nextSources, current));
        }}
      />
      {mixedSources ? (
        <Field label="Encounter rules">
          <Select
            value={encounterRuleset}
            placeholder="Encounter rules"
            options={encounterRulesetOptions}
            onValueChange={(value) => setEncounterRuleset(value as typeof encounterRuleset)}
          />
        </Field>
      ) : null}
      {error && <Callout tone="danger">{error}</Callout>}
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSources(campaign.allowedStandardSources);
              setEncounterRuleset(campaignEncounterRuleset(campaign));
            }}
          >
            Revert
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            Save source filters
          </Button>
        </div>
      )}
    </div>
  );
}
