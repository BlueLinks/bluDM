import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../lib/api";
import { CombatReportPage } from "./CombatReportPage";
import { historyReport } from "./combatHistoryFixtures";

vi.mock("../../../lib/api", () => ({ api: { combatReport: vi.fn(), resumeCombat: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("CombatReportPage", () => {
  it("opens a paused report without resuming combat, switches metrics and drills into the log", async () => {
    const report = historyReport();
    report.run.status = "active";
    vi.mocked(api.combatReport).mockResolvedValue(report);
    render(
      <MemoryRouter initialEntries={["/encounter-runs/run-1/report"]}>
        <Routes>
          <Route path="/encounter-runs/:runID/report" element={<CombatReportPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Bridge ambush" });
    expect(api.resumeCombat).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "History" }).getAttribute("href")).toBe(
      "/campaigns/campaign-1/encounters?tab=history",
    );
    fireEvent.click(screen.getByRole("button", { name: "Turn time" }));
    expect(screen.getByRole("meter", { name: "Wrenn time" }).getAttribute("aria-valuenow")).toBe(
      "90000",
    );
    fireEvent.click(screen.getByRole("button", { name: "Enemies" }));
    expect(screen.getByRole("meter", { name: "Goblin time" })).toBeTruthy();
    const rounds = screen.getByRole("heading", { name: "Round breakdown" }).closest("section")!;
    fireEvent.click(within(rounds).getByRole("button", { name: /Round 1/ }));
    expect(screen.getByRole("heading", { name: "Round log" })).toBeTruthy();
    expect(screen.getByText(/Wrenn healed Goblin for 2/)).toBeTruthy();
    expect(api.resumeCombat).not.toHaveBeenCalled();
  });
});
