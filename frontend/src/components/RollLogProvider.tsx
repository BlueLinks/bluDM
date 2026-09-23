import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createId } from "../lib/domain/ids";

export type RollSoundEffect = "dice" | "critical" | "none";

export type RollLogEntry = {
  id: string;
  title: string;
  notation: string;
  detail: string;
  total: number;
  createdAt: Date;
  actor?: string;
  target?: string;
  rollType?: string;
  soundEffect?: RollSoundEffect;
};

type RollLogContextValue = {
  latest: RollLogEntry | null;
  log: RollLogEntry[];
  addRollLogEntry: (entry: Omit<RollLogEntry, "id" | "createdAt">) => RollLogEntry;
};

const RollLogContext = createContext<RollLogContextValue | null>(null);
const SoundEffectsContext = createContext<SoundEffectsContextValue | null>(null);

type SoundEffectsContextValue = {
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;
};

const SOUND_EFFECTS_STORAGE_KEY = "bludm-sound-effects";
const soundEffectUrls: Record<Exclude<RollSoundEffect, "none">, string> = {
  dice: "/sounds/dice_roll.mp3",
  critical: "/sounds/crit.mp3",
};

export function RollLogProvider({ children }: { children: React.ReactNode }) {
  const [log, setLog] = useState<RollLogEntry[]>([]);
  const [latest, setLatest] = useState<RollLogEntry | null>(null);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() =>
    readSoundEffectsPreference(),
  );

  useEffect(() => {
    writeSoundEffectsPreference(soundEffectsEnabled);
  }, [soundEffectsEnabled]);

  const playSoundEffect = useCallback(
    (effect: RollSoundEffect | undefined) => {
      if (!soundEffectsEnabled || !effect || effect === "none") return;
      try {
        const audio = new Audio(soundEffectUrls[effect]);
        audio.volume = 0.75;
        void audio.play().catch(() => undefined);
      } catch {
        // Audio playback can be unavailable in a browser test or blocked by browser policy.
      }
    },
    [soundEffectsEnabled],
  );

  const value = useMemo<RollLogContextValue>(
    () => ({
      latest,
      log,
      addRollLogEntry: (entry) => {
        const next = { ...entry, id: createId("roll"), createdAt: new Date() };
        playSoundEffect(entry.soundEffect);
        setLog((current) => [next, ...current].slice(0, 40));
        setLatest(next);
        return next;
      },
    }),
    [latest, log, playSoundEffect],
  );

  const soundEffects = useMemo(
    () => ({ soundEffectsEnabled, setSoundEffectsEnabled }),
    [soundEffectsEnabled],
  );

  return (
    <SoundEffectsContext.Provider value={soundEffects}>
      <RollLogContext.Provider value={value}>{children}</RollLogContext.Provider>
    </SoundEffectsContext.Provider>
  );
}

export function useRollLog() {
  const context = useContext(RollLogContext);
  if (!context) {
    throw new Error("useRollLog must be used inside RollLogProvider");
  }
  return context;
}

export function useSoundEffects() {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    throw new Error("useSoundEffects must be used inside RollLogProvider");
  }
  return context;
}

function readSoundEffectsPreference() {
  try {
    return typeof localStorage?.getItem === "function"
      ? localStorage.getItem(SOUND_EFFECTS_STORAGE_KEY) !== "off"
      : true;
  } catch {
    return true;
  }
}

function writeSoundEffectsPreference(enabled: boolean) {
  try {
    if (typeof localStorage?.setItem === "function") {
      localStorage.setItem(SOUND_EFFECTS_STORAGE_KEY, enabled ? "on" : "off");
    }
  } catch {
    // Preferences are best effort when storage is unavailable.
  }
}
