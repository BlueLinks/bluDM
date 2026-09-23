import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RollLogProvider } from "../components/RollLogProvider";
import type { AccountInfo, User } from "../types";
import { AccountMenu } from "./AccountMenu";

afterEach(cleanup);

describe("AccountMenu", () => {
  it("shows the sound effects toggle below the account avatar", () => {
    render(
      <MemoryRouter>
        <RollLogProvider>
          <AccountMenu
            density="auto"
            user={user()}
            onLogout={vi.fn().mockResolvedValue(undefined)}
            onDensityChange={vi.fn()}
            onLoadAccount={vi.fn().mockResolvedValue(account())}
            onSetPassword={vi.fn().mockResolvedValue(account())}
          />
        </RollLogProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    const soundEffects = screen.getByRole("checkbox", { name: "Sound effects" });
    expect((soundEffects as HTMLInputElement).checked).toBe(true);
    fireEvent.click(soundEffects);
    expect((soundEffects as HTMLInputElement).checked).toBe(false);
  });
});

function user(): User {
  return { id: "user", email: "dm@example.com", avatarUrl: "", createdAt: "" };
}

function account(): AccountInfo {
  return {
    email: "dm@example.com",
    avatarUrl: "",
    hasPassword: false,
    identities: [],
    stats: {
      campaigns: 0,
      playerCharacters: 0,
      creatures: 0,
      spells: 0,
      actionTemplates: 0,
      encounters: 0,
    },
  };
}
