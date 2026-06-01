import { Route } from "lucide-react";
import { useMemo, useState } from "react";
import { useTopBarActions } from "../../app/shell";
import { Button } from "../../components/ui";
import { TravelCalculatorModal } from "./TravelCalculatorModal";
import type { CampaignLocation } from "./travelTypes";

export function CampaignTravelTool({
  campaignId,
  locations,
}: {
  campaignId: string;
  locations: CampaignLocation[];
}) {
  const [open, setOpen] = useState(false);
  const action = useMemo(
    () => (
      <Button type="button" icon={Route} variant="secondary" onClick={() => setOpen(true)}>
        Travel
      </Button>
    ),
    [],
  );
  useTopBarActions(action);
  return (
    <TravelCalculatorModal
      campaignId={campaignId}
      locations={locations}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
