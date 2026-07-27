import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { Campaign, Creature } from "../types";
import { MarkdownEncounterTab } from "./ImportPageMarkdown";

vi.mock("../lib/api", () => ({
  api: {
    importMarkdownEncounters: vi.fn(),
    importMarkdownWorld: vi.fn(),
    previewMarkdownEncounters: vi.fn(),
    previewMarkdownWorld: vi.fn(),
  },
}));

const campaign: Campaign = {
  allowedStandardSources: ["srd-2014"],
  createdAt: "2026-01-01T00:00:00Z",
  description: "",
  id: "campaign-1",
  name: "The Dimming Light",
  updatedAt: "2026-01-01T00:00:00Z",
};

const preview = {
  sourcePath: "Cairncut Survey Camp.md",
  canImport: true,
  encounters: [
    {
      blockId: "hungry-scavengers",
      line: 42,
      name: "Hungry Scavengers",
      description: "Hungry rather than malicious.",
      status: "planned",
      location: "Cairncut Survey Camp",
      locationId: "location-1",
      room: "",
      loot: "",
      operation: "create" as const,
      combatants: [
        {
          name: "Wolf",
          side: "enemy" as const,
          quantity: 2,
          source: "SRD 2014",
          resolvedId: "wolf-1",
          armorClass: 13,
          hitPoints: 11,
          rolledHp: false,
        },
      ],
      warnings: [],
      errors: [],
    },
  ],
};

describe("MarkdownEncounterTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.previewMarkdownEncounters).mockResolvedValue({ preview });
    vi.mocked(api.importMarkdownEncounters).mockResolvedValue({
      preview,
      import: {
        operations: ["create"],
        encounters: [
          {
            campaignId: "campaign-1",
            combatantCount: 2,
            createdAt: "2026-01-01T00:00:00Z",
            description: "Hungry rather than malicious.",
            enemyCount: 2,
            id: "encounter-1",
            location: "Cairncut Survey Camp",
            locationId: "location-1",
            lootNotes: "",
            name: "Hungry Scavengers",
            roomNumber: "",
            status: "planned",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
      },
    });
  });

  afterEach(cleanup);

  it("previews before importing and opens the normal encounter editor", async () => {
    render(
      <MemoryRouter>
        <MarkdownEncounterTab campaigns={[campaign]} initialCampaignID="campaign-1" />
      </MemoryRouter>,
    );
    const markdown = "```bludm-encounter\nversion: 1\nid: hungry-scavengers\n```";
    const file = {
      name: "Cairncut Survey Camp.md",
      text: vi.fn().mockResolvedValue(markdown),
      webkitRelativePath: "",
    } as unknown as File;
    fireEvent.change(screen.getByLabelText("Vault note"), { target: { files: [file] } });
    expect(await screen.findByText("Cairncut Survey Camp.md")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Hungry Scavengers")).toBeTruthy();
    expect(screen.getByText("2× Wolf · enemy")).toBeTruthy();
    expect(api.previewMarkdownEncounters).toHaveBeenCalledWith("campaign-1", {
      markdown,
      sourcePath: "Cairncut Survey Camp.md",
    });

    fireEvent.click(screen.getByRole("button", { name: "Import content" }));
    expect((await screen.findByRole("link", { name: "Open encounter" })).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters/encounter-1/edit",
    );
    await waitFor(() => expect(api.importMarkdownEncounters).toHaveBeenCalled());
  });

  it("previews and imports NPC and dungeon blocks through the same flow", async () => {
    const worldPreview = {
      sourcePath: "The Sunken Keep.md",
      canImport: true,
      npcs: [
        {
          blockId: "keeper-voss",
          line: 4,
          name: "Keeper Voss",
          operation: "create" as const,
          location: "The Sunken Keep",
          locationId: "location-1",
          warnings: [],
          errors: [],
        },
      ],
      dungeons: [
        {
          blockId: "sunken-keep",
          line: 16,
          name: "The Sunken Keep",
          operation: "create" as const,
          floorCount: 1,
          maps: [
            {
              name: "The Sunken Keep Studio Map",
              kind: "dungeon-studio" as const,
              roomCount: 4,
            },
          ],
          warnings: [],
          errors: [],
        },
      ],
    };
    vi.mocked(api.previewMarkdownWorld).mockResolvedValue({ preview: worldPreview });
    vi.mocked(api.importMarkdownWorld).mockResolvedValue({
      preview: worldPreview,
      import: {
        npcs: [{ creature: importedCreature(), operation: "create" }],
        dungeons: [
          {
            location: {
              id: "dungeon-1",
              campaignId: "campaign-1",
              name: "The Sunken Keep",
              locationType: "dungeon",
              notes: "",
            },
            mapIds: ["map-1"],
            operation: "create",
          },
        ],
      },
    });
    render(
      <MemoryRouter>
        <MarkdownEncounterTab campaigns={[campaign]} initialCampaignID="campaign-1" />
      </MemoryRouter>,
    );
    const markdown =
      "```bludm-npc\nversion: 1\nid: keeper-voss\n```\n```bludm-dungeon\nversion: 1\nid: sunken-keep\n```";
    const file = {
      name: "The Sunken Keep.md",
      text: vi.fn().mockResolvedValue(markdown),
      webkitRelativePath: "",
    } as unknown as File;
    fireEvent.change(screen.getByLabelText("Vault note"), { target: { files: [file] } });
    await screen.findByText("The Sunken Keep.md");

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Keeper Voss")).toBeTruthy();
    expect(screen.getByText(/4 rooms/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Import content" }));
    expect((await screen.findByRole("link", { name: "Open NPC" })).getAttribute("href")).toBe(
      "/npcs/npc-1/edit",
    );
    expect(screen.getByRole("link", { name: "Open dungeon" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/world/location/dungeon-1",
    );
  });
});

function importedCreature(): Creature {
  return {
    id: "npc-1",
    name: "Keeper Voss",
    description: "",
    size: "Medium",
    creatureType: "humanoid",
    alignment: "neutral",
    armorClass: 13,
    hitPoints: 22,
    hitDice: "4d8+4",
    challengeRating: "1",
    xp: 200,
    avatarUrl: "",
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    statBlock: {},
    createdAt: "",
    updatedAt: "",
  };
}
