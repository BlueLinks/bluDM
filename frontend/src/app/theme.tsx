import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui";

export type ThemeMode = "system" | "light" | "dark";
export type ThemeAccent = "green" | "blue" | "pink" | "red";

type ThemePalette = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  tertiary: string;
  tertiaryForeground: string;
  neutral: string;
  neutralForeground: string;
  surface: string;
  surfaceForeground: string;
  accent: string;
  accentForeground: string;
};

const THEME_STORAGE_KEY = "bludm-theme";
const ACCENT_STORAGE_KEY = "bludm-accent";

const themePalettes: Record<"light" | "dark", Record<ThemeAccent, ThemePalette>> = {
  light: {
    green: {
      primary: "148 48% 26%",
      primaryForeground: "0 0% 100%",
      secondary: "102 24% 35%",
      secondaryForeground: "0 0% 100%",
      tertiary: "30 34% 34%",
      tertiaryForeground: "0 0% 100%",
      neutral: "32 12% 42%",
      neutralForeground: "0 0% 100%",
      surface: "40 35% 93%",
      surfaceForeground: "132 14% 11%",
      accent: "146 48% 31%",
      accentForeground: "0 0% 100%",
    },
    blue: {
      primary: "212 78% 38%",
      primaryForeground: "0 0% 100%",
      secondary: "184 62% 31%",
      secondaryForeground: "0 0% 100%",
      tertiary: "158 44% 30%",
      tertiaryForeground: "0 0% 100%",
      neutral: "218 12% 43%",
      neutralForeground: "0 0% 100%",
      surface: "205 36% 94%",
      surfaceForeground: "132 14% 11%",
      accent: "196 74% 42%",
      accentForeground: "0 0% 100%",
    },
    pink: {
      primary: "330 58% 39%",
      primaryForeground: "0 0% 100%",
      secondary: "315 32% 38%",
      secondaryForeground: "0 0% 100%",
      tertiary: "274 45% 36%",
      tertiaryForeground: "0 0% 100%",
      neutral: "24 14% 44%",
      neutralForeground: "0 0% 100%",
      surface: "42 35% 93%",
      surfaceForeground: "132 14% 11%",
      accent: "326 70% 46%",
      accentForeground: "0 0% 100%",
    },
    red: {
      primary: "8 66% 37%",
      primaryForeground: "0 0% 100%",
      secondary: "24 74% 40%",
      secondaryForeground: "0 0% 100%",
      tertiary: "350 46% 31%",
      tertiaryForeground: "0 0% 100%",
      neutral: "25 14% 43%",
      neutralForeground: "0 0% 100%",
      surface: "39 35% 93%",
      surfaceForeground: "132 14% 11%",
      accent: "16 72% 41%",
      accentForeground: "0 0% 100%",
    },
  },
  dark: {
    green: {
      primary: "144 52% 61%",
      primaryForeground: "220 30% 8%",
      secondary: "95 35% 62%",
      secondaryForeground: "220 30% 8%",
      tertiary: "34 44% 64%",
      tertiaryForeground: "220 30% 8%",
      neutral: "214 16% 66%",
      neutralForeground: "220 30% 8%",
      surface: "220 12% 18%",
      surfaceForeground: "204 36% 94%",
      accent: "150 68% 68%",
      accentForeground: "220 30% 8%",
    },
    blue: {
      primary: "202 84% 68%",
      primaryForeground: "220 30% 8%",
      secondary: "182 70% 60%",
      secondaryForeground: "220 30% 8%",
      tertiary: "156 48% 60%",
      tertiaryForeground: "220 30% 8%",
      neutral: "214 16% 66%",
      neutralForeground: "220 30% 8%",
      surface: "220 12% 18%",
      surfaceForeground: "204 36% 94%",
      accent: "194 84% 72%",
      accentForeground: "220 30% 8%",
    },
    pink: {
      primary: "327 78% 72%",
      primaryForeground: "220 30% 8%",
      secondary: "312 50% 70%",
      secondaryForeground: "220 30% 8%",
      tertiary: "274 58% 72%",
      tertiaryForeground: "220 30% 8%",
      neutral: "214 16% 66%",
      neutralForeground: "220 30% 8%",
      surface: "220 12% 18%",
      surfaceForeground: "204 36% 94%",
      accent: "334 82% 76%",
      accentForeground: "220 30% 8%",
    },
    red: {
      primary: "6 84% 69%",
      primaryForeground: "220 30% 8%",
      secondary: "27 86% 64%",
      secondaryForeground: "220 30% 8%",
      tertiary: "350 58% 68%",
      tertiaryForeground: "220 30% 8%",
      neutral: "214 16% 66%",
      neutralForeground: "220 30% 8%",
      surface: "220 12% 18%",
      surfaceForeground: "204 36% 94%",
      accent: "12 86% 72%",
      accentForeground: "220 30% 8%",
    },
  },
};

const accentOptions: Array<{
  key: ThemeAccent;
  label: string;
  description: string;
}> = [
  { key: "green", label: "Forest", description: "Green, moss, and bark tones" },
  { key: "blue", label: "Ocean", description: "Blue, teal, and sea-green tones" },
  { key: "pink", label: "Blossom", description: "Pink, mauve, and purple tones" },
  { key: "red", label: "Ember", description: "Red, rust, and burgundy tones" },
];

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [accent, setAccent] = useState<ThemeAccent>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    return stored === "blue" || stored === "pink" || stored === "red" ? stored : "green";
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
  const palette = themePalettes[resolvedTheme][accent];

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [theme, resolvedTheme]);

  useEffect(() => {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--primary-foreground", palette.primaryForeground);
    root.style.setProperty("--secondary", palette.secondary);
    root.style.setProperty("--secondary-foreground", palette.secondaryForeground);
    root.style.setProperty("--tertiary", palette.tertiary);
    root.style.setProperty("--tertiary-foreground", palette.tertiaryForeground);
    root.style.setProperty("--neutral", palette.neutral);
    root.style.setProperty("--neutral-foreground", palette.neutralForeground);
    root.style.setProperty("--surface", palette.surface);
    root.style.setProperty("--surface-foreground", palette.surfaceForeground);
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-foreground", palette.accentForeground);
    root.dataset.themeAccent = accent;
  }, [accent, palette]);

  return { accent, setAccent, theme, setTheme, resolvedTheme };
}

export function ThemeMenu({
  accent,
  theme,
  resolvedTheme,
  onAccentChange,
  onThemeChange,
}: {
  accent: ThemeAccent;
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  onAccentChange: (accent: ThemeAccent) => void;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        className="hidden sm:inline-flex"
        type="button"
        variant="ghost"
        size="sm"
        icon={resolvedTheme === "dark" ? Moon : Sun}
        onClick={() => setOpen((current) => !current)}
      >
        Theme
      </Button>
      {open && (
        <div className="depth-raised absolute right-0 top-full z-50 mt-2 grid w-64 gap-3 rounded-lg p-3 text-sm">
          <div className="grid gap-1">
            <p className="px-2 text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
              Theme
            </p>
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={[
                  "rounded-md border px-3 py-2 text-left capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  theme === option
                    ? "border-primary/35 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/95 hover:text-primary-foreground"
                    : "border-transparent text-surface-foreground hover:border-primary/20 hover:bg-surface hover:text-foreground",
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
          <div className="grid gap-1">
            <p className="px-2 text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
              Accent
            </p>
            {accentOptions.map((option) => {
              const colors = themePalettes[resolvedTheme][option.key];
              const selected = accent === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={[
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    selected
                      ? "border-primary/35 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/95 hover:text-primary-foreground"
                      : "border-transparent text-surface-foreground hover:border-primary/20 hover:bg-surface hover:text-foreground",
                  ].join(" ")}
                  onClick={() => {
                    onAccentChange(option.key);
                    setOpen(false);
                  }}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: `hsl(${colors.primary})` }}
                  />
                  <span className="min-w-0">
                    <span className="block">{option.label}</span>
                    <span
                      className={[
                        "block text-xs",
                        selected ? "text-primary-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
