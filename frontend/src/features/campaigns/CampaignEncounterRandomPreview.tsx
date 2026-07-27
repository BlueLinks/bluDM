import { RefreshCw } from "lucide-react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { Button, Callout } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type { EncounterCombatant, Player } from "../../types";
import { CombatantCard } from "../encounters/EncounterCombatantCard";
import { EncounterDifficultyPanel } from "../encounters/EncounterDifficultyPanel";
import type { EncounterBuilderPreview } from "./encounterBuilderGenerator";

export function RandomPreviewPanel({
  allyCount,
  players,
  preview,
  onRegenerate,
}: {
  allyCount: number;
  players: Player[];
  preview: EncounterBuilderPreview;
  onRegenerate: () => void;
}) {
  const difficulty = calculateEncounterDifficulty(players, previewCombatants(preview));
  return (
    <aside className="grid content-start gap-3 lg:-my-4 lg:border-l lg:border-border lg:pb-4 lg:pl-6 lg:pr-0.5 lg:pt-[1.375rem]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Encounter preview</h3>
          <p className="text-sm text-muted-foreground">{preview.estimatedXp} enemy XP generated</p>
        </div>
        <Button
          className="border-primary text-primary"
          type="button"
          icon={RefreshCw}
          size="sm"
          variant="outline"
          onClick={onRegenerate}
        >
          Regenerate
        </Button>
      </div>
      <div className="mt-2.5">
        <EncounterDifficultyPanel compact difficulty={difficulty} />
      </div>
      {preview.targetNotice ? <Callout tone="warning">{preview.targetNotice}</Callout> : null}
      <div className="mt-2.5">
        <h4 className="font-semibold">{preview.title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{preview.summary}</p>
      </div>
      <div className="mt-[1.0625rem]">
        <PreviewParty allyCount={allyCount} players={players} />
      </div>
      <div className="mt-0.5 grid gap-2 text-sm">
        {preview.enemies.map((enemy) => (
          <CombatantCard
            avatarSrc={avatarImageSrc(enemy.creature.imageAssetId, enemy.creature.avatarUrl)}
            compact
            fallback={enemy.creature.name.slice(0, 2).toUpperCase()}
            key={enemy.id}
            meta={`${[enemy.creature.size, enemy.creature.creatureType || "Creature"]
              .filter(Boolean)
              .join(" · ")} · CR ${enemy.creature.challengeRating || "0"}`}
            name={enemy.creature.name}
            quantity={`Qty ${enemy.quantity}`}
            stats={[]}
            tone="enemy"
          />
        ))}
      </div>
    </aside>
  );
}

function PreviewParty({ allyCount, players }: { allyCount: number; players: Player[] }) {
  const averageLevel = players.length
    ? Math.round(
        players.reduce((total, player) => {
          const level =
            typeof player.characterSheet.level === "number" ? player.characterSheet.level : 1;
          return total + level;
        }, 0) / players.length,
      )
    : 0;
  return (
    <section className="grid gap-4 rounded-md border border-border bg-background px-3.5 pb-[0.8125rem] pt-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Party</div>
      {players.length ? (
        <p className="text-sm">
          {players.length} player{players.length === 1 ? "" : "s"} · {allyCount} all
          {allyCount === 1 ? "y" : "ies"} · average level {averageLevel}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No party selected yet.</p>
      )}
    </section>
  );
}

function previewCombatants(preview: EncounterBuilderPreview): EncounterCombatant[] {
  return preview.enemies.flatMap((enemy) =>
    Array.from({ length: enemy.quantity }, (_, index) => ({
      id: `${enemy.id}-${index}`,
      encounterId: "preview",
      sourceType: "creature" as const,
      creatureId: enemy.creature.id,
      side: "enemy" as const,
      displayName: enemy.creature.name,
      colorLabel: "",
      avatarUrl: avatarImageSrc(enemy.creature.imageAssetId, enemy.creature.avatarUrl),
      armorClass: enemy.creature.armorClass,
      maxHitPoints: enemy.creature.hitPoints,
      currentHitPoints: enemy.creature.hitPoints,
      rolledHp: false,
      sortOrder: index,
      snapshot: { creature: enemy.creature },
      createdAt: "",
      updatedAt: "",
    })),
  );
}
