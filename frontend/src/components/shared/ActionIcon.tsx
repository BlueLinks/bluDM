import { Swords } from "lucide-react";
import { actionIconPath } from "../../lib/domain/actionIcons";
import type { ActionIconSource } from "../../types";

export type ActionIconValue = {
  iconSource?: ActionIconSource;
  iconKey?: string;
  iconUrl?: string;
};

export function ActionIcon({ action, className }: { action: ActionIconValue; className?: string }) {
  const baseClass = [
    "grid h-10 w-10 shrink-0 place-items-center rounded-md border border-companion-metadata/25 bg-companion-metadata/10 text-companion-metadata",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  if (action.iconSource === "game-icons" && action.iconKey) {
    return (
      <span className={baseClass}>
        <img alt="" className="h-7 w-7 dark:invert" src={actionIconPath(action.iconKey)} />
      </span>
    );
  }
  if (action.iconSource === "url" && action.iconUrl) {
    return (
      <span className={baseClass}>
        <img alt="" className="h-8 w-8 rounded object-cover" src={action.iconUrl} />
      </span>
    );
  }
  return (
    <span className={baseClass}>
      <Swords className="h-5 w-5" />
    </span>
  );
}
