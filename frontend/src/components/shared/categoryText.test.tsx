import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassNameText, DifficultyText } from "./categoryText";

describe("category text", () => {
  afterEach(cleanup);

  it("uses the canonical class color for each multiclass segment", () => {
    render(<ClassNameText>Fighter 4 / Wizard 1</ClassNameText>);

    expect(screen.getByText("Fighter").className).toContain("text-class-fighter");
    expect(screen.getByText("Wizard").className).toContain("text-class-wizard");
    expect(screen.getByText("4").className).toContain("text-muted-foreground");
  });

  it("uses semantic difficulty colors", () => {
    render(<DifficultyText>Deadly</DifficultyText>);
    expect(screen.getByText("Deadly").className).toContain("text-destructive");
  });
});
