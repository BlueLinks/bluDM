import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { StandardSource } from "../../types";
import { Checkbox, MutedPanel } from "../ui";

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
      {sources.map((source) => (
        <div key={source.key} className="rounded-full border border-border bg-card text-sm">
          <Checkbox
            label={source.label}
            checked={selected.includes(source.key)}
            onChange={(checked) => {
              const next = checked
                ? [...selected, source.key]
                : selected.filter((key) => key !== source.key);
              onChange(next.length > 0 ? Array.from(new Set(next)) : selected);
            }}
          />
        </div>
      ))}
    </div>
  );
}
