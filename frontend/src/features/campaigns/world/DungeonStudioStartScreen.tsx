import { useEffect, useState } from "react";
import { ActionRow, CardSection, ResponsiveGrid, SectionHeader } from "../../../components/layout";
import { Button, Callout, Field, Input, MutedPanel } from "../../../components/ui";
import { Select } from "../../../components/uiSelect";
import { api } from "../../../lib/api";
import { DungeonStudioMapThumbnail } from "./DungeonStudioMapThumbnail";
import { createDungeonStudioDocument, type DungeonStudioDocument } from "./dungeonStudioDocument";
import {
  defaultDungeonStudioGeneratorSettings,
  type DungeonStudioGeneratorSettings,
} from "./dungeonStudioGenerator";
import { dungeonStudioThemeOptions } from "./dungeonStudioThemes";

export function DungeonStudioStartScreen({
  campaignId,
  locationName,
  onAcceptGenerated,
  onStartCustom,
}: {
  campaignId: string;
  locationName: string;
  onAcceptGenerated: (document: DungeonStudioDocument) => void;
  onStartCustom: () => void;
}) {
  const [mode, setMode] = useState<"choice" | "random">("choice");
  const [settings, setSettings] = useState(defaultDungeonStudioGeneratorSettings);
  const [preview, setPreview] = useState<DungeonStudioDocument>(() =>
    createDungeonStudioDocument(),
  );
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "random") return;
    let cancelled = false;
    setLoadingPreview(true);
    setError("");
    api
      .previewGeneratedDungeon(campaignId, settings)
      .then(({ document }) => {
        if (!cancelled) setPreview(document);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not generate dungeon preview");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, mode, settings]);

  if (mode === "random") {
    return (
      <CardSection className="grid gap-4">
        <SectionHeader title="Generate a starter dungeon" meta={locationName} />
        <ResponsiveGrid variant="form2">
          <Field label="Style">
            <Select
              value={settings.type}
              placeholder="Style"
              options={[
                { label: "Classic rooms", value: "classic" },
                { label: "Cave", value: "cave" },
              ]}
              onValueChange={(type) =>
                update({ type: type as DungeonStudioGeneratorSettings["type"] })
              }
            />
          </Field>
          <Field label="Theme">
            <Select
              value={settings.tileset}
              placeholder="Theme"
              options={dungeonStudioThemeOptions}
              onValueChange={(tileset) =>
                update({ tileset: tileset as DungeonStudioGeneratorSettings["tileset"] })
              }
            />
          </Field>
          <Field label="Seed">
            <Input
              value={settings.seed}
              onChange={(event) => update({ seed: event.target.value })}
            />
          </Field>
          <Field label="Rooms / density">
            <Input
              type="number"
              min="1"
              max="30"
              value={settings.type === "cave" ? settings.density : settings.roomCount}
              onChange={(event) =>
                settings.type === "cave"
                  ? update({ density: Number(event.target.value) || 45 })
                  : update({ roomCount: Number(event.target.value) || 8 })
              }
            />
          </Field>
          <Field label="Width">
            <Input
              type="number"
              min="12"
              max="80"
              value={settings.width}
              onChange={(event) => update({ width: Number(event.target.value) || 40 })}
            />
          </Field>
          <Field label="Height">
            <Input
              type="number"
              min="12"
              max="80"
              value={settings.height}
              onChange={(event) => update({ height: Number(event.target.value) || 30 })}
            />
          </Field>
        </ResponsiveGrid>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loadingPreview ? (
          <MutedPanel>Generating dungeon preview…</MutedPanel>
        ) : (
          <div className="min-h-72">
            <DungeonStudioMapThumbnail document={preview} label="Generated dungeon preview" />
          </div>
        )}
        <ActionRow justify="end">
          <Button type="button" variant="secondary" onClick={() => setMode("choice")}>
            Back
          </Button>
          <Button type="button" variant="secondary" onClick={() => update({ seed: randomSeed() })}>
            Regenerate seed
          </Button>
          <Button
            type="button"
            disabled={loadingPreview || Boolean(error)}
            onClick={() => onAcceptGenerated(preview)}
          >
            Accept and edit
          </Button>
        </ActionRow>
      </CardSection>
    );
  }
  return (
    <CardSection className="grid gap-4">
      <SectionHeader title="Start this dungeon" meta={locationName} />
      <ResponsiveGrid variant="equal2">
        <button
          className="rounded-lg border border-border bg-background px-4 py-4 text-left transition hover:border-primary/60"
          type="button"
          onClick={onStartCustom}
        >
          <div className="font-semibold text-foreground">Fully custom dungeon</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the editor with a blank grid and draw the layout by hand.
          </p>
        </button>
        <button
          className="rounded-lg border border-border bg-background px-4 py-4 text-left transition hover:border-primary/60"
          type="button"
          onClick={() => setMode("random")}
        >
          <div className="font-semibold text-foreground">Randomly generated dungeon</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a seed, style, size, and theme, preview the result, then edit it normally.
          </p>
        </button>
      </ResponsiveGrid>
    </CardSection>
  );

  function update(next: Partial<DungeonStudioGeneratorSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}
