import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FlaskConical,
  MoreHorizontal,
  Pencil,
  Play,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyText } from "../../components/shared/categoryText";
import { Button, EmptyMini, Input, Select } from "../../components/ui";
import type { Encounter } from "../../types";

type EncounterListProps = {
  campaignId: string;
  encounters: Encounter[];
  extendedActions?: boolean;
  pageSize?: number;
  onClone?: (encounter: Encounter) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
};

export function EncounterList({
  campaignId,
  encounters,
  extendedActions = false,
  pageSize = 5,
  onClone,
  onRemove,
  onStart,
}: EncounterListProps) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [enemyCount, setEnemyCount] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      encounters.filter((encounter) => {
        const matchesQuery = `${encounter.name} ${encounter.description} ${encounter.location}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesDifficulty = difficultyMatches(encounter.difficulty || "Unrated", difficulty);
        const matchesEnemies = enemyCountMatches(encounter.enemyCount, enemyCount);
        return matchesQuery && matchesDifficulty && matchesEnemies;
      }),
    [difficulty, encounters, enemyCount, query],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  useEffect(() => setPage(0), [difficulty, enemyCount, query]);
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);

  return (
    <div className="grid gap-3">
      <EncounterFilters
        compact={!extendedActions}
        difficulty={difficulty}
        enemyCount={enemyCount}
        query={query}
        onDifficultyChange={setDifficulty}
        onEnemyCountChange={setEnemyCount}
        onQueryChange={setQuery}
      />
      {visible.length ? (
        <div className="divide-y divide-border overflow-visible rounded-lg border border-border bg-background">
          {visible.map((encounter) => (
            <EncounterRow
              campaignId={campaignId}
              encounter={encounter}
              extendedActions={extendedActions}
              key={encounter.id}
              onClone={onClone}
              onRemove={onRemove}
              onStart={onStart}
            />
          ))}
        </div>
      ) : (
        <EmptyMini
          copy={encounters.length ? "No encounters match these filters." : "No encounters yet."}
        />
      )}
      <ListPagination
        count={filtered.length}
        page={safePage}
        pageCount={pageCount}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

function EncounterFilters({
  compact,
  difficulty,
  enemyCount,
  query,
  onDifficultyChange,
  onEnemyCountChange,
  onQueryChange,
}: {
  compact: boolean;
  difficulty: string;
  enemyCount: string;
  query: string;
  onDifficultyChange: (value: string) => void;
  onEnemyCountChange: (value: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div
      className={[
        "grid gap-2 rounded-lg border border-border bg-surface p-2",
        compact ? "sm:grid-cols-2" : "md:grid-cols-3",
      ].join(" ")}
    >
      <label className={["relative min-w-0", compact ? "sm:col-span-2" : ""].join(" ")}>
        <span className="sr-only">Search encounters</span>
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search encounters"
          className="bg-card pl-9"
          placeholder="Search encounters"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <Select
        ariaLabel="Filter by difficulty"
        placeholder="All difficulties"
        value={difficulty}
        options={difficultyOptions}
        onValueChange={onDifficultyChange}
      />
      <Select
        ariaLabel="Filter by enemy count"
        placeholder="Any enemy count"
        value={enemyCount}
        options={enemyCountOptions}
        onValueChange={onEnemyCountChange}
      />
    </div>
  );
}

function EncounterRow({
  campaignId,
  encounter,
  extendedActions,
  onClone,
  onRemove,
  onStart,
}: {
  campaignId: string;
  encounter: Encounter;
  extendedActions: boolean;
  onClone?: (encounter: Encounter) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  const locationDetails = [
    encounter.location || "No location",
    encounter.roomNumber && encounter.roomNumber !== encounter.location
      ? `Room ${encounter.roomNumber}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className="flex min-w-0 flex-wrap items-center gap-3 px-3 py-3">
      <div className="min-w-48 flex-1">
        <h4 className="font-semibold leading-tight">{encounter.name}</h4>
        <p className="mt-1 truncate text-xs text-muted-foreground">{locationDetails}</p>
        {extendedActions && encounter.description ? (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{encounter.description}</p>
        ) : null}
      </div>
      <div className="flex min-w-36 items-center justify-end gap-4 text-sm">
        <span className="whitespace-nowrap text-muted-foreground">
          {encounter.enemyCount} {encounter.enemyCount === 1 ? "enemy" : "enemies"}
        </span>
        <DifficultyText>{encounter.difficulty || "Unrated"}</DifficultyText>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button type="button" icon={Play} size="sm" onClick={() => onStart(encounter, false)}>
          Run
        </Button>
        <EncounterActionMenu
          campaignId={campaignId}
          encounter={encounter}
          extended={extendedActions}
          onClone={onClone}
          onRemove={onRemove}
          onStart={onStart}
        />
      </div>
    </article>
  );
}

function EncounterActionMenu({
  campaignId,
  encounter,
  extended,
  onClone,
  onRemove,
  onStart,
}: {
  campaignId: string;
  encounter: Encounter;
  extended: boolean;
  onClone?: (encounter: Encounter) => void;
  onRemove: (encounter: Encounter) => void;
  onStart: (encounter: Encounter, test: boolean) => void;
}) {
  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";
  return (
    <details className="relative">
      <summary
        aria-label={`Actions for ${encounter.name}`}
        className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md border border-border bg-surface text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 grid w-44 rounded-lg border border-border bg-card p-1 shadow-xl">
        <Link className={itemClass} to={`/campaigns/${campaignId}/encounters/${encounter.id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
        {extended ? (
          <>
            <button className={itemClass} type="button" onClick={() => onStart(encounter, true)}>
              <FlaskConical className="h-4 w-4" />
              Test run
            </button>
            {onClone ? (
              <button className={itemClass} type="button" onClick={() => onClone(encounter)}>
                <Copy className="h-4 w-4" />
                Clone
              </button>
            ) : null}
          </>
        ) : null}
        <button
          className={[itemClass, "text-destructive"].join(" ")}
          type="button"
          onClick={() => onRemove(encounter)}
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    </details>
  );
}

export function ListPagination({
  count,
  itemLabel = "encounters",
  page,
  pageCount,
  pageSize,
  onPageChange,
}: {
  count: number;
  itemLabel?: string;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = count ? page * pageSize + 1 : 0;
  const end = Math.min(count, (page + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{count ? `${start}–${end} of ${count}` : `0 ${itemLabel}`}</span>
      <div className="flex gap-1">
        <Button
          aria-label="Previous page"
          disabled={page === 0}
          icon={ChevronLeft}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
        />
        <Button
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          icon={ChevronRight}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

const difficultyOptions = [
  { label: "All difficulties", value: "" },
  { label: "Unrated", value: "Unrated" },
  { label: "Trivial", value: "Trivial" },
  { label: "Easy / Low", value: "easy-low" },
  { label: "Medium / Moderate", value: "medium-moderate" },
  { label: "Hard / High", value: "hard-high" },
  { label: "Deadly", value: "Deadly" },
  { label: "Over difficulty", value: "over" },
];

const enemyCountOptions = [
  { label: "Any enemy count", value: "" },
  { label: "One enemy", value: "one" },
  { label: "2–3 enemies", value: "few" },
  { label: "4+ enemies", value: "many" },
];

function enemyCountMatches(count: number, filter: string) {
  if (!filter) return true;
  if (filter === "one") return count === 1;
  if (filter === "few") return count >= 2 && count <= 3;
  return count >= 4;
}

function difficultyMatches(label: string, filter: string) {
  if (!filter) return true;
  const normalized = label.toLowerCase();
  if (filter === "easy-low") return normalized === "easy" || normalized === "low";
  if (filter === "medium-moderate") return normalized === "medium" || normalized === "moderate";
  if (filter === "hard-high") return normalized === "hard" || normalized === "high";
  if (filter === "over") return normalized === "over deadly" || normalized === "over high";
  return normalized === filter.toLowerCase();
}
