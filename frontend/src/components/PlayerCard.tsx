import type { Player } from "../types";
import { Badge, CharacterVitals } from "./ui";
import { abilities } from "../lib/domain/options";
import { abilityModifier, modifierTone, signedModifier } from "../lib/domain/forms";

export function PlayerCard({ player, showCampaign = true }: { player: Player; showCampaign?: boolean }) {
  const sheet = player.characterSheet;
  const className = typeof sheet.className === "string" ? sheet.className : "";
  const level = typeof sheet.level === "number" ? sheet.level : undefined;
  const abilityScores = sheet.abilityScores && typeof sheet.abilityScores === "object" ? (sheet.abilityScores as Record<string, number>) : {};
  const avatarSrc = player.avatarAssetId ? `/api/assets/${player.avatarAssetId}` : player.avatarUrl;

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-md bg-muted text-sm font-bold text-muted-foreground">
          {avatarSrc ? <img className="h-full w-full object-cover" src={avatarSrc} alt="" /> : player.characterName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{player.characterName}</h3>
            {showCampaign && player.campaignName && <Badge>{player.campaignName}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[player.playerName, className && `${className}${level ? ` ${level}` : ""}`].filter(Boolean).join(" · ") || "Player character"}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <CharacterVitals
          armorClass={player.armorClass}
          currentHitPoints={player.currentHitPoints}
          maxHitPoints={player.maxHitPoints}
          temporaryHitPoints={player.temporaryHitPoints}
        />
      </div>
      {Object.keys(abilityScores).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {abilities.map((ability) => (
            <Badge key={ability.key}>
              {ability.label} {abilityScores[ability.key] ?? 10} <span className={["ml-1 font-bold", modifierTone(abilityModifier(abilityScores[ability.key] ?? 10))].join(" ")}>({signedModifier(abilityScores[ability.key] ?? 10)})</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
