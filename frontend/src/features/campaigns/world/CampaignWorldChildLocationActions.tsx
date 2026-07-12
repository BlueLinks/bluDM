import { Plus } from "lucide-react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";
import {
  defaultTypeForProfileAction,
  labelForProfileAction,
  type LocationProfileInfo,
} from "./locationProfiles";

export function ChildLocationActions({
  profile,
  onAddChild,
}: {
  profile: LocationProfileInfo;
  onAddChild: (locationType?: string) => void;
}) {
  const childActions = profile.primaryActions.filter((action) =>
    ["add-town", "add-landmark", "add-building", "add-shop", "add-floor", "add-room"].includes(
      action,
    ),
  );
  if (!childActions.length) return null;

  return (
    <ActionRow justify="end">
      {childActions.map((action) => (
        <Button
          key={action}
          type="button"
          icon={Plus}
          size="sm"
          variant="secondary"
          onClick={() => onAddChild(defaultTypeForProfileAction(action))}
        >
          {labelForProfileAction(action)}
        </Button>
      ))}
    </ActionRow>
  );
}
