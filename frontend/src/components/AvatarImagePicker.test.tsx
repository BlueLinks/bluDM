import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvatarDialogBody } from "./AvatarCropDialog";
import { avatarImageSrc } from "./AvatarImagePicker";

describe("avatar image helpers", () => {
  it("prefers uploaded assets over external URLs", () => {
    expect(avatarImageSrc("asset-1", "https://example.test/avatar.png")).toBe(
      "/api/assets/asset-1",
    );
    expect(avatarImageSrc("", "https://example.test/avatar.png")).toBe(
      "https://example.test/avatar.png",
    );
    expect(avatarImageSrc()).toBe("");
  });

  it("renders crop controls and forwards avatar dialog actions", () => {
    const callbacks = {
      onCancel: vi.fn(),
      onClear: vi.fn(),
      onFile: vi.fn(),
      onFlipX: vi.fn(),
      onFlipY: vi.fn(),
      onImageError: vi.fn(),
      onImageLoad: vi.fn(),
      onPointerCancel: vi.fn(),
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onRotate: vi.fn(),
      onSave: vi.fn(),
      onURLChange: vi.fn(),
      onWheel: vi.fn(),
      onZoom: vi.fn(),
    };

    render(
      <AvatarDialogBody
        canSave
        cropActive
        cropSize={120}
        error="Preview failed"
        imageRef={createRef<HTMLImageElement>()}
        imageStyle={{ width: "160px" }}
        imageURL="https://example.test/avatar.png"
        label="Character avatar"
        name="Edda"
        sourceSrc="/api/assets/asset-1"
        stageSize={180}
        uploading={false}
        {...callbacks}
      />,
    );

    expect(screen.getByAltText("Character avatar preview")).toBeTruthy();
    expect(screen.getByText("Preview failed")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    fireEvent.change(screen.getByLabelText("Image URL"), {
      target: { value: "https://cdn.example.test/next.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save avatar" }));

    expect(callbacks.onZoom).toHaveBeenCalledWith(0.03);
    expect(callbacks.onRotate).toHaveBeenCalled();
    expect(callbacks.onURLChange).toHaveBeenCalledWith("https://cdn.example.test/next.png");
    expect(callbacks.onSave).toHaveBeenCalled();
  });
});
