import {
  BookOpen,
  Copy,
  Eye,
  HeartPulse,
  Maximize2,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { ActionRow, ResizableSplitLayout } from "../../components/layout";
import { InitialsAvatar, StatChip } from "../../components/shared/displayPrimitives";
import { Button, EmptyMini, FloatingInput, Modal, Select } from "../../components/ui";
import type { Creature } from "../../types";
import { LoadedCreatureProfile } from "./CreatureProfile";

type LibraryScope = "all" | "mine" | "srd";
export function CreatureLibraryList({
  creatures,
  onRemove,
}: {
  creatures: Creature[];
  onRemove: (creature: Creature) => void;
}) {
  const [scope, setScope] = useState<LibraryScope>("mine");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [rating, setRating] = useState("all");
  const [edition, setEdition] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState<Creature | null>(null);
  const [limit, setLimit] = useState(60);
  const filtered = useMemo(
    () =>
      creatures
        .filter((creature) => {
          const standard = creature.librarySource === "standard";
          return (
            (scope === "all" || (scope === "srd" ? standard : !standard)) &&
            (type === "all" || creature.creatureType === type) &&
            (rating === "all" || creature.challengeRating === rating) &&
            (scope === "mine" ||
              edition === "all" ||
              !standard ||
              creature.sourceKey === edition) &&
            [creature.name, creature.creatureType, creature.size]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase())
          );
        })
        .sort((a, b) =>
          sort === "cr"
            ? crNumber(a.challengeRating) - crNumber(b.challengeRating) ||
              a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name),
        ),
    [creatures, scope, type, rating, edition, query, sort],
  );
  const active = filtered.find((creature) => creature.id === selected) ?? filtered[0];
  const customCount = creatures.filter((creature) => creature.librarySource !== "standard").length;
  function resetFilters() {
    setQuery("");
    setType("all");
    setRating("all");
    setEdition("all");
    setLimit(60);
  }
  return (
    <div className="grid min-w-0 gap-4">
      <CreatureLibraryToolbar
        creatures={creatures}
        customCount={customCount}
        scope={scope}
        query={query}
        type={type}
        rating={rating}
        edition={edition}
        sort={sort}
        setScope={(value) => {
          setScope(value);
          setLimit(60);
        }}
        setQuery={(value) => {
          setQuery(value);
          setLimit(60);
        }}
        setType={(value) => {
          setType(value);
          setLimit(60);
        }}
        setRating={(value) => {
          setRating(value);
          setLimit(60);
        }}
        setEdition={(value) => {
          setEdition(value);
          setLimit(60);
        }}
        setSort={setSort}
      />
      <CreatureLibraryWorkspace
        active={active}
        creatures={filtered.slice(0, limit)}
        customCount={customCount}
        hasFilters={Boolean(query || type !== "all" || rating !== "all" || edition !== "all")}
        remaining={filtered.length - limit}
        resultCount={filtered.length}
        scope={scope}
        onClear={resetFilters}
        onExpand={setExpanded}
        onLoadMore={() => setLimit((current) => current + 60)}
        onRemove={onRemove}
        onSelect={(creature) => {
          setSelected(creature.id);
          if (!window.matchMedia("(min-width: 1280px)").matches) setExpanded(creature);
        }}
      />
      <CreatureProfileModal
        creature={expanded}
        onClose={() => setExpanded(null)}
        onRemove={onRemove}
      />
    </div>
  );
}

type LibrarySetters = {
  setScope: (value: LibraryScope) => void;
  setQuery: (value: string) => void;
  setType: (value: string) => void;
  setRating: (value: string) => void;
  setEdition: (value: string) => void;
  setSort: (value: string) => void;
};

function CreatureLibraryToolbar({
  creatures,
  customCount,
  scope,
  query,
  type,
  rating,
  edition,
  sort,
  setScope,
  setQuery,
  setType,
  setRating,
  setEdition,
  setSort,
}: LibrarySetters & {
  creatures: Creature[];
  customCount: number;
  scope: LibraryScope;
  query: string;
  type: string;
  rating: string;
  edition: string;
  sort: string;
}) {
  const tabs = [
    ["all", "All creatures", creatures.length],
    ["mine", "My creations", customCount],
    ["srd", "SRD library", creatures.length - customCount],
  ] as const;
  const types = [
    ...new Set(creatures.map((creature) => creature.creatureType).filter(Boolean)),
  ].sort();
  const ratings = [
    ...new Set(creatures.map((creature) => creature.challengeRating).filter(Boolean)),
  ].sort((a, b) => crNumber(a) - crNumber(b));
  const editions = Array.from(
    new Map(
      creatures
        .filter((creature) => creature.readOnly)
        .map((creature) => [
          creature.sourceKey,
          { value: creature.sourceKey, label: creature.sourceLabel || creature.sourceKey },
        ]),
    ).values(),
  );
  return (
    <>
      <div className="flex flex-wrap gap-1 border-b border-border" aria-label="Creature source">
        {tabs.map(([value, label, count]) => (
          <button
            type="button"
            key={value}
            aria-pressed={scope === value}
            onClick={() => setScope(value)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${scope === value ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground"}`}
          >
            {label} <span className="ml-1 font-normal tabular-nums">{count}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 grow">
          <FloatingInput label="Search creatures" icon={Search} value={query} onChange={setQuery} />
        </div>
        <LibraryFilter label="Type" value={type} onChange={setType} values={types} />
        <LibraryFilter label="CR" value={rating} onChange={setRating} values={ratings} />
        {scope !== "mine" && (
          <label className="grid gap-1 text-xs text-muted-foreground">
            Edition
            <Select
              placeholder="Edition"
              value={edition}
              onValueChange={setEdition}
              options={[{ value: "all", label: "All editions" }, ...editions]}
            />
          </label>
        )}
        <label className="grid gap-1 text-xs text-muted-foreground">
          Sort
          <Select
            placeholder="Sort"
            value={sort}
            onValueChange={setSort}
            options={[
              { value: "name", label: "Name A–Z" },
              { value: "cr", label: "Challenge rating" },
            ]}
          />
        </label>
      </div>
    </>
  );
}

function CreatureLibraryWorkspace({
  active,
  creatures,
  customCount,
  hasFilters,
  remaining,
  resultCount,
  scope,
  onClear,
  onExpand,
  onLoadMore,
  onRemove,
  onSelect,
}: {
  active?: Creature;
  creatures: Creature[];
  customCount: number;
  hasFilters: boolean;
  remaining: number;
  resultCount: number;
  scope: LibraryScope;
  onClear: () => void;
  onExpand: (creature: Creature) => void;
  onLoadMore: () => void;
  onRemove: (creature: Creature) => void;
  onSelect: (creature: Creature) => void;
}) {
  return (
    <ResizableSplitLayout
      className="items-start"
      defaultPrimary={64}
      label="Resize creature list and preview"
      visibleFrom="xl"
      primary={
        <section
          className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
          aria-label="Creature results"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <span role="status">{resultCount} creatures</span>
            {hasFilters && (
              <button type="button" className="p-1 text-primary underline" onClick={onClear}>
                Clear filters
              </button>
            )}
          </div>
          {!resultCount && (
            <div className="p-6">
              <EmptyMini
                copy={
                  scope === "mine" && customCount === 0
                    ? "Your custom creatures will appear here. Create your first creature to get started."
                    : "No creatures match these filters."
                }
              />
            </div>
          )}
          {creatures.map((creature) => (
            <CreatureRow
              key={creature.id}
              creature={creature}
              active={active?.id === creature.id}
              onSelect={() => onSelect(creature)}
            />
          ))}
          {remaining > 0 && (
            <div className="p-3">
              <Button variant="outline" onClick={onLoadMore}>
                Load more ({remaining} remaining)
              </Button>
            </div>
          )}
        </section>
      }
      secondary={
        active ? (
          <aside
            aria-label="Selected creature"
            className="resizable-preview-panel hidden min-w-0 rounded-lg border border-border bg-card p-4 xl:sticky xl:top-4 xl:block"
          >
            <div className="resizable-preview-header mb-4 flex items-center justify-between border-b border-border bg-card pb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Creature preview
              </span>
              <Button size="sm" icon={Maximize2} variant="ghost" onClick={() => onExpand(active)}>
                Full view
              </Button>
            </div>
            <LoadedCreatureProfile creature={active} />
            <CreatureProfileActions creature={active} onRemove={onRemove} />
          </aside>
        ) : undefined
      }
    />
  );
}

function CreatureProfileModal({
  creature,
  onClose,
  onRemove,
}: {
  creature: Creature | null;
  onClose: () => void;
  onRemove: (creature: Creature) => void;
}) {
  return (
    <Modal
      title="Creature details"
      open={Boolean(creature)}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-4xl"
    >
      {creature && (
        <>
          <LoadedCreatureProfile creature={creature} />
          <CreatureProfileActions
            creature={creature}
            onRemove={(item) => {
              onClose();
              onRemove(item);
            }}
          />
        </>
      )}
    </Modal>
  );
}
function LibraryFilter({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <Select
        placeholder={label}
        value={value}
        onValueChange={onChange}
        options={[
          { value: "all", label: `All ${label === "CR" ? "CRs" : "types"}` },
          ...values.map((value) => ({ label: value, value })),
        ]}
      />
    </label>
  );
}
function CreatureRow({
  creature,
  active,
  onSelect,
}: {
  creature: Creature;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`View ${creature.name}${creature.readOnly ? `, ${creature.sourceLabel}` : ", my creation"}`}
      aria-pressed={active}
      className={`group flex w-full min-w-0 items-center gap-3 border-b border-border p-3 text-left transition last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${active ? "bg-primary/8 text-foreground" : "bg-card text-card-foreground hover:bg-surface"}`}
    >
      <InitialsAvatar
        size="sm"
        name={creature.name}
        src={avatarImageSrc(creature.imageAssetId, creature.avatarUrl)}
      />
      <span className="min-w-0 grow">
        <span className="block truncate font-semibold">{creature.name}</span>
        <span className="block text-xs text-muted-foreground">
          {creature.size} · {creature.creatureType}
        </span>
        <span
          className={`mt-1 flex items-center gap-1 text-xs ${creature.readOnly ? "text-companion-official" : "text-companion-personal"}`}
        >
          {creature.readOnly ? <BookOpen className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
          {creature.readOnly ? creature.sourceLabel : "My creation"}
        </span>
      </span>
      <span className="hidden gap-3 text-xs tabular-nums sm:flex">
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          {creature.armorClass}
        </span>
        <span className="flex items-center gap-1">
          <HeartPulse className="h-3.5 w-3.5 text-tertiary" />
          {creature.hitPoints}
        </span>
      </span>
      <StatChip label="CR" value={creature.challengeRating || "—"} tone="metadata" />
      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
function CreatureProfileActions({
  creature,
  onRemove,
}: {
  creature: Creature;
  onRemove: (creature: Creature) => void;
}) {
  const navigate = useNavigate();
  return (
    <ActionRow className="mt-4 border-t border-border pt-4">
      {!creature.readOnly && (
        <Button icon={Pencil} size="sm" onClick={() => navigate(`/npcs/${creature.id}/edit`)}>
          Edit creature
        </Button>
      )}
      <Button
        icon={Copy}
        size="sm"
        variant="outline"
        onClick={() =>
          navigate(
            `/npcs/new?copy=${encodeURIComponent(creature.id)}${creature.readOnly ? "&source=standard" : ""}`,
          )
        }
      >
        {creature.readOnly ? "Copy to my creations" : "Duplicate"}
      </Button>
      {!creature.readOnly && (
        <Button icon={Trash2} size="sm" variant="ghost" onClick={() => onRemove(creature)}>
          Remove
        </Button>
      )}
    </ActionRow>
  );
}
function crNumber(value: string) {
  const [n, d] = value.split("/").map(Number);
  return d ? n / d : n || 0;
}
