import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { createDungeonStudioDocument, type DungeonStudioDocument } from "./dungeonStudioDocument";
import { DungeonStudioStartScreen } from "./DungeonStudioStartScreen";

vi.mock("../../../lib/api", () => ({
  api: { previewGeneratedDungeon: vi.fn() },
}));

describe("DungeonStudioStartScreen", () => {
  it("lets a DM choose custom or preview and accept generated output", async () => {
    const onStartCustom = vi.fn();
    const acceptedDocuments: DungeonStudioDocument[] = [];
    const onAcceptGenerated = vi.fn((document: DungeonStudioDocument) => {
      acceptedDocuments.push(document);
    });
    vi.mocked(api.previewGeneratedDungeon).mockImplementation((_campaignId, settings) =>
      Promise.resolve({
        document: {
          ...createDungeonStudioDocument(),
          generation: { generator: settings.type, seed: settings.seed, settings },
        },
      }),
    );

    render(
      <DungeonStudioStartScreen
        campaignId="campaign-1"
        locationName="The Sunken Keep"
        onStartCustom={onStartCustom}
        onAcceptGenerated={onAcceptGenerated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fully custom dungeon/i }));
    expect(onStartCustom).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Randomly generated dungeon/i }));
    expect(await screen.findByRole("img", { name: /Generated dungeon preview/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "keep-seed" } });
    await waitFor(() =>
      expect(api.previewGeneratedDungeon).toHaveBeenLastCalledWith(
        "campaign-1",
        expect.objectContaining({ seed: "keep-seed" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Accept and edit/i }));

    expect(onAcceptGenerated).toHaveBeenCalledOnce();
    expect(acceptedDocuments[0]?.generation?.seed).toBe("keep-seed");
  });
});
