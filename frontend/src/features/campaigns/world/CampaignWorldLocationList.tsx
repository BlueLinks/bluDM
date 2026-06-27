import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button, Input } from "../../../components/ui";
import { LocationIcon } from "./CampaignWorldLocationIcon";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignLocation } from "./travelTypes";

type LocationNode = {
  children: LocationNode[];
  location: CampaignLocation;
};

export function WorldLocationList({
  locations,
  query,
  resultCount,
  selectedID,
  totalCount,
  onQueryChange,
  onSelect,
}: {
  locations: CampaignLocation[];
  query: string;
  resultCount: number;
  selectedID: string;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onSelect: (locationID: string) => void;
}) {
  const { nodes, parentByID } = useMemo(() => buildLocationTree(locations), [locations]);
  const [expandedIDs, setExpandedIDs] = useState<Set<string>>(() => new Set(rootIDs(nodes)));

  useEffect(() => {
    setExpandedIDs((current) => {
      const next = new Set(current);
      for (const id of rootIDs(nodes)) next.add(id);
      for (const id of ancestorIDs(selectedID, parentByID)) next.add(id);
      return next;
    });
  }, [nodes, parentByID, selectedID]);

  function toggleExpanded(locationID: string) {
    setExpandedIDs((current) => {
      const next = new Set(current);
      if (next.has(locationID)) next.delete(locationID);
      else next.add(locationID);
      return next;
    });
  }

  const expandableIDs = useMemo(() => nodeIDsWithChildren(nodes), [nodes]);
  const selectedAncestorIDs = useMemo(
    () => new Set(ancestorIDs(selectedID, parentByID)),
    [parentByID, selectedID],
  );
  const canExpandAll = expandableIDs.some((id) => !expandedIDs.has(id));
  const canCollapseAll = expandableIDs.some(
    (id) => expandedIDs.has(id) && !selectedAncestorIDs.has(id),
  );

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, node: LocationNode) {
    if (!node.children.length) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setExpandedIDs((current) => new Set(current).add(node.location.id));
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setExpandedIDs((current) => {
        const next = new Set(current);
        next.delete(node.location.id);
        return next;
      });
    }
  }

  function expandAll() {
    setExpandedIDs(new Set(expandableIDs));
  }

  function collapseAll() {
    setExpandedIDs(new Set(selectedAncestorIDs));
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid content-start gap-2 rounded-md border border-border bg-card p-2">
        <div className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-1">
          <span aria-hidden="true" className="h-7 w-6" />
          <div className="min-w-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search locations"
                className="w-full pl-9"
                placeholder="Search locations"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Showing {resultCount} of {totalCount} locations.
            </p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-1">
          <span aria-hidden="true" className="h-7 w-6" />
          <div className="grid min-w-0 grid-cols-2 gap-1">
            <Button
              className="w-full"
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canExpandAll}
              onClick={expandAll}
            >
              Expand
            </Button>
            <Button
              className="w-full"
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canCollapseAll}
              onClick={collapseAll}
            >
              Collapse
            </Button>
          </div>
        </div>
      </div>
      <nav
        aria-label="Location results"
        className="grid min-h-0 flex-1 content-start gap-1 overflow-auto pr-1"
      >
        {nodes.map((node) => (
          <LocationTreeNode
            expandedIDs={expandedIDs}
            key={node.location.id}
            node={node}
            root
            selectedID={selectedID}
            onKeyDown={handleKeyDown}
            onSelect={onSelect}
            onToggleExpanded={toggleExpanded}
          />
        ))}
      </nav>
    </div>
  );
}

function LocationTreeNode({
  expandedIDs,
  node,
  root = false,
  selectedID,
  onKeyDown,
  onSelect,
  onToggleExpanded,
}: {
  expandedIDs: Set<string>;
  node: LocationNode;
  root?: boolean;
  selectedID: string;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, node: LocationNode) => void;
  onSelect: (locationID: string) => void;
  onToggleExpanded: (locationID: string) => void;
}) {
  const active = node.location.id === selectedID;
  const expanded = expandedIDs.has(node.location.id);
  const hasChildren = node.children.length > 0;
  const typeLabel = node.location.customTypeLabel || node.location.locationType || "custom";

  return (
    <div className="grid gap-1">
      <div className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-1">
        {hasChildren ? (
          <button
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.location.name}`}
            className="grid h-7 w-6 shrink-0 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onToggleExpanded(node.location.id)}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span aria-hidden="true" className="h-7 w-6 shrink-0" />
        )}
        <button
          aria-current={active ? "page" : undefined}
          aria-expanded={hasChildren ? expanded : undefined}
          className={[
            "flex min-h-8 w-full min-w-0 items-start gap-2 rounded-md border px-2 py-1 text-left text-sm transition",
            active
              ? "border-primary bg-primary/10"
              : "border-border bg-background hover:border-primary/60",
          ].join(" ")}
          title={locationPathLabel(node.location)}
          type="button"
          onClick={() => onSelect(node.location.id)}
          onKeyDown={(event) => onKeyDown(event, node)}
        >
          <LocationIcon
            className="h-3.5 w-3.5 shrink-0 text-accent"
            locationType={node.location.locationType}
          />
          <div className="min-w-0 flex-1 grid gap-0.5">
            <div className="truncate font-semibold">{node.location.name}</div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
              {root && node.location.path && node.location.path.length > 1 ? (
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {locationPathLabel(node.location)}
                </span>
              ) : null}
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
                {typeLabel}
              </span>
            </div>
          </div>
        </button>
      </div>
      {expanded ? (
        <div className="ml-6 grid gap-1 border-l border-border/70 pl-3">
          {node.children.map((child) => (
            <LocationTreeNode
              expandedIDs={expandedIDs}
              key={child.location.id}
              node={child}
              selectedID={selectedID}
              onKeyDown={onKeyDown}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildLocationTree(locations: CampaignLocation[]) {
  const nodesByID = new Map<string, LocationNode>();
  const parentByID = new Map<string, string>();
  const roots: LocationNode[] = [];

  for (const location of locations) {
    nodesByID.set(location.id, { children: [], location });
    if (location.parentLocationId) parentByID.set(location.id, location.parentLocationId);
  }

  for (const node of nodesByID.values()) {
    const parentID = node.location.parentLocationId;
    const parent = parentID ? nodesByID.get(parentID) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return { nodes: roots, parentByID };
}

function nodeIDsWithChildren(nodes: LocationNode[]) {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.children.length) ids.push(node.location.id);
    ids.push(...nodeIDsWithChildren(node.children));
  }
  return ids;
}

function rootIDs(nodes: LocationNode[]) {
  return nodes.map((node) => node.location.id);
}

function ancestorIDs(locationID: string, parentByID: Map<string, string>) {
  const ids: string[] = [];
  let current = parentByID.get(locationID);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    ids.push(current);
    current = parentByID.get(current);
  }
  return ids;
}
