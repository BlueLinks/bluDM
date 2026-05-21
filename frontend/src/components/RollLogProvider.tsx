import React, { createContext, useContext, useMemo, useState } from "react";
import { createId } from "../lib/domain/ids";

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
};

type RollLogContextValue = {
  latest: RollLogEntry | null;
  log: RollLogEntry[];
  addRollLogEntry: (entry: Omit<RollLogEntry, "id" | "createdAt">) => RollLogEntry;
};

const RollLogContext = createContext<RollLogContextValue | null>(null);

export function RollLogProvider({ children }: { children: React.ReactNode }) {
  const [log, setLog] = useState<RollLogEntry[]>([]);
  const [latest, setLatest] = useState<RollLogEntry | null>(null);

  const value = useMemo<RollLogContextValue>(
    () => ({
      latest,
      log,
      addRollLogEntry: (entry) => {
        const next = { ...entry, id: createId("roll"), createdAt: new Date() };
        setLog((current) => [next, ...current].slice(0, 40));
        setLatest(next);
        return next;
      },
    }),
    [latest, log],
  );

  return <RollLogContext.Provider value={value}>{children}</RollLogContext.Provider>;
}

export function useRollLog() {
  const context = useContext(RollLogContext);
  if (!context) {
    throw new Error("useRollLog must be used inside RollLogProvider");
  }
  return context;
}
