import { Button, EmptyMini } from "../../../components/ui";

export function CampaignWorldSearchEmptyState({
  hasActiveFilters,
  searchQuery,
  onClear,
  onCreate,
}: {
  hasActiveFilters: boolean;
  searchQuery: string;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-4">
      <EmptyMini
        copy={
          searchQuery
            ? `No locations match "${searchQuery}" and the current filters.`
            : "No locations match the current search and filters."
        }
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onCreate}>
          Create location
        </Button>
        {hasActiveFilters ? (
          <Button type="button" size="sm" variant="secondary" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
