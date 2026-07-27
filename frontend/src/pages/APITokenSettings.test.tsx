import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { APITokenSettings } from "./APITokenSettings";

vi.mock("../lib/api", () => ({
  api: {
    apiTokens: vi.fn(),
    createAPIToken: vi.fn(),
    revokeAPIToken: vi.fn(),
  },
}));

describe("APITokenSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.apiTokens).mockResolvedValue({ tokens: [] });
    vi.mocked(api.createAPIToken).mockResolvedValue({
      secret: "bludm_v1_only-shown-once",
      token: {
        id: "token-1",
        name: "Obsidian Vault bridge",
        tokenPrefix: "bludm_v1_only",
        createdAt: "2026-07-27T00:00:00Z",
        expiresAt: "2026-10-25T00:00:00Z",
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
    expect(api.createAPIToken).toHaveBeenCalledWith("Obsidian Vault bridge", 90);
  });
});
