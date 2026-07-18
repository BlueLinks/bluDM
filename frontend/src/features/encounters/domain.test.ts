import { describe, expect, it } from "vitest";
import type { Encounter } from "../../types";
import { encounterMetaChanged } from "./domain";

describe("encounter domain helpers", () => {
  it("does not mark unloaded optional location ids as dirty", () => {
    expect(
      encounterMetaChanged(encounter({ locationId: undefined }), {
        name: "Roadside Trouble",
        description: "",
        status: "planned",
        location: "",
        locationId: "",
        roomNumber: "",
      }),
    ).toBe(false);
  });
});

function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    campaignId: "campaign-1",
    name: "Roadside Trouble",
    description: "",
    status: "planned",
    location: "",
    roomNumber: "",
    lootNotes: "",
    combatantCount: 0,
    enemyCount: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
