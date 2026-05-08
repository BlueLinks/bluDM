import { useEffect, useState } from "react";
import { StandardSourceChecklist } from "../../components/shared/StandardSourceChecklist";
import { Button, Callout } from "../../components/ui";
import { api } from "../../lib/api";
import type { Campaign } from "../../types";

export function CampaignSourceSettings({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (campaign: Campaign) => void;
}) {
  const [sources, setSources] = useState(campaign.allowedStandardSources);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setSources(campaign.allowedStandardSources), [campaign]);

  const dirty = sources.join(",") !== campaign.allowedStandardSources.join(",");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = await api.updateCampaign(campaign.id, {
        name: campaign.name,
        description: campaign.description,
        allowedStandardSources: sources,
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
      <StandardSourceChecklist selected={sources} onChange={setSources} />
      {error && <Callout tone="danger">{error}</Callout>}
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSources(campaign.allowedStandardSources)}
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
