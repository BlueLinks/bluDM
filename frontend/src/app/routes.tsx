import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StatusPanel } from "../components/ui";
import { api } from "../lib/api";

const ImportPage = lazy(() =>
  import("../pages/ImportPage").then((module) => ({ default: module.ImportPage })),
);
const PrivacyPage = lazy(() =>
  import("../pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })),
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const CampaignsPage = lazy(() =>
  import("../features/campaigns/pages").then((module) => ({ default: module.CampaignsPage })),
);
const CampaignDetailPage = lazy(() =>
  import("../features/campaigns/pages").then((module) => ({ default: module.CampaignDetailPage })),
);
const PlayerCreatePage = lazy(() =>
  import("../features/players/pages").then((module) => ({ default: module.PlayerCreatePage })),
);
const PlayerEditPage = lazy(() =>
  import("../features/players/pages").then((module) => ({ default: module.PlayerEditPage })),
);
const PlayersPage = lazy(() =>
  import("../features/players/pages").then((module) => ({ default: module.PlayersPage })),
);
const SpellsPage = lazy(() =>
  import("../features/spells/pages").then((module) => ({ default: module.SpellsPage })),
);
const ItemsPage = lazy(() =>
  import("../features/items/pages").then((module) => ({ default: module.ItemsPage })),
);
const RulesPage = lazy(() =>
  import("../features/library/RulesPage").then((module) => ({ default: module.RulesPage })),
);
const EncounterInitiativePage = lazy(() =>
  import("../features/combat/initiativePage").then((module) => ({
    default: module.EncounterInitiativePage,
  })),
);
const EncounterSummaryPage = lazy(() =>
  import("../features/combat/summaryPage").then((module) => ({
    default: module.EncounterSummaryPage,
  })),
);
const CombatTrackerPage = lazy(() =>
  import("../features/combat/trackerPage").then((module) => ({
    default: module.CombatTrackerPage,
  })),
);
const NpcCreatePage = lazy(() =>
  import("../features/creatures/pages").then((module) => ({ default: module.NpcCreatePage })),
);
const NpcEditPage = lazy(() =>
  import("../features/creatures/pages").then((module) => ({ default: module.NpcEditPage })),
);
const NpcsPage = lazy(() =>
  import("../features/creatures/pages").then((module) => ({ default: module.NpcsPage })),
);
const EncounterEditPage = lazy(() =>
  import("../features/encounters/editorPage").then((module) => ({
    default: module.EncounterEditPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <StatusPanel title="Loading workspace">
          <p>Preparing the table.</p>
        </StatusPanel>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate replace to="/campaigns" />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:campaignID" element={<CampaignDetailPage />} />
        <Route
          path="/campaigns/:campaignID/encounters/:encounterID/edit"
          element={<EncounterEditPage />}
        />
        <Route path="/encounter-runs/:runID/initiative" element={<EncounterInitiativePage />} />
        <Route path="/encounter-runs/:runID" element={<CombatTrackerPage />} />
        <Route path="/encounter-runs/:runID/summary" element={<EncounterSummaryPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/new" element={<PlayerCreatePage />} />
        <Route path="/players/:playerID/edit" element={<PlayerEditPage />} />
        <Route path="/npcs" element={<NpcsPage />} />
        <Route path="/npcs/new" element={<NpcCreatePage />} />
        <Route path="/npcs/:creatureID/edit" element={<NpcEditPage />} />
        <Route path="/spells" element={<SpellsPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/import" element={<ImportPage seedTestData={api.seedTestData} />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<Navigate replace to="/campaigns" />} />
      </Routes>
    </Suspense>
  );
}
