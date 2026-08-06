import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { APITokenSettings } from "./APITokenSettings";

vi.mock("../lib/api", () => ({
  api: {
    apiTokens: vi.fn(),
    campaigns: vi.fn(),
    createAPIToken: vi.fn(),
    revokeAPIToken: vi.fn(),
  },
}));

describe("APITokenSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(api.apiTokens).mockResolvedValue({ tokens: [] });
    vi.mocked(api.campaigns).mockResolvedValue({ campaigns: [] });
    vi.mocked(api.createAPIToken).mockResolvedValue({
      secret: "bludm_v1_only-shown-once",
      token: {
        id: "token-1",
        name: "Obsidian Vault bridge",
        tokenPrefix: "bludm_v1_only",
        createdAt: "2026-07-27T00:00:00Z",
        expiresAt: "2026-10-25T00:00:00Z",
        scopes: ["campaigns:read"],
        campaignRestrictionMode: "all",
        allowedCampaignIds: [],
        authenticationVersion: 2,
      },
    });
  });

  afterEach(cleanup);

  it("shows a newly created secret only in the creation result", async () => {
    render(<APITokenSettings />);
    expect(await screen.findByText("No external tools can access this account.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    expect(await screen.findByText("bludm_v1_only-shown-once")).toBeTruthy();
    expect(screen.getByText("Shown once")).toBeTruthy();
    expect(screen.getByText("Obsidian Vault bridge")).toBeTruthy();
    expect(api.createAPIToken).toHaveBeenCalledWith(
      "Codex read-only",
      90,
      expect.objectContaining({
        campaignRestrictionMode: "all",
        allowedCampaignIds: [],
      }),
    );
    expect(screen.getByText("Scopes: campaigns:read")).toBeTruthy();
  });

  it("supports custom scopes and selected-campaign restrictions", async () => {
    vi.mocked(api.campaigns).mockResolvedValue({
      campaigns: [
        {
          id: "campaign-1",
          name: "Ashen Coast",
          description: "",
          allowedStandardSources: [],
          createdAt: "2026-07-27T00:00:00Z",
          updatedAt: "2026-07-27T00:00:00Z",
        },
      ],
    });

    render(<APITokenSettings />);
    await screen.findByText("No external tools can access this account.");

    fireEvent.click(screen.getByText("Read-only"));
    fireEvent.click(await screen.findByRole("option", { name: "Custom" }));
    for (const label of [
      "Party",
      "World read",
      "Library read",
      "Encounters read",
      "Session summaries",
    ]) {
      fireEvent.click(screen.getByRole("checkbox", { name: label }));
    }
    fireEvent.click(screen.getByRole("checkbox", { name: "World write" }));

    fireEvent.click(screen.getByText("All my campaigns"));
    fireEvent.click(await screen.findByRole("option", { name: "Selected campaigns" }));
    expect(screen.getByRole("button", { name: "Create token" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: "Ashen Coast" }));
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    await waitFor(() =>
      expect(api.createAPIToken).toHaveBeenCalledWith("Codex read-only", 90, {
        scopes: ["campaigns:read", "world:write"],
        campaignRestrictionMode: "selected",
        allowedCampaignIds: ["campaign-1"],
      }),
    );
  });

  it("includes campaign and party management in the campaign-writer preset", async () => {
    render(<APITokenSettings />);
    await screen.findByText("No external tools can access this account.");

    fireEvent.click(screen.getByText("Read-only"));
    fireEvent.click(await screen.findByRole("option", { name: "Campaign writer" }));
    fireEvent.click(screen.getByRole("button", { name: "Create token" }));

    await waitFor(() => expect(api.createAPIToken).toHaveBeenCalled());
    const access = vi.mocked(api.createAPIToken).mock.calls.at(-1)?.[2];
    expect(access?.scopes).toContain("campaigns:write");
    expect(access?.scopes).toContain("party:write");
  });

  it("labels legacy tokens without implying MCP write access", async () => {
    vi.mocked(api.apiTokens).mockResolvedValue({
      tokens: [
        {
          id: "legacy-token",
          name: "Existing Vault bridge",
          tokenPrefix: "bludm_legacy",
          createdAt: "2026-07-01T00:00:00Z",
          expiresAt: "2026-10-01T00:00:00Z",
          scopes: ["campaigns:read"],
          campaignRestrictionMode: "legacy_all",
          allowedCampaignIds: [],
          authenticationVersion: 1,
        },
      ],
    });

    render(<APITokenSettings />);

    expect(
      await screen.findByText("Legacy token · existing bridge access only · MCP writes disabled"),
    ).toBeTruthy();
    expect(screen.queryByText(/^Scopes:/)).toBeNull();
  });
});
