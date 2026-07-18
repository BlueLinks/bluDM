import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CampaignWorldLocationEditor } from "./CampaignWorldLocationEditor";

const baseProps = {
  editingLocation: null,
  error: "",
  locations: [],
  mapMarker: "",
  name: "",
  open: true,
  parentID: "",
  publicNotes: "",
  shopTemplate: "",
  summary: "",
  tags: "",
  dmNotes: "",
  onClose: vi.fn(),
  onDmNotesChange: vi.fn(),
  onMapMarkerChange: vi.fn(),
  onNameChange: vi.fn(),
  onOpenChange: vi.fn(),
  onParentIDChange: vi.fn(),
  onPublicNotesChange: vi.fn(),
  onShopTemplateChange: vi.fn(),
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onSummaryChange: vi.fn(),
  onTagsChange: vi.fn(),
};

describe("CampaignWorldLocationEditor", () => {
  it("starts create flow with location type cards", () => {
    const onLocationTypeChange = vi.fn();
    render(
      <CampaignWorldLocationEditor
        {...baseProps}
        locationType="settlement"
        onLocationTypeChange={onLocationTypeChange}
      />,
    );

    expect(screen.getByText("Choose a location type")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Shop \/ business/i }));
    expect(onLocationTypeChange).toHaveBeenCalledWith("shop");
  });

  it("defers dungeon generation choice to Dungeon Studio", () => {
    render(
      <CampaignWorldLocationEditor
        {...baseProps}
        locationType="dungeon"
        onLocationTypeChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("img", { name: "Random dungeon preview" })).toBeNull();
    expect(screen.queryByLabelText("Seed")).toBeNull();
    expect(screen.getByText(/opens Dungeon Studio/i)).toBeTruthy();
  });
});
