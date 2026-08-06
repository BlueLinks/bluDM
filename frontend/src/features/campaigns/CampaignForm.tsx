import { useState, type FormEvent } from "react";
import {
  defaultStandardSources,
  StandardSourceChecklist,
} from "../../components/shared/StandardSourceChecklist";
import { Button, Field, Input, Select, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import {
  encounterRuleset2014,
  encounterRulesetForSources,
  encounterRulesetOptions,
  type EncounterRuleset,
} from "../../lib/domain/encounterRulesets";
import type { Campaign } from "../../types";

export function CampaignForm({ onCreated }: { onCreated: (campaign: Campaign) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedStandardSources, setAllowedStandardSources] = useState(defaultStandardSources);
  const [encounterRuleset, setEncounterRuleset] = useState<EncounterRuleset>(encounterRuleset2014);
  const [error, setError] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api.createCampaign({
        name,
        description,
        allowedStandardSources,
        encounterRuleset,
      });
      onCreated(payload.campaign);
      setName("");
      setDescription("");
      setAllowedStandardSources(defaultStandardSources);
      setEncounterRuleset(encounterRuleset2014);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create campaign");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleCreate}>
      <Field label="Name">
        <Input value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
        />
      </Field>
      <StandardSourceChecklist
        compact
        selected={allowedStandardSources}
        onChange={(sources) => {
          setAllowedStandardSources(sources);
          setEncounterRuleset((current) => encounterRulesetForSources(sources, current));
        }}
      />
      {allowedStandardSources.includes("srd-2014") &&
      allowedStandardSources.includes("srd-5-2-1") ? (
        <Field label="Encounter rules">
          <Select
            value={encounterRuleset}
            placeholder="Encounter rules"
            options={encounterRulesetOptions}
            onValueChange={(value) => setEncounterRuleset(value as typeof encounterRuleset)}
          />
        </Field>
      ) : null}
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">Create campaign</Button>
    </form>
  );
}
