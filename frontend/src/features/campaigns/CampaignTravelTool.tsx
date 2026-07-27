import { Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTopBarActions } from "../../app/shell";
import { Button } from "../../components/ui";
import { CampaignRollTableTool } from "./CampaignRollTableTool";
import { TravelCalculatorModal } from "./TravelCalculatorModal";
import type { CampaignJourney, CampaignLocation } from "./world/travelTypes";

export function CampaignTravelTool({
  campaignId,
  editingJourney,
  hidden = false,
  locations,
  openRequestKey = 0,
  planningLocation,
  onEditComplete,
  onJourneySaved,
}: {
  campaignId: string;
  editingJourney: CampaignJourney | null;
  hidden?: boolean;
  locations: CampaignLocation[];
  openRequestKey?: number;
  planningLocation?: CampaignLocation | null;
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
  useTopBarActions(hidden ? null : action);

  useEffect(() => {
    if (editingJourney) setOpen(true);
  }, [editingJourney]);

  useEffect(() => {
    if (openRequestKey > 0) setOpen(true);
  }, [openRequestKey]);

  return (
    <TravelCalculatorModal
      campaignId={campaignId}
      editingJourney={editingJourney}
      locations={locations}
      planningLocation={planningLocation}
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
