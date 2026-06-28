import { describe, expect, it } from "vitest";
import {
  applyShopTemplateDefaults,
  shopTemplateKeyForLabel,
  shopTemplateLabel,
} from "./campaignWorldShopTemplates";

describe("campaign world shop templates", () => {
  it("maps template keys to labels for location custom type payloads", () => {
    expect(shopTemplateLabel("armoury")).toBe("Armoury");
    expect(shopTemplateKeyForLabel("Potion store")).toBe("potion-store");
  });

  it("fills blank shop fields without overwriting custom edits", () => {
    const general = applyShopTemplateDefaults(
      { dmNotes: "", mapMarker: "", publicNotes: "", summary: "", tags: "" },
      "",
      "general-store",
    );
    const potionStore = applyShopTemplateDefaults(
      { ...general, summary: "My custom summary" },
      "general-store",
      "potion-store",
    );

    expect(general.tags).toBe("shop, general goods, supplies");
    expect(potionStore.summary).toBe("My custom summary");
    expect(potionStore.tags).toBe("shop, potions, healing");
  });
});
