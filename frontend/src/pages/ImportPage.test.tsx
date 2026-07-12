import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { ImportPage } from "./ImportPage";

vi.mock("../lib/api", () => ({
  api: {
    campaigns: vi.fn(),
    campaign: vi.fn(),
    campaignJourneys: vi.fn(),
    campaignLocations: vi.fn(),
    campaignMaps: vi.fn(),
    campaignRollTables: vi.fn(),
    createExport: vi.fn(),
    creatures: vi.fn(),
    executeImport: vi.fn(),
    history: vi.fn(),
    deleteHistory: vi.fn(),
    clearHistory: vi.fn(),
    items: vi.fn(),
    players: vi.fn(),
    previewImport: vi.fn(),
    spells: vi.fn(),
  },
}));

describe("ImportPage", () => {
  const dependencyGraph = {
    audit: { errors: [], missingRequired: 0, orphanedNodes: 0, unexpectedCycles: 0, warnings: [] },
    counts: {
      assets: 0,
      edges: 0,
      missing: 0,
      objects: 1,
      optionalObjects: 0,
      requiredObjects: 1,
      standardReferences: 0,
    },
    edges: [],
    nodes: [{ id: "campaign:campaign-1", kind: "campaign", label: "Curse of the Black Spire" }],
    order: ["campaign:campaign-1"],
    projection: {
      counts: {
        assets: 0,
        edges: 0,
        internalRecords: 3,
        objects: 1,
        rootObjects: 1,
        standardReferences: 0,
      },
      edges: [],
      groups: [{ count: 1, kind: "campaign", label: "Campaigns" }],
      nodes: [
        {
          category: "Campaigns",
          id: "campaign:curse-of-the-black-spire-a1b2c3d4",
          internalRecords: 3,
          kind: "campaign",
          label: "Curse of the Black Spire",
          root: true,
        },
      ],
      roots: ["campaign:curse-of-the-black-spire-a1b2c3d4"],
    },
    reverseEdges: [],
    roots: ["campaign:campaign-1"],
    warnings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mockedApi = vi.mocked(api);
    mockedApi.campaigns.mockResolvedValue({
      campaigns: [
        {
          allowedStandardSources: ["srd-2014"],
          createdAt: "2026-01-01T00:00:00Z",
          description: "A campaign",
          id: "campaign-1",
          name: "Curse of the Black Spire",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ],
    });
    mockedApi.createExport.mockResolvedValue({
      export: {
        bundleType: "campaign",
        counts: { assets: 1, campaigns: 1, npcs: 2, players: 3 },
        createdAt: "2026-01-03T00:00:00Z",
        downloadUrl: "/api/import-export/exports/export-1/download",
        id: "export-1",
        name: "bludm-campaign-20260103.zip",
        size: 2048,
        dependencyGraph,
      },
    });
    mockedApi.history.mockResolvedValue({ history: [] });
    mockedApi.deleteHistory.mockResolvedValue(undefined);
    mockedApi.clearHistory.mockResolvedValue(undefined);
    mockedApi.campaign.mockResolvedValue({
      campaign: {
        allowedStandardSources: ["srd-2014"],
        createdAt: "2026-01-01T00:00:00Z",
        description: "A campaign",
        id: "campaign-1",
        name: "Curse of the Black Spire",
        updatedAt: "2026-01-02T00:00:00Z",
      },
      encounterCount: 1,
      encounters: [
        {
          campaignId: "campaign-1",
          combatantCount: 0,
          createdAt: "2026-01-02T00:00:00Z",
          description: "",
          enemyCount: 0,
          id: "encounter-1",
          location: "",
          lootNotes: "",
          name: "Goblin Ambush",
          roomNumber: "",
          status: "planned",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ],
      locationCount: 0,
      npcs: [],
      playerCount: 0,
      players: [],
    });
    mockedApi.campaignMaps.mockResolvedValue({ maps: [] });
    mockedApi.campaignJourneys.mockResolvedValue({ journeys: [] });
    mockedApi.campaignRollTables.mockResolvedValue({ tables: [] });
    mockedApi.campaignLocations.mockResolvedValue({ locations: [] });
    mockedApi.creatures.mockResolvedValue({ creatures: [] });
    mockedApi.items.mockResolvedValue({ items: [] });
    mockedApi.players.mockResolvedValue({ players: [] });
    mockedApi.spells.mockResolvedValue({ spells: [] });
    mockedApi.previewImport.mockResolvedValue({
      preview: {
        bundleType: "campaign",
        conflicts: [
          {
            default: "rename-imported",
            entityKind: "item",
            impact: "2 internal records will follow the selected resolution.",
            importedId: "item-1",
            kind: "item",
            message: "Item: Healing Potion already exists.",
            name: "Healing Potion",
            options: ["rename-imported", "keep-existing", "skip-imported"],
            severity: "warning",
          },
        ],
        counts: {
          assets: 1,
          campaigns: 1,
          encounters: 2,
          items: 1,
          locations: 4,
          maps: 1,
          npcs: 2,
          players: 3,
          spells: 1,
        },
        estimatedBytes: 4096,
        exportedAt: "2026-01-04T00:00:00Z",
        restoreReadiness: {
          archiveValid: true,
          assetsVerified: true,
          databaseSafe: false,
          dependenciesComplete: true,
          messages: ["Restore requires an account with no existing portable data."],
          ready: false,
        },
        sourceAppVersion: "local",
        summary: {
          assets: 0,
          entities: [
            {
              category: "Campaigns",
              id: "campaign:curse-of-the-black-spire-a1b2c3d4",
              internalRecords: 3,
              kind: "campaign",
              label: "Curse of the Black Spire",
              root: true,
            },
          ],
          groups: [{ count: 1, kind: "campaign", label: "Campaigns" }],
          internalRecords: 3,
          rootObjects: 1,
          standardReferences: 0,
        },
        unsupported: [],
        verification: {
          archiveValid: true,
          assetsVerified: true,
          dependenciesComplete: true,
          duplicateEntities: false,
          graphValid: true,
          internalRecordsValid: true,
          logicalFilesValid: true,
          manifestValid: true,
          messages: [],
          missingRequired: 0,
          orphanedGraphNodes: 0,
          standardReferencesOk: true,
          unexpectedCycles: 0,
          unsupportedFuture: false,
        },
        version: 1,
        warnings: [],
        dependencyGraph,
      },
    });
    mockedApi.executeImport.mockResolvedValue({
      import: { campaignIds: ["new-campaign-1"], counts: { campaigns: 1 } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("replaces the dev-only page with the Import / Export overview", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Import / Export" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Seed test data/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Overview" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "History" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Safe & Transactional")).toBeTruthy();
  });

  it("renders the export builder and keeps custom bundles disabled", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));

    expect(screen.getByText("Create an Export")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Everything/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Campaigns/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Encounters/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /Journeys/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /Roll Tables/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /Custom Bundle/ })).toHaveProperty("disabled", true);
    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0);
  });

  it("downloads a campaign export after review", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: /Campaigns/ }));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith({
        bundleType: "campaign",
        campaignIds: ["campaign-1"],
        objectIds: [],
        options: {
          includeAssets: true,
          includeDungeonStudio: true,
          includePlayers: true,
        },
      }),
    );
    expect(await screen.findByText("bludm-campaign-20260103.zip")).toBeTruthy();
    expect(screen.getAllByText(/1 campaign/).length).toBeGreaterThan(0);
  });

  it("exports selected NPC bundles with object IDs", async () => {
    vi.mocked(api).creatures.mockResolvedValue({
      creatures: [
        {
          alignment: "",
          armorClass: 13,
          avatarUrl: "",
          challengeRating: "1",
          createdAt: "2026-01-01T00:00:00Z",
          creatureType: "humanoid",
          description: "",
          hitDice: "",
          hitPoints: 11,
          id: "npc-1",
          librarySource: "user",
          name: "Black Spire Scout",
          readOnly: false,
          size: "Medium",
          sourceKey: "",
          sourceLabel: "",
          statBlock: {},
          updatedAt: "2026-01-01T00:00:00Z",
          xp: 200,
        },
      ],
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: /NPCs \/ Creatures/ }));
    fireEvent.click(await screen.findByLabelText(/Black Spire Scout/));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith({
        bundleType: "npc",
        campaignIds: [],
        objectIds: ["npc-1"],
        options: {
          includeAssets: true,
          includeDungeonStudio: true,
          includePlayers: true,
        },
      }),
    );
  });

  it("previews an uploaded bundle and shows conflicts before import", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Import" }));
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("file input not found");
    const file = new File(["zip"], "bundle.zip", { type: "application/zip" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(vi.mocked(api).previewImport.mock.calls[0]).toEqual([file, "clone"]),
    );
    expect(await screen.findByText("Import Preview")).toBeTruthy();
    expect(screen.getByText("High-level entities")).toBeTruthy();
    expect(screen.getByText("3 internal records grouped under this object.")).toBeTruthy();
    expect(screen.getByText("Restore Readiness")).toBeTruthy();
    expect(
      screen.getByText("Restore requires an account with no existing portable data."),
    ).toBeTruthy();
    expect(screen.getByText("Item: Healing Potion already exists.")).toBeTruthy();
    expect(
      screen.getByText("2 internal records will follow the selected resolution."),
    ).toBeTruthy();
    expect(screen.getByText("Rename Imported")).toBeTruthy();

    const importPanel = screen.getByRole("heading", { name: "Import" }).closest("section");
    if (!importPanel) throw new Error("import panel not found");
    fireEvent.click(within(importPanel).getByRole("button", { name: "Clone Import" }));

    await waitFor(() =>
      expect(vi.mocked(api).executeImport.mock.calls).toContainEqual([file, "clone", false, false]),
    );
    expect(await screen.findByText("Imported 1 campaign.")).toBeTruthy();
  });

  it("exports shop and dungeon bundles as selected location roots", async () => {
    vi.mocked(api).campaignLocations.mockResolvedValue({
      locations: [
        {
          campaignId: "campaign-1",
          id: "shop-1",
          locationType: "shop",
          name: "Moth & Mortar",
          notes: "",
        },
        {
          campaignId: "campaign-1",
          id: "dungeon-1",
          locationType: "dungeon",
          name: "Wave Echo Cave",
          notes: "",
        },
        {
          campaignId: "campaign-1",
          id: "room-1",
          locationType: "room",
          name: "Collapsed Hall",
          notes: "",
          parentLocationId: "dungeon-1",
        },
      ],
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: /Shops/ }));
    fireEvent.click(await screen.findByLabelText(/Moth & Mortar/));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith(
        expect.objectContaining({ bundleType: "shop", objectIds: ["shop-1"] }),
      ),
    );

    vi.mocked(api).createExport.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Dungeons/ }));
    expect(screen.queryByLabelText(/Collapsed Hall/)).toBeNull();
    fireEvent.click(await screen.findByLabelText(/Wave Echo Cave/));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith(
        expect.objectContaining({ bundleType: "dungeon", objectIds: ["dungeon-1"] }),
      ),
    );
  });

  it("exports selected journey and roll table bundles with campaign context", async () => {
    vi.mocked(api).campaignJourneys.mockResolvedValue({
      journeys: [
        {
          campaignId: "campaign-1",
          createdAt: "2026-01-02T00:00:00Z",
          destination: "Ash Bridge",
          distance: 14,
          distanceUnit: "miles",
          encounterDistanceFeet: 120,
          goodRoads: false,
          id: "journey-1",
          name: "Road to Ash Bridge",
          origin: "Black Spire",
          pace: "normal",
          routeInputMode: "route",
          terrain: "forest",
          updatedAt: "2026-01-02T00:00:00Z",
          weather: {
            precipitation: "light-rain-or-heavy-snow",
            temperature: "colder",
            temperatureDeltaF: 0,
            wind: "strong",
          },
        },
      ],
    });
    vi.mocked(api).campaignRollTables.mockResolvedValue({
      tables: [
        {
          campaignId: "campaign-1",
          category: "travel",
          createdAt: "2026-01-02T00:00:00Z",
          description: "Travel complications",
          dieExpression: "1d6",
          id: "table-1",
          name: "Road Complications",
          rows: [
            {
              id: "row-1",
              label: "Broken bridge",
              maxRoll: 1,
              minRoll: 1,
              notes: "",
              resultText: "The bridge is out.",
            },
          ],
          source: "campaign",
          tags: ["travel"],
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ],
    });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: /Journeys/ }));
    fireEvent.click(await screen.findByLabelText(/Road to Ash Bridge/));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith(
        expect.objectContaining({ bundleType: "journey", objectIds: ["journey-1"] }),
      ),
    );

    vi.mocked(api).createExport.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Roll Tables/ }));
    fireEvent.click(await screen.findByLabelText(/Road Complications/));
    fireEvent.click(screen.getByRole("button", { name: "Download Export" }));

    await waitFor(() =>
      expect(vi.mocked(api).createExport).toHaveBeenCalledWith(
        expect.objectContaining({ bundleType: "roll-table", objectIds: ["table-1"] }),
      ),
    );
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>,
  );
}
