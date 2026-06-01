import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/api";
import { itemPayload } from "../../lib/api/payloads";
import type { Item } from "../../types";
import { blankItemForm } from "./ItemFormModal";
import { ArmorFields } from "./ItemFormEquipmentSections";
import { ItemsPage } from "./pages";

vi.mock("../../lib/api", () => ({
  api: {
    cloneItem: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
    items: vi.fn(),
    standardSources: vi.fn(),
    updateItem: vi.fn(),
  },
}));

describe("ItemsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api.items).mockResolvedValue({ items: [standardItem(), customItem()] });
    vi.mocked(api.standardSources).mockResolvedValue({
      sources: [
        {
          attribution: "Structured SRD 2014 content.",
          createdAt: "",
          key: "srd-2014",
          label: "SRD 2014",
          licenseName: "OGL 1.0a",
          ruleset: "D&D 5e 2014",
          sourceUrl: "https://www.dnd5eapi.co/",
          updatedAt: "",
        },
      ],
    });
    vi.mocked(api.cloneItem).mockResolvedValue({
      item: customItem({ id: "clone", name: "Copy of Longsword" }),
    });
    vi.mocked(api.createItem).mockResolvedValue({
      item: customItem({ id: "new", name: "Lantern" }),
    });
    vi.mocked(api.updateItem).mockResolvedValue({ item: customItem() });
    vi.mocked(api.deleteItem).mockResolvedValue(undefined);
  });

  it("shows standard and custom items in one catalog", async () => {
    render(<ItemsPage />);

    expect(await screen.findByText("Longsword")).toBeTruthy();
    expect(screen.getByText("Moonblade")).toBeTruthy();
    expect(screen.getByText("SRD 2014")).toBeTruthy();
    expect(screen.getAllByText("Custom").length).toBeGreaterThan(0);
  });

  it("keeps standard items clone-only while custom items can be edited", async () => {
    render(<ItemsPage />);

    const previewButtons = await screen.findAllByText("Preview");
    fireEvent.click(previewButtons[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Read-only standard item/)).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Edit" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clone" }));

    await waitFor(() => expect(api.cloneItem).toHaveBeenCalledWith("standard-1", "standard"));
  });

  it("renders subtype catalog details and searches enriched item fields", async () => {
    vi.mocked(api.items).mockResolvedValue({
      items: [
        standardItem({
          damage: {
            damage: { damage_dice: "1d8", damage_type: { name: "Slashing" } },
            two_handed_damage: { damage_dice: "1d10" },
          },
          data: { mastery: "Sap" },
        }),
        standardItem({
          armorClass: { base: 16, str_minimum: 13, stealth_disadvantage: true },
          category: "Armor",
          id: "armor-1",
          itemType: "Heavy Armor",
          name: "Chain Mail",
          valueAmount: 75,
          weight: 55,
        }),
        standardItem({
          category: "Tools",
          data: { ability: "Dexterity", craft_outputs: ["keys"], utilize: "Pick a lock" },
          id: "tool-1",
          itemType: "Other Tools",
          name: "Thieves' Tools",
          valueAmount: 25,
          weight: 1,
        }),
      ],
    });

    render(<ItemsPage />);

    expect(await screen.findByText("1d8 Slashing")).toBeTruthy();
    expect(screen.getByText("Mastery: Sap")).toBeTruthy();
    expect(screen.getByText("AC 16")).toBeTruthy();
    expect(screen.getByText("Stealth disadvantage")).toBeTruthy();
    expect(screen.getByText("Dexterity")).toBeTruthy();
    expect(screen.getByText("Utilize: Pick a lock")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search items"), { target: { value: "sap" } });

    await waitFor(() => expect(screen.getByText("Longsword")).toBeTruthy());
    expect(screen.queryByText("Chain Mail")).toBeNull();
    expect(screen.queryByText("Thieves' Tools")).toBeNull();
  });

  it("keeps category filters visible and removes non-clickable signals", async () => {
    vi.mocked(api.items).mockResolvedValue({
      items: [
        standardItem({ category: "Weapon", id: "weapon-1", name: "Longsword" }),
        standardItem({ category: "Armor", id: "armor-1", name: "Shield" }),
        standardItem({ category: "Tool", id: "tool-1", name: "Thieves' Tools" }),
      ],
    });

    render(<ItemsPage />);

    await screen.findByText("Longsword");
    fireEvent.click(filterButton("Weapon"));

    expect(screen.getByText("Longsword")).toBeTruthy();
    expect(screen.queryByText("Shield")).toBeNull();
    expect(filterButton("Armor")).toBeTruthy();
    expect(screen.queryByText("Signals")).toBeNull();

    fireEvent.click(filterButton("Armor"));
    expect(screen.getByText("Shield")).toBeTruthy();
    expect(screen.queryByText("Longsword")).toBeNull();

    fireEvent.click(filterButton("All categories"));
    expect(screen.getByText("Longsword")).toBeTruthy();
    expect(screen.getByText("Shield")).toBeTruthy();
  });

  it("renders the new item form with selects and property chips", () => {
    render(<ItemsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New item" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Category")).toBeTruthy();
    expect(within(dialog).getByText("Type")).toBeTruthy();
    expect(within(dialog).getByText("Rarity")).toBeTruthy();
    expect(within(dialog).queryByPlaceholderText("Finesse, Light, Thrown")).toBeNull();
    expect(within(dialog).getByText("Type details: Adventuring Gear")).toBeTruthy();
  });

  it("builds structured weapon, armor, tool, focus, and food payloads", () => {
    const weapon = itemPayload({
      ...blankItemForm,
      category: "Weapon",
      damageDice: "1d8",
      damageType: "Slashing",
      longRange: "20",
      mastery: "Sap",
      name: "Longsword",
      normalRange: "5",
      properties: ["Versatile"],
      twoHandedDamageDice: "1d10",
      weaponCategory: "Martial",
      weaponRange: "Melee",
    });
    expect(weapon.properties).toEqual(["Versatile"]);
    expect(weapon.damage).toMatchObject({
      damage: { damage_dice: "1d8", damage_type: { name: "Slashing" } },
      range: { normal: 5, long: 20 },
      two_handed_damage: { damage_dice: "1d10" },
    });
    expect(weapon.data).toMatchObject({ mastery: "Sap", weaponCategory: "Martial" });

    const armor = itemPayload({
      ...blankItemForm,
      acBase: "18",
      armorCategory: "Heavy Armor",
      category: "Armor",
      name: "Plate",
      shield: true,
      stealthDisadvantage: true,
      strengthMinimum: "15",
    });
    expect(armor.armorClass).toMatchObject({
      base: 18,
      shield: true,
      stealth_disadvantage: true,
      str_minimum: 15,
    });

    const tool = itemPayload({
      ...blankItemForm,
      ability: "Dexterity",
      category: "Tool",
      craftOutputs: "keys, traps",
      name: "Thieves' Tools",
      utilize: "Pick a lock",
      variants: "masterwork",
    });
    expect(tool.data).toMatchObject({
      ability: "Dexterity",
      craft_outputs: ["keys", "traps"],
      utilize: "Pick a lock",
      variants: ["masterwork"],
    });

    const focus = itemPayload({
      ...blankItemForm,
      category: "Focus",
      focusFamily: "Arcane",
      focusUsage: "Held",
      focusVariant: "Wand",
      name: "Wand",
    });
    expect(focus.data).toMatchObject({
      focusFamily: "Arcane",
      focus_usage: "Held",
      variant: "Wand",
    });

    const food = itemPayload({
      ...blankItemForm,
      category: "Food and Lodging",
      consumeBehavior: "Consumed on use",
      effect: "Daily ration",
      name: "Rations",
      quality: "Modest",
      serviceDuration: "1 day",
    });
    expect(food.data).toMatchObject({
      consumeBehavior: "Consumed on use",
      effect: "Daily ration",
      quality: "Modest",
      serviceDuration: "1 day",
    });
  });

  it("renders only the selected armor AC field", () => {
    const setField = vi.fn();
    const { rerender } = render(
      <ArmorFields form={{ ...blankItemForm, category: "Armor" }} setField={setField} />,
    );

    expect(screen.getAllByText("Base AC").length).toBeGreaterThan(0);
    expect(screen.queryByText("AC bonus")).toBeNull();

    rerender(
      <ArmorFields
        form={{ ...blankItemForm, acMode: "bonus", category: "Armor" }}
        setField={setField}
      />,
    );

    expect(screen.getAllByText("AC bonus").length).toBeGreaterThan(0);
    expect(screen.queryByText("Base AC")).toBeNull();
  });

  it("hides shield armor constraints unless existing values need cleanup", () => {
    const setField = vi.fn();
    const { rerender } = render(
      <ArmorFields
        form={{
          ...blankItemForm,
          acBonus: "2",
          acMode: "bonus",
          armorCategory: "Shield",
          category: "Armor",
          itemType: "Shield",
          shield: true,
        }}
        setField={setField}
      />,
    );

    expect(screen.getByText("AC bonus")).toBeTruthy();
    expect(screen.queryByText("Dex modifier")).toBeNull();
    expect(screen.queryByText("Strength minimum")).toBeNull();
    expect(screen.queryByText("Stealth disadvantage")).toBeNull();

    rerender(
      <ArmorFields
        form={{
          ...blankItemForm,
          acBonus: "2",
          acMode: "bonus",
          armorCategory: "Shield",
          category: "Armor",
          itemType: "Shield",
          shield: true,
          strengthMinimum: "13",
        }}
        setField={setField}
      />,
    );

    expect(screen.getByText("Strength minimum")).toBeTruthy();
  });

  it("prunes stale subtype data from payloads", () => {
    const nonArmor = itemPayload({
      ...blankItemForm,
      acBase: "18",
      category: "Tool",
      damageDice: "1d8",
      name: "Odd kit",
      properties: ["Versatile"],
      toolCategory: "Artisan's Tools",
    });
    expect(nonArmor.armorClass).toEqual({});
    expect(nonArmor.damage).toEqual({});
    expect(nonArmor.properties).toEqual([]);
    expect(nonArmor.data).toMatchObject({
      inventory: {
        carried: true,
        consumable: false,
        equippable: false,
        stackable: false,
      },
      toolCategory: "Artisan's Tools",
    });
    expect(nonArmor.data).not.toHaveProperty("weaponCategory");

    const baseArmor = itemPayload({
      ...blankItemForm,
      acBase: "18",
      acBonus: "2",
      armorCategory: "Heavy Armor",
      category: "Armor",
      name: "Plate",
    });
    expect(baseArmor.armorClass).toEqual({ base: 18 });

    const shield = itemPayload({
      ...blankItemForm,
      acBase: "18",
      acBonus: "2",
      acMode: "bonus",
      armorCategory: "Shield",
      category: "Armor",
      dexModifier: "none",
      itemType: "Shield",
      name: "Shield",
      shield: true,
    });
    expect(shield.armorClass).toEqual({ bonus: 2, shield: true });
  });
});

function filterButton(label: string) {
  const button = screen
    .getAllByRole("button")
    .find((entry) => entry.textContent?.replace(/\s+/g, " ").trim().startsWith(label));
  if (!button) throw new Error(`Could not find filter button ${label}`);
  return button;
}

function standardItem(overrides: Partial<Item> = {}): Item {
  return {
    armorClass: {},
    attunement: false,
    category: "Weapon",
    createdAt: "",
    damage: {},
    data: {},
    description: "A martial melee weapon.",
    id: "standard-1",
    itemType: "Martial Melee Weapons",
    librarySource: "standard",
    name: "Longsword",
    properties: ["Versatile"],
    rarity: "",
    readOnly: true,
    sourceKey: "srd-2014",
    sourceLabel: "SRD 2014",
    updatedAt: "",
    valueAmount: 15,
    valueUnit: "gp",
    weight: 3,
    ...overrides,
  };
}

function customItem(overrides: Partial<Item> = {}): Item {
  return {
    ...standardItem({
      id: "custom-1",
      librarySource: "user",
      name: "Moonblade",
      readOnly: false,
      sourceKey: "",
      sourceLabel: "",
    }),
    ...overrides,
  };
}
