import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { StandardSource } from "../../types";
import { Checkbox, MutedPanel } from "../ui";
import { InfoHelpButton } from "./InfoHelpButton";

export const defaultStandardSources = ["srd-2014"];

export function StandardSourceChecklist({
  selected,
  onChange,
  compact = false,
}: {
  selected: string[];
  onChange: (sources: string[]) => void;
  compact?: boolean;
}) {
  const [sources, setSources] = useState<StandardSource[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .standardSources()
      .then((payload) => setSources(payload.sources))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load SRD sources"));
  }, []);

  function toggle(sourceKey: string, checked: boolean) {
    const next = checked
      ? [...selected, sourceKey]
      : selected.filter((current) => current !== sourceKey);
    onChange(next.length > 0 ? Array.from(new Set(next)) : defaultStandardSources);
  }

  if (error) return <MutedPanel>{error}</MutedPanel>;
  if (sources.length === 0) return <MutedPanel>Loading SRD sources...</MutedPanel>;

  return (
    <section className={compact ? "grid gap-2" : "rounded-lg border bg-card p-4"}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Standard rules sources</h3>
          <p className="text-sm text-muted-foreground">
            Choose which SRD versions this campaign uses.
          </p>
        </div>
        <InfoHelpButton title="What is SRD?">
          <p>
            SRD means System Reference Document: open rules content that can be shared by tools like
            bluDM. It is read-only here so every table has a stable reference copy.
          </p>
          <p>
            Campaign filters let you keep 2014 and 2024 rules content separate, or opt into both
            while you compare them.
          </p>
        </InfoHelpButton>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((source) => (
          <div
            key={source.key}
            className="grid gap-2 rounded-lg border border-border bg-background p-3"
          >
            <Checkbox
              label={source.label}
              checked={selected.includes(source.key)}
              onChange={(checked) => toggle(source.key, checked)}
            />
            <span className="text-xs text-muted-foreground">
              {source.ruleset} · {source.licenseName}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
