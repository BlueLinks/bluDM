import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RollLogProvider, useRollLog, useSoundEffects } from "./RollLogProvider";

describe("RollLogProvider sound effects", () => {
  const audio = vi.fn().mockImplementation(() => ({
    play: vi.fn().mockResolvedValue(undefined),
    volume: 1,
  }));
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("Audio", audio);
  });

  afterEach(() => {
    cleanup();
    audio.mockClear();
    vi.unstubAllGlobals();
  });

  it("plays the matching sound for dice and critical rolls", () => {
    render(
      <RollLogProvider>
        <RollHarness />
      </RollLogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Roll dice" }));
    expect(audio).toHaveBeenLastCalledWith("/sounds/dice_roll.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Roll critical" }));
    expect(audio).toHaveBeenLastCalledWith("/sounds/crit.mp3");
  });

  it("persists the sound effects toggle and suppresses playback when disabled", () => {
    render(
      <RollLogProvider>
        <RollHarness />
      </RollLogProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Sound effects" }));
    fireEvent.click(screen.getByRole("button", { name: "Roll dice" }));

    expect(storage.get("bludm-sound-effects")).toBe("off");
    expect(audio).not.toHaveBeenCalled();
  });
});

function RollHarness() {
  const { addRollLogEntry } = useRollLog();
  const { soundEffectsEnabled, setSoundEffectsEnabled } = useSoundEffects();
  const addRoll = (soundEffect: "dice" | "critical") =>
    addRollLogEntry({
      title: "Test roll",
      notation: "1d20",
      detail: "20",
      total: 20,
      soundEffect,
    });

  return (
    <>
      <label>
        Sound effects
        <input
          checked={soundEffectsEnabled}
          type="checkbox"
          onChange={(event) => setSoundEffectsEnabled(event.target.checked)}
        />
      </label>
      <button type="button" onClick={() => addRoll("dice")}>
        Roll dice
      </button>
      <button type="button" onClick={() => addRoll("critical")}>
        Roll critical
      </button>
    </>
  );
}
