import { Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTopBarActions } from "../../app/shell";
import { Button } from "../../components/ui";
import { CampaignRollTableTool } from "./CampaignRollTableTool";
import { TravelCalculatorModal } from "./TravelCalculatorModal";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";

export function CampaignTravelTool({
  campaignId,
  editingJourney,
  locations,
  onEditComplete,
  onJourneySaved,
}: {
  campaignId: string;
  editingJourney: CampaignJourney | null;
  locations: CampaignLocation[];
  onEditComplete: () => void;
  onJourneySaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const action = useMemo(
    () => (
      <>
        <CampaignRollTableTool campaignId={campaignId} />
        <Button
          type="button"
          icon={Route}
          variant="secondary"
          onClick={() => {
            onEditComplete();
            setOpen(true);
          }}
        >
          Travel
        </Button>
      </>
    ),
    [campaignId, onEditComplete],
  );
  useTopBarActions(action);

  useEffect(() => {
    if (editingJourney) setOpen(true);
  }, [editingJourney]);

  return (
    <TravelCalculatorModal
      campaignId={campaignId}
      editingJourney={editingJourney}
      locations={locations}
      onEditComplete={onEditComplete}
      onJourneySaved={onJourneySaved}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onEditComplete();
      }}
    />
  );
}
