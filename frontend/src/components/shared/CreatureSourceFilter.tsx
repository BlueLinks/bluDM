import { Checkbox } from "../ui";

export function CreatureSourceFilter({
  showStandard,
  showUser,
  onShowStandardChange,
  onShowUserChange,
}: {
  showStandard: boolean;
  showUser: boolean;
  onShowStandardChange: (show: boolean) => void;
  onShowUserChange: (show: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-md border border-border bg-muted/30 p-3">
      <Checkbox label="My library" checked={showUser} onChange={onShowUserChange} />
      <Checkbox label="Standard content" checked={showStandard} onChange={onShowStandardChange} />
    </div>
  );
}
