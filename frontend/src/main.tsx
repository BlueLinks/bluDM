import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.scss";
import { AppRoutes } from "./app/routes";
import { AuthShell, useThemeMode, WorkspaceShell } from "./app/shell";
import { AuthCard, StatusPanel } from "./components/ui";
import { api } from "./lib/api";
import type { AuthProvider, AuthStatus } from "./types";

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
        <AppRoutes />
      </WorkspaceShell>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
