import type React from "react";
import type { Player } from "../types";
import {
  AbilityScoreCard,
  CharacterMetadataChip,
  InitialsAvatar,
} from "./shared/displayPrimitives";
import { CharacterVitals } from "./ui";
import { abilities } from "../lib/domain/options";
import { signedModifier } from "../lib/domain/forms";

export function PlayerCard({
  player,
  actions,
  density = "comfy",
  showCampaign = true,
}: {
  player: Player;
  actions?: React.ReactNode;
  density?: "compact" | "comfy";
  showCampaign?: boolean;
}) {
  const sheet = player.characterSheet;
  const className = typeof sheet.className === "string" ? sheet.className : "";
  const level = typeof sheet.level === "number" ? sheet.level : undefined;
  const abilityScores =
    sheet.abilityScores && typeof sheet.abilityScores === "object"
      ? (sheet.abilityScores as Record<string, number>)
      : {};
  const avatarSrc = player.avatarAssetId ? `/api/assets/${player.avatarAssetId}` : player.avatarUrl;

  return (
    <article
      className={[
        "grid h-full min-w-0 content-start rounded-lg border border-border bg-background",
        density === "compact" ? "gap-2 p-3" : "gap-3 p-4",
      ].join(" ")}
    >
      <div className={density === "compact" ? "flex items-start gap-2" : "flex items-start gap-3"}>
        <InitialsAvatar
          name={player.characterName}
          size={density === "compact" ? "sm" : "md"}
          src={avatarSrc}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{player.characterName}</h3>
            {showCampaign && player.campaignName && (
              <CharacterMetadataChip tone="shared">{player.campaignName}</CharacterMetadataChip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {[player.playerName, className && `${className}${level ? ` ${level}` : ""}`]
              .filter(Boolean)
              .join(" · ") || "Player character"}
          </p>
        </div>
      </div>
      <div>
        <CharacterVitals
          armorClass={player.armorClass}
          currentHitPoints={player.currentHitPoints}
          maxHitPoints={player.maxHitPoints}
        />
      </div>
      {density === "comfy" && Object.keys(abilityScores).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {abilities.map((ability) => (
            <AbilityScoreCard
              key={ability.key}
              label={ability.label}
              score={abilityScores[ability.key] ?? 10}
              modifier={`(${signedModifier(abilityScores[ability.key] ?? 10)})`}
            />
          ))}
        </div>
      )}
      {actions ? <div className="mt-auto pt-0.5">{actions}</div> : null}
    </article>
  );
}
