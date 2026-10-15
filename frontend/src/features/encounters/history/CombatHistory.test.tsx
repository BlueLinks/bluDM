import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { CombatHistory } from "./CombatHistory";

vi.mock("../../../lib/api", () => ({ api: { combatHistory: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("CombatHistory", () => {
  it("loads campaign history, paginates on the server and includes tests only on request", async () => {
    vi.mocked(api.combatHistory).mockResolvedValue({
      total: 21,
      runs: [
        {
          id: "run-1",
          encounterId: "encounter",
          encounterName: "Bridge ambush",
          status: "ended",
          isTest: false,
          startedAt: "2026-10-15T12:00:00Z",
          rounds: 4,
          damageDone: 248,
          healingDone: 46,
          activeTimeMs: 1392000,
        },
      ],
    });
    render(
      <MemoryRouter>
        <CombatHistory campaignId="campaign-1" onPrepared={vi.fn()} />
      </MemoryRouter>,
    );
    expect((await screen.findByRole("link", { name: "Bridge ambush" })).getAttribute("href")).toBe(
      "/encounter-runs/run-1/report",
    );
    expect(api.combatHistory).toHaveBeenLastCalledWith("campaign-1", {
      q: "",
      includeTests: false,
      page: 1,
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(api.combatHistory).toHaveBeenLastCalledWith("campaign-1", {
        q: "",
        includeTests: false,
        page: 2,
      }),
    );
    await screen.findByRole("button", { name: "Previous" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Include test runs" }));
    await waitFor(() =>
      expect(api.combatHistory).toHaveBeenLastCalledWith("campaign-1", {
        q: "",
        includeTests: true,
        page: 1,
      }),
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search combat history" }), {
      target: { value: "north" },
    });
    await waitFor(() =>
      expect(api.combatHistory).toHaveBeenLastCalledWith("campaign-1", {
        q: "north",
        includeTests: true,
        page: 1,
      }),
    );
  });
  it("provides an empty state and a recoverable request error", async () => {
    vi.mocked(api.combatHistory)
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValue({ runs: [], total: 0 });
    const prepared = vi.fn();
    render(
      <MemoryRouter>
        <CombatHistory campaignId="campaign-1" onPrepared={prepared} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Network unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "No combats recorded yet" });
    fireEvent.click(screen.getByRole("button", { name: "Go to prepared encounters" }));
    expect(prepared).toHaveBeenCalledOnce();
  });
});
