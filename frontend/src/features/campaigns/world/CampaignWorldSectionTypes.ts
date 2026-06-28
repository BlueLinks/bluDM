import type { Creature, Encounter } from "../../../types";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";

export type CampaignWorldSectionProps = {
  campaignId: string;
  encounters: Encounter[];
  locations: CampaignLocation[];
  npcs: Creature[];
  journeys?: CampaignJourney[];
  mapsMode?: boolean;
  routeLocationID?: string;
  onManageNpcs: () => void;
  onChanged: () => Promise<void>;
  onCloneEncounter?: (encounter: Encounter) => void;
  onGenerateEncounter: (location: CampaignLocation) => void;
  onPlanTravel?: (location: CampaignLocation) => void;
  onStartEncounter?: (encounter: Encounter, test: boolean) => void;
};
