import { ContentSourceFilter } from "./ContentSourceFilter";

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
    <ContentSourceFilter
      showStandard={showStandard}
      showUser={showUser}
      onShowStandardChange={onShowStandardChange}
      onShowUserChange={onShowUserChange}
    />
  );
}
