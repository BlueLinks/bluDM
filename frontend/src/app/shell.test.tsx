import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeMode } from "./shell";
import { ThemeMenu } from "./theme";

describe("useThemeMode", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: vi.fn(() => store.clear()),
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      removeItem: vi.fn((key: string) => store.delete(key)),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    });
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme-accent");
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--secondary");
    document.documentElement.style.removeProperty("--tertiary");
    document.documentElement.style.removeProperty("--neutral");
    document.documentElement.style.removeProperty("--surface");
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--primary-foreground");
    document.documentElement.style.removeProperty("--secondary-foreground");
    document.documentElement.style.removeProperty("--tertiary-foreground");
    document.documentElement.style.removeProperty("--neutral-foreground");
    document.documentElement.style.removeProperty("--surface-foreground");
    document.documentElement.style.removeProperty("--accent-foreground");
  });

  it("persists the selected accent and applies matching theme variables", async () => {
    localStorage.setItem("bludm-theme", "system");
    localStorage.setItem("bludm-accent", "green");
    render(<ThemeHarness />);

    expect(screen.getByText("system / green / light")).toBeTruthy();
    expect(document.documentElement.dataset.themeAccent).toBe("green");
    expect(document.documentElement.style.getPropertyValue("--primary")).toContain("148 48% 26%");

    fireEvent.click(screen.getByRole("button", { name: "Blue accent" }));

    await waitFor(() => {
      expect(localStorage.getItem("bludm-accent")).toBe("blue");
      expect(document.documentElement.dataset.themeAccent).toBe("blue");
      expect(document.documentElement.style.getPropertyValue("--primary")).toContain("212 78% 38%");
      expect(document.documentElement.style.getPropertyValue("--secondary")).toContain(
        "184 62% 31%",
      );
      expect(document.documentElement.style.getPropertyValue("--tertiary")).toContain(
        "158 44% 30%",
      );
      expect(document.documentElement.style.getPropertyValue("--neutral")).toContain("218 12% 43%");
      expect(document.documentElement.style.getPropertyValue("--surface")).toContain("205 30% 98%");
      expect(document.documentElement.style.getPropertyValue("--surface-foreground")).toContain(
        "132 14% 11%",
      );
    });
  });

  it("switches the shell class when the theme changes", async () => {
    localStorage.setItem("bludm-theme", "system");
    localStorage.setItem("bludm-accent", "green");
    render(<ThemeHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    await waitFor(() => {
      expect(localStorage.getItem("bludm-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("uses the selected theme foreground for palette descriptions", () => {
    render(
      <ThemeMenu
        accent="green"
        resolvedTheme="light"
        theme="light"
        onAccentChange={vi.fn()}
        onThemeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));

    const selectedMode = screen.getByRole("button", { name: "light" });
    const selectedPalette = screen.getByText("Forest").closest("button") as HTMLButtonElement;
    expect(selectedMode.className).toContain("text-primary-foreground");
    expect(selectedMode.className).toContain("hover:text-primary-foreground");
    expect(selectedMode.className).not.toContain("text-surface-foreground");
    expect(selectedPalette.className).toContain("text-primary-foreground");
    expect(selectedPalette.className).toContain("hover:text-primary-foreground");
    expect(selectedPalette.className).not.toContain("text-surface-foreground");
    expect(screen.getByText("Green, moss, and bark tones").className).toContain(
      "text-primary-foreground",
    );
    expect(screen.getByText("Pink, mauve, and purple tones").className).toContain(
      "text-muted-foreground",
    );
  });

  it.each([
    ["light", "green", "148 48% 26%", "102 24% 35%", "30 34% 34%", "40 30% 98%", "132 14% 11%"],
    ["light", "blue", "212 78% 38%", "184 62% 31%", "158 44% 30%", "205 30% 98%", "132 14% 11%"],
    ["light", "pink", "330 58% 39%", "315 32% 38%", "274 45% 36%", "42 30% 98%", "132 14% 11%"],
    ["light", "red", "8 66% 37%", "24 74% 40%", "350 46% 31%", "39 30% 98%", "132 14% 11%"],
    ["dark", "green", "128 26% 22%", "128 24% 24%", "30 28% 27%", "207 28% 14%", "204 14% 93%"],
    ["dark", "blue", "202 84% 68%", "182 70% 60%", "156 48% 60%", "220 12% 18%", "204 36% 94%"],
    ["dark", "pink", "327 78% 72%", "312 50% 70%", "274 58% 72%", "220 12% 18%", "204 36% 94%"],
    ["dark", "red", "6 84% 69%", "27 86% 64%", "350 58% 68%", "220 12% 18%", "204 36% 94%"],
  ])(
    "applies a complete palette for %s / %s",
    async (theme, accent, primary, secondary, tertiary, surface, surfaceForeground) => {
      localStorage.setItem("bludm-theme", theme);
      localStorage.setItem("bludm-accent", accent);
      render(<ThemeHarness />);

      await waitFor(() => {
        expect(document.documentElement.style.getPropertyValue("--primary")).toContain(primary);
        expect(document.documentElement.style.getPropertyValue("--secondary")).toContain(secondary);
        expect(document.documentElement.style.getPropertyValue("--tertiary")).toContain(tertiary);
        expect(document.documentElement.style.getPropertyValue("--surface")).toContain(surface);
        expect(document.documentElement.style.getPropertyValue("--surface-foreground")).toContain(
          surfaceForeground,
        );
      });
    },
  );
});

function ThemeHarness() {
  const { accent, setAccent, resolvedTheme, setTheme, theme } = useThemeMode();

  return (
    <div>
      <p>
        {theme} / {accent} / {resolvedTheme}
      </p>
      <button type="button" onClick={() => setTheme("dark")}>
        Dark theme
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        Light theme
      </button>
      <button type="button" onClick={() => setAccent("blue")}>
        Blue accent
      </button>
      <button type="button" onClick={() => setAccent("pink")}>
        Pink accent
      </button>
      <button type="button" onClick={() => setAccent("red")}>
        Red accent
      </button>
    </div>
  );
}
