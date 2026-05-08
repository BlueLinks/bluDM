import {
  ArrowLeft,
  Castle,
  Import,
  Menu,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
  Swords,
  UsersRound,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { DiceRoller } from "../components/DiceRoller";
import { Button } from "../components/ui";
import type { AccountInfo, User } from "../types";
import { AccountMenu } from "./AccountMenu";

const navItems = [
  { to: "/campaigns", label: "Campaigns", icon: Castle },
  { to: "/players", label: "Players", icon: UsersRound },
  { to: "/npcs", label: "NPCs", icon: Swords },
  { to: "/spells", label: "Spells", icon: Sparkles },
  { to: "/items", label: "Items", icon: Package },
  { to: "/rules", label: "Rules", icon: ScrollText },
  { to: "/import", label: "Import", icon: Import },
];

export function useThemeMode() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    const stored = localStorage.getItem("bludm-theme");
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    localStorage.setItem("bludm-theme", theme);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [theme, resolvedTheme]);

  return { theme, setTheme, resolvedTheme };
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
  user,
  theme,
  resolvedTheme,
  onThemeChange,
  onLogout,
  onLoadAccount,
  onSetPassword,
}: {
  children: React.ReactNode;
  user?: User;
  theme: "system" | "light" | "dark";
  resolvedTheme: "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
  onLogout: () => Promise<void>;
  onLoadAccount: () => Promise<AccountInfo>;
  onSetPassword: (currentPassword: string, newPassword: string) => Promise<AccountInfo>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("bludm-sidebar") === "collapsed",
  );
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = shellCrumbs(location.pathname);
  const parent = parentPath(location.pathname);

  useEffect(() => {
    localStorage.setItem("bludm-sidebar", sidebarCollapsed ? "collapsed" : "expanded");
  }, [sidebarCollapsed]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={[
            "hidden h-screen shrink-0 self-start overflow-hidden border-r border-border bg-card transition-all lg:sticky lg:top-0 lg:block",
            sidebarCollapsed ? "w-20" : "w-64",
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
        <section className="flex h-screen min-w-0 flex-1 flex-col">
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
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-accent">bluDM</div>
                <nav
                  className="flex min-w-0 flex-wrap items-center gap-1 text-sm font-semibold"
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
                          <span className="max-w-48 truncate text-foreground">{crumb.label}</span>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </nav>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DiceRoller />
              <ThemeMenu
                resolvedTheme={resolvedTheme}
                theme={theme}
                onThemeChange={onThemeChange}
              />
              <AccountMenu
                user={user}
                onLoadAccount={onLoadAccount}
                onLogout={onLogout}
                onSetPassword={onSetPassword}
              />
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
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
    <div className="flex h-full min-h-0 flex-col p-4">
      <div
        className={[
          "mb-6 flex items-center rounded-lg bg-primary px-3 py-3 text-primary-foreground",
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
            "mt-4 flex shrink-0 items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
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
          <span className={collapsed ? "sr-only" : ""}>
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </button>
      )}
    </div>
  );
}

function ThemeMenu({
  theme,
  resolvedTheme,
  onThemeChange,
}: {
  theme: "system" | "light" | "dark";
  resolvedTheme: "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={resolvedTheme === "dark" ? Moon : Sun}
        onClick={() => setOpen((current) => !current)}
      >
        Theme
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 grid w-36 gap-1 rounded-lg border border-border bg-card p-2 text-sm shadow-xl">
          {(["system", "light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={[
                "rounded-md px-3 py-2 text-left capitalize hover:bg-muted",
                theme === option ? "bg-muted font-semibold" : "",
              ].join(" ")}
              onClick={() => {
                onThemeChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
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
