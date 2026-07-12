import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileScene } from "./CampaignWorldLocationScenes";
import type { LocationDetailTab } from "./CampaignWorldLocationModeTabs";
import type { LocationProfileInfo } from "./locationProfiles";

describe("CampaignWorldLocationScenes", () => {
  afterEach(() => cleanup());

  it("keeps dungeon map context before tab content", () => {
    renderScene({
      activeTab: "encounters",
      profile: dungeonProfile,
      sections: {
        encountersCard: <section>Encounter list</section>,
        mapCard: <section>Dungeon map preview</section>,
        prepCard: <section>Prep overview</section>,
      },
    });

    expect(screen.getByText("Dungeon map preview")).toBeTruthy();
    expect(screen.getByText("Encounter list")).toBeTruthy();
    expect(document.body.textContent?.indexOf("Dungeon map preview")).toBeLessThan(
      document.body.textContent?.indexOf("Tabs") ?? 0,
    );
  });

  it("keeps dungeon floors and rooms in one navigation surface", () => {
    renderScene({
      activeTab: "overview",
      profile: dungeonProfile,
      sections: {
        childCard: <section>Floors and rooms</section>,
        encountersCard: <section>Dungeon encounters</section>,
        mapCard: <section>Dungeon map preview</section>,
        prepCard: <section>Prep overview</section>,
        structureCard: <section>Dungeon structure</section>,
      },
    });

    expect(screen.getByText("Floors and rooms")).toBeTruthy();
    expect(screen.queryByText("Dungeon structure")).toBeNull();
  });

  it("shows prep overview only on the overview tab", () => {
    renderScene({
      activeTab: "encounters",
      profile: roomProfile,
      sections: {
        encountersCard: <section>Room encounters</section>,
        prepCard: <section>Prep overview</section>,
      },
    });

    expect(screen.getByText("Room encounters")).toBeTruthy();
    expect(screen.queryByText("Prep overview")).toBeNull();
  });

  it("keeps entry and exit details off unrelated room tabs", () => {
    renderScene({
      activeTab: "people",
      profile: roomProfile,
      sections: {
        linksCard: <section>Connected rooms</section>,
        npcsCard: <section>Room NPCs</section>,
      },
    });

    expect(screen.getByText("Room NPCs")).toBeTruthy();
    expect(screen.queryByText("Connected rooms")).toBeNull();
  });

  it("does not repeat spatial map cards inside focused tabs", () => {
    renderScene({
      activeTab: "notes",
      profile: roomProfile,
      sections: {
        mapCard: <section>Room map preview</section>,
        notesCard: <section>Room notes</section>,
      },
    });

    expect(screen.getAllByText("Room map preview")).toHaveLength(1);
    expect(screen.getByText("Room notes")).toBeTruthy();
  });

  it("keeps region overview focused on map, places, travel, and notes", () => {
    renderScene({
      activeTab: "overview",
      profile: regionProfile,
      sections: {
        childCard: <section>Key settlements</section>,
        encountersCard: <section>Empty encounters</section>,
        mapCard: <section>Region map</section>,
        notesCard: <section>Regional notes</section>,
        travelCard: <section>Routes</section>,
      },
    });

    expect(screen.getByText("Region map")).toBeTruthy();
    expect(screen.getByText("Key settlements")).toBeTruthy();
    expect(screen.queryByText("Empty encounters")).toBeNull();
  });

  it("keeps inventory and encounters out of the shop overview", () => {
    renderScene({
      activeTab: "overview",
      profile: shopProfile,
      sections: {
        encountersCard: <section>Shop encounters</section>,
        notesCard: <section>Shop notes</section>,
        npcsCard: <section>Shop staff</section>,
        stockCard: <section>Stock and prices</section>,
      },
    });

    expect(screen.getByText("Shop staff").closest(".campaign-world-balanced-flow")).toBeTruthy();
    expect(screen.getByText("Shop notes")).toBeTruthy();
    expect(screen.queryByText("Stock and prices")).toBeNull();
    expect(screen.queryByText("Shop encounters")).toBeNull();
  });

  it("uses the balanced flow for room overview cards", () => {
    renderScene({
      activeTab: "overview",
      profile: roomProfile,
      sections: {
        encountersCard: <section>Room encounter</section>,
        linksCard: <section>Connected rooms</section>,
        prepCard: <section>Prep overview</section>,
      },
    });

    expect(screen.getByText("Prep overview").closest(".campaign-world-balanced-flow")).toBeTruthy();
  });

  it("gives a single focused tab section the full content width", () => {
    renderScene({
      activeTab: "inventory",
      profile: shopProfile,
      sections: {
        stockCard: <section>Stock and prices</section>,
      },
    });

    const focusedScene = screen
      .getByText("Stock and prices")
      .closest(".campaign-world-focused-scene");
    expect(focusedScene).toBeTruthy();
    expect(focusedScene?.querySelector(".campaign-world-scene-grid")).toBeNull();
    expect(screen.queryByText("Inventory and availability")).toBeNull();
  });
});

function renderScene({
  activeTab,
  profile,
  sections,
}: {
  activeTab: LocationDetailTab;
  profile: LocationProfileInfo;
  sections: Record<string, React.ReactNode>;
}) {
  render(
    <ProfileScene
      activeTab={activeTab}
      profile={profile}
      sections={sections}
      tabBar={<nav>Tabs</nav>}
    />,
  );
}

const regionProfile: LocationProfileInfo = {
  badge: "Region container",
  childEmpty: "",
  childTitle: "Child settlements and landmarks",
  compactMap: false,
  label: "Region",
  notesTitle: "Notes",
  primaryActions: [],
  profile: "container",
  showMapCard: true,
  travel: "always",
  variant: "region",
};

const dungeonProfile: LocationProfileInfo = {
  ...regionProfile,
  badge: "Dungeon container",
  childTitle: "Floors and rooms",
  label: "Dungeon",
  travel: "relevant",
  variant: "dungeon",
};

const roomProfile: LocationProfileInfo = {
  badge: "Room profile",
  childEmpty: "",
  childTitle: "Child areas",
  compactMap: true,
  label: "Room",
  notesTitle: "Room notes",
  primaryActions: ["add-encounter", "link-exit"],
  profile: "room",
  showMapCard: false,
  travel: "hidden",
};

const shopProfile: LocationProfileInfo = {
  ...roomProfile,
  badge: "Shop profile",
  childTitle: "Areas",
  label: "Shop",
  notesTitle: "Shop notes",
  primaryActions: ["add-stock", "add-encounter"],
  profile: "shop",
  showMapCard: false,
};
