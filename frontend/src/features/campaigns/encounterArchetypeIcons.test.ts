import { describe, expect, it } from "vitest";
import { encounterArchetypeIcons } from "./encounterArchetypeIcons";

describe("encounter archetype icons", () => {
  it("keeps every bundled icon attributed and licensed", () => {
    expect(Object.values(encounterArchetypeIcons)).toHaveLength(10);
    for (const icon of Object.values(encounterArchetypeIcons)) {
      expect(icon.license).toBe("CC BY 3.0");
      expect(icon.path).toMatch(/^\/game-icons\/encounter-archetypes\/.+\.svg$/);
      expect(icon.sourceUrl).toContain("https://game-icons.net/");
    }
  });
});
