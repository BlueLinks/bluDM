import { Package } from "lucide-react";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles.scss";
import { AuthShell, useThemeMode, WorkspaceShell } from "./app/shell";
import { AuthCard, StatusPanel } from "./components/ui";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { api } from "./lib/api";
import type { AuthProvider, AuthStatus } from "./types";

const ImportPage = lazy(() =>
  import("./pages/ImportPage").then((module) => ({ default: module.ImportPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })),
);
const CampaignsPage = lazy(() =>
  import("./features/campaigns/pages").then((module) => ({ default: module.CampaignsPage })),
);
const CampaignDetailPage = lazy(() =>
  import("./features/campaigns/pages").then((module) => ({ default: module.CampaignDetailPage })),
);
const PlayerCreatePage = lazy(() =>
  import("./features/players/pages").then((module) => ({ default: module.PlayerCreatePage })),
);
const PlayerEditPage = lazy(() =>
  import("./features/players/pages").then((module) => ({ default: module.PlayerEditPage })),
);
const PlayersPage = lazy(() =>
  import("./features/players/pages").then((module) => ({ default: module.PlayersPage })),
);
const SpellsPage = lazy(() =>
  import("./features/spells/pages").then((module) => ({ default: module.SpellsPage })),
);
const EncounterInitiativePage = lazy(() =>
  import("./features/combat/initiativePage").then((module) => ({
    default: module.EncounterInitiativePage,
  })),
);
const EncounterSummaryPage = lazy(() =>
  import("./features/combat/summaryPage").then((module) => ({
    default: module.EncounterSummaryPage,
  })),
);
const CombatTrackerPage = lazy(() =>
  import("./features/combat/trackerPage").then((module) => ({ default: module.CombatTrackerPage })),
);
const NpcCreatePage = lazy(() =>
  import("./features/creatures/pages").then((module) => ({ default: module.NpcCreatePage })),
);
const NpcEditPage = lazy(() =>
  import("./features/creatures/pages").then((module) => ({ default: module.NpcEditPage })),
);
const NpcsPage = lazy(() =>
  import("./features/creatures/pages").then((module) => ({ default: module.NpcsPage })),
);
const EncounterEditPage = lazy(() =>
  import("./features/encounters/editorPage").then((module) => ({
    default: module.EncounterEditPage,
  })),
);

function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [error, setError] = useState("");
  const { theme, setTheme, resolvedTheme } = useThemeMode();

  async function refreshAuth() {
    setError("");
    try {
      setAuth(await api.status());
      const providerPayload = await api.authProviders().catch(() => ({
        providers: [],
        localAuthEnabled: true,
      }));
      setProviders(providerPayload.providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach API");
    }
  }

  useEffect(() => {
    void refreshAuth();
  }, []);

  if (!auth) {
    return (
      <AuthShell>
        <StatusPanel title="Starting table">
          <p>Checking the local server and campaign vault.</p>
          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        </StatusPanel>
      </AuthShell>
    );
  }

  if (auth.setupRequired) {
    return (
      <AuthShell>
        <AuthCard
          title="Create the DM account"
          submitLabel="Create account"
          onSubmit={async (email, password) => {
            await api.setup(email, password);
            await refreshAuth();
          }}
        />
      </AuthShell>
    );
  }

  if (!auth.authenticated) {
    return (
      <AuthShell>
        <AuthCard
          title="Log in"
          submitLabel="Log in"
          onSubmit={async (email, password) => {
            await api.login(email, password);
            await refreshAuth();
          }}
          localAuthEnabled={auth.localAuthEnabled}
          providers={providers}
        />
      </AuthShell>
    );
  }

  return (
    <BrowserRouter>
      <WorkspaceShell
        resolvedTheme={resolvedTheme}
        theme={theme}
        user={auth.user ?? undefined}
        onThemeChange={setTheme}
        onLogout={async () => {
          await api.logout();
          await refreshAuth();
        }}
      >
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
            <Route
              path="/items"
              element={
                <ComingSoonPage
                  icon={Package}
                  title="Items"
                  copy="Magic items and mundane gear will live here once item tracking is in scope."
                />
              }
            />
            <Route path="/import" element={<ImportPage seedTestData={api.seedTestData} />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate replace to="/campaigns" />} />
          </Routes>
        </Suspense>
      </WorkspaceShell>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
