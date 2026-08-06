import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShell } from "../../app/shell";
import { api } from "../../lib/api";
import type { Campaign, Player } from "../../types";
import { PlayersPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    campaigns: vi.fn(),
    clonePlayer: vi.fn(),
    deletePlayer: vi.fn(),
    movePlayer: vi.fn(),
    players: vi.fn(),
  },
}));

describe("PlayersPage", () => {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    storage.clear();
    storage.set("bludm-ui-density", "comfy");
    vi.stubGlobal("localStorage", localStorage);
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    vi.mocked(api.campaigns).mockResolvedValue({ campaigns: campaigns() });
    vi.mocked(api.players).mockResolvedValue({ players: [] });
    vi.mocked(api.deletePlayer).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("groups characters by campaign ID and always places Unassigned last", async () => {
    const duplicateNames = campaigns().map((campaign) => ({ ...campaign, name: "Twin Campaign" }));
    vi.mocked(api.campaigns).mockResolvedValue({ campaigns: duplicateNames });
    vi.mocked(api.players).mockResolvedValue({
      players: [
        player({ id: "player-a", characterName: "Aster", campaignId: "campaign-a" }),
        player({ id: "player-b", characterName: "Bram", campaignId: "campaign-b" }),
      ],
    });

    renderPage();

    const campaignHeadings = await screen.findAllByText("Twin Campaign", { selector: "h5" });
    expect(campaignHeadings).toHaveLength(2);
    expect(within(requiredSection(campaignHeadings[0])).getByText("Aster")).toBeTruthy();
    expect(within(requiredSection(campaignHeadings[1])).getByText("Bram")).toBeTruthy();
    expect(within(requiredSection(campaignHeadings[0])).getByText("1 character")).toBeTruthy();
    const unassignedHeading = screen.getByText("Unassigned", { selector: "h5" });
    expect(
      campaignHeadings[1].compareDocumentPosition(unassignedHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(requiredSection(unassignedHeading)).getByText(/No unassigned characters/i),
    ).toBeTruthy();
  });

  it("switches persisted Compact and Comfy modes and omits temporary HP from the roster", async () => {
    vi.mocked(api.players).mockResolvedValue({
      players: [
        player({
          characterName: "Aster",
          campaignId: "campaign-a",
          temporaryHitPoints: 99,
        }),
      ],
    });

    renderPage();

    expect(await screen.findByText("STR")).toBeTruthy();
    expect(screen.queryByText("Temp")).toBeNull();
    expect(screen.queryByText("99")).toBeNull();
    expect(screen.getByText("16/24")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(screen.queryByText("STR")).toBeNull();
    await waitFor(() =>
      expect(localStorage.setItem).toHaveBeenCalledWith("bludm-ui-density", "compact"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Comfy" }));
    expect(screen.getByText("STR")).toBeTruthy();
    await waitFor(() =>
      expect(localStorage.setItem).toHaveBeenCalledWith("bludm-ui-density", "comfy"),
    );
  });

  it("moves characters between campaigns and to Unassigned while updating counts", async () => {
    const source = player({ characterName: "Aster", campaignId: "campaign-a" });
    const companion = player({
      id: "player-b",
      characterName: "Bram",
      campaignId: "campaign-b",
      campaignName: "Campaign B",
    });
    vi.mocked(api.players).mockResolvedValue({ players: [source, companion] });
    vi.mocked(api.movePlayer)
      .mockResolvedValueOnce({
        player: { ...source, campaignId: "campaign-b", campaignName: "Campaign B" },
      })
      .mockResolvedValueOnce({
        player: { ...source, campaignId: "", campaignName: undefined },
      });

    renderPage();
    await screen.findByText("Aster");

    openCharacterAction("Aster", "Move to campaign");
    const firstDialog = screen.getByRole("dialog");
    expect(
      within(firstDialog).getByRole("button", { name: "Move character" }).hasAttribute("disabled"),
    ).toBe(true);
    chooseCampaign(firstDialog, "Campaign B");
    fireEvent.click(within(firstDialog).getByRole("button", { name: "Move character" }));

    await waitFor(() => expect(api.movePlayer).toHaveBeenCalledWith("player-a", "campaign-b"));
    const campaignBSection = requiredSection(screen.getByText("Campaign B", { selector: "h5" }));
    expect(within(campaignBSection).getByText("2 characters")).toBeTruthy();
    expect(within(campaignBSection).getByText("Aster")).toBeTruthy();
    expect(screen.queryByText("Campaign A", { selector: "h5" })).toBeNull();

    openCharacterAction("Aster", "Move to campaign");
    const secondDialog = screen.getByRole("dialog");
    chooseCampaign(secondDialog, "Unassigned");
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Move character" }));

    await waitFor(() => expect(api.movePlayer).toHaveBeenCalledWith("player-a", ""));
    const updatedCampaignBSection = requiredSection(
      screen.getByText("Campaign B", { selector: "h5" }),
    );
    expect(within(updatedCampaignBSection).getByText("1 character")).toBeTruthy();
    const unassignedSection = requiredSection(screen.getByText("Unassigned", { selector: "h5" }));
    expect(within(unassignedSection).getByText("1 character")).toBeTruthy();
    expect(within(unassignedSection).getByText("Aster")).toBeTruthy();
  });

  it("clones a character into the same campaign and updates its count", async () => {
    const source = player({ characterName: "Aster", campaignId: "campaign-a" });
    const clone = player({
      id: "player-copy",
      characterName: "Aster Copy",
      campaignId: "campaign-a",
    });
    vi.mocked(api.players).mockResolvedValue({ players: [source] });
    vi.mocked(api.clonePlayer).mockResolvedValue({ player: clone });

    renderPage();
    await screen.findByText("Aster");
    openCharacterAction("Aster", "Clone character");

    expect(await screen.findByText("Aster Copy")).toBeTruthy();
    expect(api.clonePlayer).toHaveBeenCalledWith("player-a");
    const campaignSection = requiredSection(screen.getByText("Campaign A", { selector: "h5" }));
    expect(within(campaignSection).getByText("2 characters")).toBeTruthy();
    expect(within(campaignSection).getByText("Aster Copy")).toBeTruthy();
  });

  it("confirms deletion, explains campaign references, and removes the final campaign group", async () => {
    vi.mocked(api.players).mockResolvedValue({
      players: [player({ characterName: "Aster", campaignId: "campaign-a" })],
    });

    renderPage();
    await screen.findByText("Aster");
    openCharacterAction("Aster", "Delete character");

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Campaign party references will also be removed/i),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete character" }));

    await waitFor(() => expect(api.deletePlayer).toHaveBeenCalledWith("player-a"));
    expect(screen.queryByText("Aster")).toBeNull();
    expect(screen.queryByText("Campaign A", { selector: "h5" })).toBeNull();
    const unassignedSection = requiredSection(screen.getByText("Unassigned", { selector: "h5" }));
    expect(within(unassignedSection).getByText("0 characters")).toBeTruthy();
    expect(within(unassignedSection).getByText(/No unassigned characters/i)).toBeTruthy();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/players"]}>
      <WorkspaceShell
        accent="blue"
        resolvedTheme="light"
        theme="light"
        onAccentChange={vi.fn()}
        onLoadAccount={vi.fn()}
        onLogout={vi.fn()}
        onSetPassword={vi.fn()}
        onThemeChange={vi.fn()}
      >
        <PlayersPage />
      </WorkspaceShell>
    </MemoryRouter>,
  );
}

function openCharacterAction(characterName: string, actionName: string) {
  fireEvent.click(screen.getByRole("button", { name: `Character actions for ${characterName}` }));
  fireEvent.click(screen.getByRole("menuitem", { name: actionName }));
}

function chooseCampaign(dialog: HTMLElement, campaignName: string) {
  const trigger = within(dialog).getByRole("combobox");
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  fireEvent.click(screen.getByRole("option", { name: campaignName }));
}

function requiredSection(node: HTMLElement) {
  const section = node.closest("section");
  if (!section) throw new Error(`No section found for ${node.textContent}`);
  return section;
}

function campaigns(): Campaign[] {
  return [campaign("campaign-a", "Campaign A"), campaign("campaign-b", "Campaign B")];
}

function campaign(id: string, name: string): Campaign {
  return {
    id,
    name,
    description: "",
    allowedStandardSources: [],
    createdAt: "2026-08-06T10:00:00Z",
    updatedAt: "2026-08-06T10:00:00Z",
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-a",
    campaignId: "",
    campaignName: undefined,
    characterName: "Hero",
    playerName: "Rory",
    avatarUrl: "",
    armorClass: 15,
    maxHitPoints: 24,
    currentHitPoints: 16,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    experiencePoints: 900,
    characterSheet: {
      className: "Bard",
      level: 3,
      abilityScores: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 16 },
    },
    createdAt: "2026-08-06T10:00:00Z",
    updatedAt: "2026-08-06T10:00:00Z",
    ...overrides,
  };
}
