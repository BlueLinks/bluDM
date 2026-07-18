import {
  ArrowLeft,
  Castle,
  Import,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  UsersRound,
} from "lucide-react";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { DiceRoller } from "../components/DiceRoller";
import { RollLogProvider } from "../components/RollLogProvider";
import { Button } from "../components/ui";
import type { AccountInfo, User } from "../types";
import { AccountMenu } from "./AccountMenu";
import { ThemeMenu, type ThemeAccent, type ThemeMode } from "./theme";

export { useThemeMode } from "./theme";
export type { ThemeAccent, ThemeMode } from "./theme";

const navItems = [
  { to: "/campaigns", label: "Campaigns", icon: Castle },
  { to: "/players", label: "Players", icon: UsersRound },
  { to: "/npcs", label: "NPCs", icon: Swords },
  { to: "/spells", label: "Spells", icon: Sparkles },
  { to: "/items", label: "Items", icon: Package },
  { to: "/rules", label: "Rules", icon: ScrollText },
  { to: "/import", label: "Import", icon: Import },
];

const TopBarActionsContext = createContext<(actions: React.ReactNode) => void>(() => undefined);

export function useTopBarActions(actions: React.ReactNode) {
  const setActions = useContext(TopBarActionsContext);
  useEffect(() => {
    setActions(actions);
    return () => setActions(null);
  }, [actions, setActions]);
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">{children}</div>
    </main>
  );
}

export function WorkspaceShell({
  children,
  accent,
  user,
  theme,
  resolvedTheme,
  onAccentChange,
  onThemeChange,
  onLogout,
  onLoadAccount,
  onSetPassword,
}: {
  children: React.ReactNode;
  accent: ThemeAccent;
  user?: User;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  onAccentChange: (accent: ThemeAccent) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => Promise<void>;
  onLoadAccount: () => Promise<AccountInfo>;
  onSetPassword: (currentPassword: string, newPassword: string) => Promise<AccountInfo>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [topBarActions, setTopBarActions] = useState<React.ReactNode>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("bludm-sidebar") === "collapsed",
  );
  const [uiDensity, setUiDensity] = useState<"auto" | "compact" | "comfy">(() => {
    const stored = localStorage.getItem("bludm-ui-density");
    return stored === "compact" || stored === "comfy" || stored === "auto" ? stored : "auto";
  });
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = shellCrumbs(location.pathname);
  const parent = parentPath(location.pathname);
  const isCombatTracker = /^\/encounter-runs\/[^/]+$/.test(location.pathname);
  const isCampaignWorld = /^\/campaigns\/[^/]+\/world(?:\/|$)/.test(location.pathname);
  const contentPadding =
    isCombatTracker && uiDensity !== "comfy" ? "px-1 py-2 sm:px-2 lg:px-3" : "px-4 py-6 lg:px-8";

  useEffect(() => {
    localStorage.setItem("bludm-sidebar", sidebarCollapsed ? "collapsed" : "expanded");
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("bludm-ui-density", uiDensity);
  }, [uiDensity]);

  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
    contentRef.current.scrollLeft = 0;
  }, [location.pathname]);

  return (
    <RollLogProvider>
      <TopBarActionsContext.Provider value={setTopBarActions}>
        <main
          className={[
            "fixed inset-0 overflow-hidden bg-background text-foreground",
            `ui-density-${uiDensity}`,
            isCampaignWorld ? "campaign-world-shell" : "",
          ].join(" ")}
        >
          <div className="flex h-full">
            <aside
              className={[
                "hidden h-full shrink-0 self-start overflow-hidden border-r border-border bg-card transition-all lg:sticky lg:top-0 lg:block",
                sidebarCollapsed ? "w-16" : "w-48",
              ].join(" ")}
            >
              <Sidebar
                collapsed={sidebarCollapsed}
                onNavigate={() => setMobileOpen(false)}
                onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
              />
            </aside>
            {mobileOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/45 lg:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <aside
                  className="h-full w-72 border-r border-border bg-card"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </aside>
              </div>
            )}
            <section className="flex h-full min-w-0 flex-1 flex-col">
              <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
                <button
                  className="inline-flex rounded-md border border-border p-2 lg:hidden"
                  type="button"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={ArrowLeft}
                    disabled={!parent}
                    onClick={() => {
                      if (parent) void navigate(parent);
                    }}
                  >
                    Back
                  </Button>
                  <div className="hidden min-w-0 lg:block">
                    <div className="text-xs font-bold uppercase tracking-wide text-accent">
                      bluDM
                    </div>
                    <nav
                      className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-sm font-semibold"
                      aria-label="Current path"
                    >
                      {crumbs.length === 0 ? (
                        <span>Encounter Tracker</span>
                      ) : (
                        crumbs.map((crumb, index) => (
                          <React.Fragment key={`${crumb.label}-${index}`}>
                            {index > 0 && <span className="text-muted-foreground">/</span>}
                            {crumb.to && index < crumbs.length - 1 ? (
                              <Link
                                className="max-w-36 truncate text-muted-foreground hover:text-primary hover:underline"
                                to={crumb.to}
                              >
                                {crumb.label}
                              </Link>
                            ) : (
                              <span className="max-w-48 truncate text-foreground">
                                {crumb.label}
                              </span>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </nav>
                  </div>
                </div>
                <div className="flex min-w-0 max-w-64 shrink items-center gap-1 overflow-x-auto overscroll-x-contain pr-1 sm:max-w-none sm:shrink-0 sm:gap-2 sm:overflow-visible sm:pr-0">
                  {topBarActions}
                  <DiceRoller />
                  <ThemeMenu
                    accent={accent}
                    resolvedTheme={resolvedTheme}
                    theme={theme}
                    onAccentChange={onAccentChange}
                    onThemeChange={onThemeChange}
                  />
                  <AccountMenu
                    density={uiDensity}
                    user={user}
                    onLoadAccount={onLoadAccount}
                    onLogout={onLogout}
                    onDensityChange={setUiDensity}
                    onSetPassword={onSetPassword}
                  />
                </div>
              </header>
              <div
                ref={contentRef}
                className={["min-h-0 flex-1 overflow-y-auto", contentPadding].join(" ")}
              >
                {children}
              </div>
            </section>
          </div>
        </main>
      </TopBarActionsContext.Provider>
    </RollLogProvider>
  );
}

function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  onNavigate: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div
        className={[
          "app-brand-tile mb-5 flex items-center rounded-lg bg-primary px-3 py-3 text-primary-foreground",
          collapsed ? "justify-center" : "gap-3",
        ].join(" ")}
      >
        <Shield className="h-6 w-6" />
        <div className={collapsed ? "sr-only" : ""}>
          <div className="font-semibold">bluDM</div>
          <div className="text-xs opacity-80">DM workspace</div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-1">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-surface-foreground hover:bg-surface hover:text-foreground",
                ].join(" ")
              }
              key={item.to}
              to={item.to}
              onClick={onNavigate}
            >
              <item.icon className="h-4 w-4" />
              <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      {onToggleCollapsed && (
        <button
          type="button"
          className={[
            "mt-4 flex shrink-0 items-center rounded-md border border-border bg-surface px-2.5 py-2 text-sm font-medium text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            collapsed ? "justify-center" : "gap-3",
          ].join(" ")}
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          <span className={collapsed ? "sr-only" : ""}>{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      )}
    </div>
  );
}

function shellCrumbs(pathname: string): Array<{ label: string; to?: string }> {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Campaigns", to: "/campaigns" }];
  return parts.map((part, index) => {
    const path = `/${parts.slice(0, index + 1).join("/")}`;
    if (/^[0-9a-f-]{20,}$/i.test(part)) return { label: "Detail", to: path };
    if (part === "encounter-runs") return { label: "Encounter Runs", to: path };
    return {
      label: part.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      to: path,
    };
  });
}

function parentPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  if (parts[0] === "campaigns" && parts.length >= 4 && parts[2] === "encounters")
    return `/campaigns/${parts[1]}`;
  if (parts[0] === "encounter-runs" && parts.length > 1) return `/encounter-runs/${parts[1]}`;
  if (parts[0] === "players" && parts.length > 1) return "/players";
  if (parts[0] === "npcs" && parts.length > 1) return "/npcs";
  return `/${parts.slice(0, -1).join("/")}`;
}

export function BackButton({ to, children = "Back" }: { to: string; children?: React.ReactNode }) {
  void to;
  void children;
  return null;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  void items;
  return null;
}
