import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { CampaignRollTableTool } from "./CampaignRollTableTool";
import type { RollTable, RollTableRollResult } from "./rollTableTypes";

vi.mock("../../lib/api", () => ({
  api: {
    campaignRollTables: vi.fn(),
    cloneCampaignRollTable: vi.fn(),
    createCampaignRollTable: vi.fn(),
    deleteCampaignRollTable: vi.fn(),
    rollCampaignRollTable: vi.fn(),
    updateCampaignRollTable: vi.fn(),
  },
}));

describe("CampaignRollTableTool", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.campaignRollTables).mockResolvedValue({
      tables: [providedRollTable(), campaignRollTable()],
    });
    vi.mocked(api.rollCampaignRollTable).mockResolvedValue({ roll: rollTableResult() });
    vi.mocked(api.cloneCampaignRollTable).mockResolvedValue({
      table: campaignRollTable({ id: "roll-table-3", name: "Copy of Tavern Rumors" }),
    });
    vi.mocked(api.createCampaignRollTable).mockResolvedValue({
      table: campaignRollTable({
        id: "roll-table-4",
        name: "Dungeon Clues",
        tags: ["clue", "npc"],
      }),
    });
    vi.mocked(api.updateCampaignRollTable).mockResolvedValue({
      table: campaignRollTable({ name: "Edited Clues" }),
    });
    vi.mocked(api.deleteCampaignRollTable).mockResolvedValue(undefined);
  });

  it("lists campaign roll tables and rolls a selected table", async () => {
    render(<CampaignRollTableTool campaignId="campaign-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Tables" }));
    const dialog = await screen.findByRole("dialog");
    expect((await within(dialog).findAllByText("Tavern Rumors")).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("Dungeon Clues").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("rumor").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("clue").length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Roll table" }));

    await waitFor(() =>
      expect(api.rollCampaignRollTable).toHaveBeenCalledWith("campaign-1", "provided-rumors"),
    );
    expect(await within(dialog).findByText("Missing shipment")).toBeTruthy();
    expect(within(dialog).getByText("A merchant lost cargo despite hiring guards.")).toBeTruthy();
    expect(within(dialog).getByText("Recent table rolls")).toBeTruthy();
  });

  it("filters, creates, clones, edits, and deletes campaign tables", async () => {
    render(<CampaignRollTableTool campaignId="campaign-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Tables" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Search"), { target: { value: "dungeon" } });
    expect(within(dialog).queryByText("Tavern Rumors")).toBeNull();
    expect(within(dialog).getAllByText("Dungeon Clues").length).toBeGreaterThan(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Duplicate" }));
    await waitFor(() =>
      expect(api.cloneCampaignRollTable).toHaveBeenCalledWith("campaign-1", "roll-table-2"),
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "New table" }));
    expect(within(dialog).queryByRole("button", { name: "Fill gaps" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Sort rows" })).toBeNull();
    expect(within(dialog).queryByLabelText("Row 1 min")).toBeNull();
    expect(within(dialog).queryByLabelText("Row 1 max")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Remove row 1" })).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Dungeon Clues" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "rumor" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "clue" }));
    fireEvent.change(within(dialog).getByLabelText("New tag"), { target: { value: "NPC, Rumor" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add tag" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove tag npc" }));
    for (let index = 1; index <= 6; index += 1) {
      fireEvent.change(within(dialog).getByLabelText(`Row ${index} result`), {
        target: { value: `Result ${index}.` },
      });
    }
    const dieSelect = within(dialog).getByRole("combobox", { name: "Die expression" });
    fireEvent.click(dieSelect);
    fireEvent.click(await screen.findByRole("option", { name: "1d4" }));
    expect(within(dialog).queryByLabelText("Row 5 result")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save table" }));
    await waitFor(() =>
      expect(api.createCampaignRollTable).toHaveBeenCalledWith(
        "campaign-1",
        expect.objectContaining({
          name: "Dungeon Clues",
          tags: "rumor, clue",
          rows: [
            expect.objectContaining({ minRoll: 1, maxRoll: 1, resultText: "Result 1." }),
            expect.objectContaining({ minRoll: 2, maxRoll: 2, resultText: "Result 2." }),
            expect.objectContaining({ minRoll: 3, maxRoll: 3, resultText: "Result 3." }),
            expect.objectContaining({ minRoll: 4, maxRoll: 4, resultText: "Result 4." }),
          ],
        }),
      ),
    );
    await waitFor(() => expect(within(dialog).queryByText("Create roll table")).toBeNull());
    expect(within(dialog).getByRole("button", { name: "New table" })).toBeTruthy();
    expect(within(dialog).getByLabelText("Search")).toMatchObject({ value: "" });

    fireEvent.change(within(dialog).getByLabelText("Search"), { target: { value: "" } });
    await clickRollTableListItem(dialog, "Dungeon Clues");
    fireEvent.click(within(dialog).getByRole("button", { name: "Edit" }));
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Edited Clues" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove tag clue" }));
    expect(within(dialog).queryByRole("button", { name: "clue" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save table" }));
    await waitFor(() =>
      expect(api.updateCampaignRollTable).toHaveBeenCalledWith(
        "campaign-1",
        "roll-table-2",
        expect.objectContaining({ name: "Edited Clues", tags: "" }),
      ),
    );
    await waitFor(() => expect(within(dialog).queryByText("Edit roll table")).toBeNull());
    expect(within(dialog).getByRole("button", { name: "New table" })).toBeTruthy();

    await clickRollTableListItem(dialog, "Dungeon Clues");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete table" }));
    await waitFor(() =>
      expect(api.deleteCampaignRollTable).toHaveBeenCalledWith("campaign-1", "roll-table-2"),
    );
  });
});

async function clickRollTableListItem(dialog: HTMLElement, name: string) {
  const matches = await within(dialog).findAllByText(name);
  const button = matches.map((match) => match.closest("button")).find(Boolean);
  if (!button) throw new Error(`roll table list item not found: ${name}`);
  fireEvent.click(button);
}

function providedRollTable(overrides: Partial<RollTable> = {}): RollTable {
  return {
    id: "provided-rumors",
    campaignId: "",
    source: "provided",
    name: "Tavern Rumors",
    description: "Short rumor starters.",
    category: "rumor",
    tags: ["rumor"],
    dieExpression: "1d4",
    rows: rollRows(4),
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function campaignRollTable(overrides: Partial<RollTable> = {}): RollTable {
  return {
    id: "roll-table-2",
    campaignId: "campaign-1",
    source: "campaign",
    name: "Dungeon Clues",
    description: "Clues for room dressing.",
    category: "custom",
    tags: ["clue"],
    dieExpression: "1d4",
    rows: rollRows(4),
    createdAt: "2026-06-02T10:30:00Z",
    updatedAt: "2026-06-02T10:30:00Z",
    ...overrides,
  };
}

function rollRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    tableId: "roll-table-2",
    minRoll: index + 1,
    maxRoll: index + 1,
    label: `Result ${index + 1}`,
    resultText: `Result text ${index + 1}`,
    notes: "",
    sortOrder: index,
  }));
}

function rollTableResult(overrides: Partial<RollTableRollResult> = {}): RollTableRollResult {
  return {
    tableId: "provided-rumors",
    tableName: "Tavern Rumors",
    dieExpression: "1d4",
    rolledValue: 1,
    matchedRange: "1",
    label: "Missing shipment",
    resultText: "A merchant lost cargo despite hiring guards.",
    notes: "",
    rolledAt: "2026-06-03T12:00:00Z",
    ...overrides,
  };
}
