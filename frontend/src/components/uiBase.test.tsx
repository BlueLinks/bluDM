import { Plus } from "lucide-react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./uiBase";

describe("Button", () => {
  afterEach(cleanup);

  it.each([
    [
      "primary",
      "Primary",
      [
        "bg-primary",
        "text-primary-foreground",
        "hover:bg-primary/95",
        "hover:text-primary-foreground",
        "active:bg-primary/90",
        "active:text-primary-foreground",
        "focus-visible:ring-primary/35",
      ],
    ],
    [
      "secondary",
      "Secondary",
      [
        "bg-secondary",
        "text-secondary-foreground",
        "hover:bg-secondary/95",
        "hover:text-secondary-foreground",
        "active:bg-secondary/90",
        "active:text-secondary-foreground",
      ],
    ],
    [
      "tertiary",
      "Tertiary",
      [
        "bg-tertiary",
        "text-tertiary-foreground",
        "hover:bg-tertiary/95",
        "hover:text-tertiary-foreground",
        "active:bg-tertiary/90",
        "active:text-tertiary-foreground",
      ],
    ],
    [
      "outline",
      "Outline",
      [
        "bg-background",
        "text-foreground",
        "hover:bg-surface",
        "hover:text-surface-foreground",
        "active:bg-surface/80",
        "active:text-surface-foreground",
      ],
    ],
    [
      "ghost",
      "Ghost",
      [
        "bg-transparent",
        "text-surface-foreground",
        "hover:bg-surface",
        "hover:text-foreground",
        "active:bg-surface/80",
        "active:text-surface-foreground",
      ],
    ],
    [
      "info",
      "Info",
      [
        "bg-info",
        "text-info-foreground",
        "hover:bg-info/95",
        "hover:text-info-foreground",
        "active:bg-info/90",
        "active:text-info-foreground",
      ],
    ],
    [
      "success",
      "Success",
      [
        "bg-success",
        "text-success-foreground",
        "hover:bg-success/95",
        "hover:text-success-foreground",
        "active:bg-success/90",
        "active:text-success-foreground",
      ],
    ],
    [
      "warning",
      "Warning",
      [
        "bg-warning",
        "text-warning-foreground",
        "hover:bg-warning/95",
        "hover:text-warning-foreground",
        "active:bg-warning/90",
        "active:text-warning-foreground",
      ],
    ],
    [
      "danger",
      "Danger",
      [
        "bg-destructive",
        "text-destructive-foreground",
        "hover:bg-destructive/95",
        "hover:text-destructive-foreground",
        "active:bg-destructive/90",
        "active:text-destructive-foreground",
      ],
    ],
  ] as const)(
    "renders the %s variant with explicit semantic state tokens",
    (variant, label, tokens) => {
      render(<Button variant={variant}>{label}</Button>);

      const button = screen.getByRole("button", { name: label });
      tokens.forEach((token) => {
        expect(button.className).toContain(token);
      });
    },
  );

  it("keeps coloured action variants from inheriting card depth backgrounds", () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="info">Info</Button>
        <Button variant="success">Success</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );

    ["Primary", "Secondary", "Tertiary", "Info", "Success", "Warning", "Danger"].forEach(
      (label) => {
        const button = screen.getByRole("button", { name: label });
        const classes = button.className.split(" ");
        expect(button.className).not.toContain("depth-interactive");
        expect(classes).not.toContain("bg-surface");
        expect(classes).not.toContain("text-surface-foreground");
      },
    );
  });

  it("keeps secondary buttons visually distinct from neutral outline and ghost buttons", () => {
    render(
      <>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Secondary" }).className).toContain("bg-secondary");
    expect(screen.getByRole("button", { name: "Outline" }).className).toContain("bg-background");
    expect(screen.getByRole("button", { name: "Ghost" }).className).toContain("bg-transparent");
  });

  it("keeps disabled buttons on a neutral surface", () => {
    render(
      <Button disabled icon={Plus} variant="primary">
        Disabled
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button.className).toContain("disabled:bg-surface/75");
    expect(button.className).toContain("disabled:text-muted-foreground");
    expect(button.className).toContain("disabled:border-border");
  });
});
