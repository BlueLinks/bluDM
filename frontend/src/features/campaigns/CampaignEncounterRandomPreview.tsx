import { RefreshCw } from "lucide-react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { Button, Callout } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type { EncounterCombatant, Player } from "../../types";
import { CreatureCombatantCard, creatureRole } from "../encounters/EncounterCombatantCard";
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
    <aside className="grid gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Encounter preview</h3>
          <p className="text-sm text-muted-foreground">{preview.estimatedXp} enemy XP generated</p>
        </div>
        <Button type="button" icon={RefreshCw} size="sm" variant="secondary" onClick={onRegenerate}>
          Regenerate
        </Button>
      </div>
      <EncounterDifficultyPanel compact difficulty={difficulty} />
      {preview.targetNotice ? <Callout tone="warning">{preview.targetNotice}</Callout> : null}
      <div>
        <h4 className="font-semibold">{preview.title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{preview.summary}</p>
      </div>
      <PreviewParty allyCount={allyCount} players={players} />
      <div className="grid gap-2 text-sm">
        {preview.enemies.map((enemy) => (
          <CreatureCombatantCard
            key={enemy.id}
            creature={enemy.creature}
            quantity={`Qty ${enemy.quantity}`}
            role={creatureRole(enemy.creature)}
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
    <section className="grid gap-2 rounded-md border border-border bg-background p-2.5">
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
