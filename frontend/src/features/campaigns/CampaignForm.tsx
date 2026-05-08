import { useState, type FormEvent } from "react";
import {
  defaultStandardSources,
  StandardSourceChecklist,
} from "../../components/shared/StandardSourceChecklist";
import { Button, Field, Input, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign } from "../../types";

export function CampaignForm({ onCreated }: { onCreated: (campaign: Campaign) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowedStandardSources, setAllowedStandardSources] = useState(defaultStandardSources);
  const [error, setError] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api.createCampaign({ name, description, allowedStandardSources });
      onCreated(payload.campaign);
      setName("");
      setDescription("");
      setAllowedStandardSources(defaultStandardSources);
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
        onChange={setAllowedStandardSources}
      />
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">Create campaign</Button>
    </form>
  );
}
