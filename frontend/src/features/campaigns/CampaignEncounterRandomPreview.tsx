import { RefreshCw } from "lucide-react";
import { Children, type ReactNode } from "react";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { Button, Callout } from "../../components/ui";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import { encounterRuleset2014, type EncounterRuleset } from "../../lib/domain/encounterRulesets";
import type { EncounterCombatant, Player } from "../../types";
import { CombatantCard } from "../encounters/EncounterCombatantCard";
import { CreatureCombatantCard, PlayerCombatantCard } from "../encounters/EncounterCombatantCard";
import { EncounterDifficultyPanel } from "../encounters/EncounterDifficultyPanel";
import type {
  EncounterBuilderCreatureDraft,
  EncounterBuilderMode,
} from "./encounterBuilderGenerator";

export function EncounterPreviewPanel({
  allies,
  difficultyRuleset = encounterRuleset2014,
  enemies,
  mode,
  players,
  targetNotice,
  onRegenerate,
}: {
  allies: EncounterBuilderCreatureDraft[];
  difficultyRuleset?: EncounterRuleset;
  enemies: EncounterBuilderCreatureDraft[];
  mode: EncounterBuilderMode;
  players: Player[];
  targetNotice?: string;
  onRegenerate?: () => void;
}) {
  const difficulty = calculateEncounterDifficulty(
    players,
    previewCombatants(enemies),
    difficultyRuleset,
  );
  const enemyXp = enemies.reduce((total, enemy) => total + enemy.creature.xp * enemy.quantity, 0);
  return (
    <aside className="grid content-start gap-3 lg:-my-4 lg:border-l lg:border-border lg:pb-4 lg:pl-6 lg:pr-0.5 lg:pt-[1.375rem]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Encounter preview</h3>
          <p className="text-sm text-muted-foreground">{enemyXp.toLocaleString()} enemy XP</p>
        </div>
        {mode === "random" && onRegenerate ? (
          <Button type="button" icon={RefreshCw} size="sm" variant="outline" onClick={onRegenerate}>
            Regenerate
          </Button>
        ) : null}
      </div>
      {players.length ? (
        <EncounterDifficultyPanel compact difficulty={difficulty} />
      ) : (
        <p className="text-sm text-muted-foreground">Add party members to estimate difficulty.</p>
      )}
      {targetNotice ? <Callout tone="warning">{targetNotice}</Callout> : null}
      <PreviewGroup title={`Party members (${players.length})`}>
        {players.map((player) => (
          <PlayerCombatantCard compact key={player.id} player={player} />
        ))}
      </PreviewGroup>
      <PreviewGroup title={`Allies (${allies.length})`}>
        {allies.map((ally) => (
          <CreatureCombatantCard
            compact
            creature={ally.creature}
            key={ally.id}
            quantity={ally.quantity > 1 ? `Qty ${ally.quantity}` : undefined}
            showChallengeRating={false}
            tone="friendly"
          />
        ))}
      </PreviewGroup>
      <PreviewGroup
        title={`Enemies (${enemies.reduce((total, enemy) => total + enemy.quantity, 0)})`}
      >
        {enemies.map((enemy) => (
          <CombatantCard
            avatarSrc={avatarImageSrc(enemy.creature.imageAssetId, enemy.creature.avatarUrl)}
            compact
            fallback={enemy.creature.name.slice(0, 2).toUpperCase()}
            key={enemy.id}
            meta={`CR ${enemy.creature.challengeRating || "0"}`}
            name={enemy.creature.name}
            quantity={`Qty ${enemy.quantity}`}
            stats={[]}
            tone="enemy"
          />
        ))}
      </PreviewGroup>
    </aside>
  );
}

function PreviewGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="grid gap-2 border-t border-border pt-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      {Children.count(children) ? (
        children
      ) : (
        <p className="text-sm text-muted-foreground">None selected.</p>
      )}
    </section>
  );
}

function previewCombatants(enemies: EncounterBuilderCreatureDraft[]): EncounterCombatant[] {
  return enemies.flatMap((enemy) =>
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
