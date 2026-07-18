import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BundleSelectRow, ImportModeCards } from "./ImportPageUi";
import { bundleOptions } from "./ImportPageSupport";

describe("ImportPageUi selections", () => {
  afterEach(cleanup);

  it("uses the selected mode foreground for import descriptions", () => {
    render(<ImportModeCards selected="clone" />);

    expect(screen.getByText("Import as new content with new IDs.").className).toContain(
      "text-accent-foreground",
    );
    expect(
      screen.getByText("Requires archive validation and an empty account.").className,
    ).toContain("text-surface-foreground");
  });

  it("keeps selected export choices on the matching accent foreground", () => {
    render(<BundleSelectRow option={bundleOptions[0]} selected onClick={() => undefined} />);

    const selectedChoice = screen.getByRole("button", { name: /Everything/ });
    expect(selectedChoice.className).toContain("bg-accent");
    expect(screen.getByText(bundleOptions[0].copy).className).toContain("text-accent-foreground");
    expect(selectedChoice.querySelector("svg")?.getAttribute("class")).toContain(
      "text-accent-foreground",
    );
  });
});
