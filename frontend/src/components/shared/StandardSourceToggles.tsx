import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { standardSourceDisplayName } from "../../lib/domain/standardSources";
import type { StandardSource } from "../../types";
import { MutedPanel } from "../ui";
import { sourceToneClass } from "./sourceTones";

export function StandardSourceToggles({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (sources: string[]) => void;
}) {
  const [sources, setSources] = useState<StandardSource[]>([]);

  useEffect(() => {
    void api.standardSources().then((payload) => setSources(payload.sources));
  }, []);

  if (sources.length === 0) return <MutedPanel>Loading source filters...</MutedPanel>;

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => {
        const checked = selected.includes(source.key);
        return (
          <button
            key={source.key}
            type="button"
            aria-pressed={checked}
            className={[
              "rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              checked
                ? sourceToneClass("official")
                : "border-border bg-surface text-surface-foreground hover:border-primary/40 hover:bg-card hover:text-foreground",
            ].join(" ")}
            onClick={() => {
              const next = checked
                ? selected.filter((key) => key !== source.key)
                : [...selected, source.key];
              onChange(next.length > 0 ? Array.from(new Set(next)) : selected);
            }}
          >
            {standardSourceDisplayName(source)}
          </button>
        );
      })}
    </div>
  );
}
