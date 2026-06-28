import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../../../types";
import { CampaignWorldLocationStock } from "./CampaignWorldLocationStock";
import type { CampaignLocation, CampaignLocationStock } from "./travelTypes";

describe("CampaignWorld commerce polish", () => {
  afterEach(() => cleanup());

  it("summarizes shop inventory and adjusts existing stock", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CampaignWorldLocationStock
        dominant
        items={[item()]}
        loading={false}
        location={location()}
        stock={[stock()]}
        onCreate={onCreate}
        onCustomItemCreated={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("Limited/hidden")).toBeTruthy();
    expect(screen.getByText("Inventory")).toBeTruthy();
    expect(screen.getByText("Potion / Consumable")).toBeTruthy();
    expect(screen.getByText("common")).toBeTruthy();
    expect(screen.getByText("Behind the counter.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));
    const dialog = await screen.findByRole("dialog", { name: "Adjust shop stock" });
    fireEvent.change(within(dialog).getByLabelText("Qty"), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText("Price"), { target: { value: "90" } });
    fireEvent.change(within(dialog).getByLabelText("Currency"), { target: { value: "gp" } });
    fireEvent.change(within(dialog).getByLabelText("Availability"), {
      target: { value: "special-order" },
    });
    fireEvent.change(within(dialog).getByLabelText("Stock notes"), {
      target: { value: "Requires a deposit." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Update stock" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        locationId: "shop-1",
        itemId: "item-1",
        librarySource: "user",
        quantity: 2,
        priceAmount: 90,
        priceUnit: "gp",
        availability: "special-order",
        notes: "Requires a deposit.",
      }),
    );
  });
});

function location(): CampaignLocation {
  return {
    id: "shop-1",
    campaignId: "campaign-1",
    name: "Copper Kettle",
    locationType: "shop",
    notes: "Copper pots hang from the rafters.",
    publicNotes: "Copper pots hang from the rafters.",
    dmNotes: "",
    tags: [],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
  };
}

function stock(): CampaignLocationStock {
  return {
    id: "stock-1",
    campaignId: "campaign-1",
    locationId: "shop-1",
    itemId: "item-1",
    librarySource: "user",
    quantity: 4,
    priceAmount: 75,
    priceUnit: "sp",
    availability: "limited",
    notes: "Behind the counter.",
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
  };
}

function item(): Item {
  return {
    id: "item-1",
    name: "Healing Draught",
    category: "Potion",
    itemType: "Consumable",
    rarity: "common",
    attunement: false,
    valueAmount: 50,
    valueUnit: "gp",
    weight: 0,
    description: "A bitter red tonic.",
    properties: [],
    damage: {},
    armorClass: {},
    data: {},
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    createdAt: "",
    updatedAt: "",
  };
}
