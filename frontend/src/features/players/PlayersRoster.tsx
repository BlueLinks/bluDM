import {
  ArrowRightLeft,
  Castle,
  ChevronDown,
  Copy,
  Ellipsis,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PlayerCard } from "../../components/PlayerCard";
import { CardSection, ResponsiveGrid, SectionHeader } from "../../components/layout";
import { Button, EmptyMini } from "../../components/ui";
import type { Campaign, Player } from "../../types";

export type PlayerRosterDensity = "compact" | "comfy";

type CampaignPlayerGroup = {
  campaignId: string;
  campaignName: string;
  players: Player[];
};

export function PlayersRoster({
  campaigns,
  density,
  players,
  onClone,
  onDelete,
  onMove,
}: {
  campaigns: Campaign[];
  density: PlayerRosterDensity;
  players: Player[];
  onClone: (player: Player) => void;
  onDelete: (player: Player) => void;
  onMove: (player: Player) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [openMenuPlayerId, setOpenMenuPlayerId] = useState("");
  const campaignGroups = groupPlayersByCampaign(players, campaigns);
  const unassignedPlayers = players.filter((player) => !player.campaignId);

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div className="grid min-w-0 gap-4">
      {campaignGroups.map((group) => (
        <CampaignGroup
          key={group.campaignId}
          campaignId={group.campaignId}
          campaignName={group.campaignName}
          collapsed={collapsedGroups.has(group.campaignId)}
          density={density}
          openMenuPlayerId={openMenuPlayerId}
          players={group.players}
          onClone={onClone}
          onDelete={onDelete}
          onMenuChange={setOpenMenuPlayerId}
          onMove={onMove}
          onToggle={() => toggleGroup(group.campaignId)}
        />
      ))}
      <CampaignGroup
        campaignId=""
        campaignName="Unassigned"
        collapsed={collapsedGroups.has("unassigned")}
        density={density}
        openMenuPlayerId={openMenuPlayerId}
        players={unassignedPlayers}
        onClone={onClone}
        onDelete={onDelete}
        onMenuChange={setOpenMenuPlayerId}
        onMove={onMove}
        onToggle={() => toggleGroup("unassigned")}
      />
    </div>
  );
}

export function PlayerDensityToggle({
  density,
  onChange,
}: {
  density: PlayerRosterDensity;
  onChange: (density: PlayerRosterDensity) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <span className="text-xs font-bold text-muted-foreground">Card density</span>
      <div
        aria-label="Character card density"
        className="flex rounded-lg border border-border bg-surface p-1"
        role="group"
      >
        {(["compact", "comfy"] as const).map((option) => (
          <Button
            key={option}
            aria-pressed={density === option}
            size="sm"
            type="button"
            variant={density === option ? "primary" : "ghost"}
            onClick={() => onChange(option)}
          >
            {option === "compact" ? "Compact" : "Comfy"}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CampaignGroup({
  campaignId,
  campaignName,
  collapsed,
  density,
  openMenuPlayerId,
  players,
  onClone,
  onDelete,
  onMenuChange,
  onMove,
  onToggle,
}: CampaignPlayerGroup & {
  collapsed: boolean;
  density: PlayerRosterDensity;
  openMenuPlayerId: string;
  onClone: (player: Player) => void;
  onDelete: (player: Player) => void;
  onMenuChange: (playerId: string) => void;
  onMove: (player: Player) => void;
  onToggle: () => void;
}) {
  const isUnassigned = campaignId === "";
  return (
    <CardSection className="min-w-0" tone="background">
      <SectionHeader
        icon={isUnassigned ? FolderOpen : Castle}
        meta={characterCountLabel(players.length)}
        title={campaignName}
        action={
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {!isUnassigned ? (
              <Link className="hidden sm:block" to={`/campaigns/${campaignId}`}>
                <Button size="sm" type="button" variant="outline">
                  Open campaign
                </Button>
              </Link>
            ) : null}
            <Button
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${campaignName}`}
              className="px-2.5"
              size="sm"
              type="button"
              variant="ghost"
              onClick={onToggle}
            >
              <ChevronDown
                aria-hidden="true"
                className={["h-4 w-4 transition-transform", collapsed ? "-rotate-90" : ""].join(
                  " ",
                )}
              />
            </Button>
          </div>
        }
      />
      {!collapsed ? (
        players.length > 0 ? (
          <ResponsiveGrid className="mt-3" variant="cards3">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                actions={
                  <PlayerCardActions
                    menuOpen={openMenuPlayerId === player.id}
                    player={player}
                    onClone={() => {
                      onMenuChange("");
                      onClone(player);
                    }}
                    onDelete={() => {
                      onMenuChange("");
                      onDelete(player);
                    }}
                    onMenuChange={(open) => onMenuChange(open ? player.id : "")}
                    onMove={() => {
                      onMenuChange("");
                      onMove(player);
                    }}
                  />
                }
                density={density}
                player={player}
                showCampaign={false}
              />
            ))}
          </ResponsiveGrid>
        ) : (
          <div className="mt-3">
            <EmptyMini copy="No unassigned characters. Move a saved character here or create one without a campaign." />
          </div>
        )
      ) : null}
    </CardSection>
  );
}

function PlayerCardActions({
  menuOpen,
  player,
  onClone,
  onDelete,
  onMenuChange,
  onMove,
}: {
  menuOpen: boolean;
  player: Player;
  onClone: () => void;
  onDelete: () => void;
  onMenuChange: (open: boolean) => void;
  onMove: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link className="min-w-0 flex-1" to={`/players/${player.id}/edit`}>
        <Button className="w-full" icon={Pencil} type="button" variant="secondary">
          Edit character
        </Button>
      </Link>
      <div className="relative shrink-0">
        <Button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Character actions for ${player.characterName}`}
          className="px-2.5"
          type="button"
          variant="outline"
          onClick={() => onMenuChange(!menuOpen)}
        >
          <Ellipsis aria-hidden="true" className="h-4 w-4" />
        </Button>
        {menuOpen ? (
          <div
            aria-label={`Actions for ${player.characterName}`}
            className="absolute bottom-full right-0 z-20 mb-2 grid w-52 rounded-lg border border-border bg-card p-1 shadow-xl"
            role="menu"
          >
            <MenuButton icon={ArrowRightLeft} label="Move to campaign" onClick={onMove} />
            <MenuButton icon={Copy} label="Clone character" onClick={onClone} />
            <MenuButton danger icon={Trash2} label="Delete character" onClick={onDelete} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  danger = false,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        danger ? "text-destructive" : "text-foreground",
      ].join(" ")}
      role="menuitem"
      type="button"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

export function groupPlayersByCampaign(
  players: Player[],
  campaigns: Campaign[],
): CampaignPlayerGroup[] {
  const playersByCampaign = new Map<string, Player[]>();
  for (const player of players) {
    if (!player.campaignId) continue;
    const group = playersByCampaign.get(player.campaignId) ?? [];
    group.push(player);
    playersByCampaign.set(player.campaignId, group);
  }

  const knownCampaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const knownGroups = campaigns.flatMap((campaign) => {
    const campaignPlayers = playersByCampaign.get(campaign.id);
    return campaignPlayers
      ? [{ campaignId: campaign.id, campaignName: campaign.name, players: campaignPlayers }]
      : [];
  });
  const remainingGroups = Array.from(playersByCampaign.entries())
    .filter(([campaignId]) => !knownCampaignIds.has(campaignId))
    .map(([campaignId, campaignPlayers]) => ({
      campaignId,
      campaignName: campaignPlayers[0]?.campaignName || "Unavailable campaign",
      players: campaignPlayers,
    }))
    .sort((left, right) => left.campaignName.localeCompare(right.campaignName));
  return [...knownGroups, ...remainingGroups];
}

function characterCountLabel(count: number) {
  return `${count} ${count === 1 ? "character" : "characters"}`;
}
