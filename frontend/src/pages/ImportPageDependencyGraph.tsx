import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  FileImage,
  GitBranch,
  Link2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Callout, SectionPanel } from "../components/ui";
import type {
  ImportExportDependencyGraph,
  ImportExportDependencyGraphNode,
  ImportExportDependencyGraphView,
  ImportExportDependencyGraphViewNode,
} from "../lib/api/importExport";

type GraphMode = "tree" | "raw";

export function DependencyGraphPanel({
  graph,
  title = "Dependency Graph",
}: {
  graph?: ImportExportDependencyGraph | null;
  title?: string;
}) {
  const [mode, setMode] = useState<GraphMode>("tree");
  const [query, setQuery] = useState("");
  const [showAssets, setShowAssets] = useState(true);
  const [showStandard, setShowStandard] = useState(false);
  const [showOptional, setShowOptional] = useState(true);
  const [showInternal, setShowInternal] = useState(true);
  const [expandAll, setExpandAll] = useState(false);

  if (!graph || !graph.nodes?.length) {
    return null;
  }

  const projection = graph.projection;

  return (
    <SectionPanel title={title} icon={GitBranch}>
      <div className="grid gap-4">
        {projection ? (
          <ProjectedGraphStats view={projection} warnings={graph.warnings ?? []} />
        ) : (
          <RawGraphStats graph={graph} />
        )}
        {graph.warnings?.length > 0 && (
          <div className="grid gap-2">
            {graph.warnings.slice(0, 4).map((warning) => (
              <Callout key={warning} tone="danger">
                {warning}
              </Callout>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "tree" ? "primary" : "secondary"}
            onClick={() => setMode("tree")}
          >
            Tree
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "raw" ? "primary" : "secondary"}
            onClick={() => setMode("raw")}
          >
            Raw / Developer
          </Button>
        </div>
        {mode === "tree" && projection ? (
          <>
            <GraphControls
              expandAll={expandAll}
              query={query}
              showAssets={showAssets}
              showInternal={showInternal}
              showOptional={showOptional}
              showStandard={showStandard}
              onExpandAll={setExpandAll}
              onQuery={setQuery}
              onShowAssets={setShowAssets}
              onShowInternal={setShowInternal}
              onShowOptional={setShowOptional}
              onShowStandard={setShowStandard}
            />
            <ProjectedGraphTree
              expandAll={expandAll}
              query={query}
              showAssets={showAssets}
              showInternal={showInternal}
              showOptional={showOptional}
              showStandard={showStandard}
              view={projection}
            />
          </>
        ) : (
          <RawGraphTree graph={graph} />
        )}
      </div>
    </SectionPanel>
  );
}

function ProjectedGraphStats({
  view,
  warnings,
}: {
  view: ImportExportDependencyGraphView;
  warnings: string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <GraphStat label="Objects" value={view.counts.objects} />
      <GraphStat label="Roots" value={view.counts.rootObjects} />
      <GraphStat label="Internal records" value={view.counts.internalRecords} />
      <GraphStat label="Assets" value={view.counts.assets} />
      <GraphStat label="Warnings" value={warnings.length} />
    </div>
  );
}

function RawGraphStats({ graph }: { graph: ImportExportDependencyGraph }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <GraphStat label="Required" value={graph.counts.requiredObjects} />
      <GraphStat label="Optional" value={graph.counts.optionalObjects} />
      <GraphStat label="Assets" value={graph.counts.assets} />
      <GraphStat label="Standard" value={graph.counts.standardReferences} />
      <GraphStat label="Warnings" value={(graph.warnings ?? []).length} />
    </div>
  );
}

function GraphControls({
  expandAll,
  query,
  showAssets,
  showInternal,
  showOptional,
  showStandard,
  onExpandAll,
  onQuery,
  onShowAssets,
  onShowInternal,
  onShowOptional,
  onShowStandard,
}: {
  expandAll: boolean;
  query: string;
  showAssets: boolean;
  showInternal: boolean;
  showOptional: boolean;
  showStandard: boolean;
  onExpandAll: (value: boolean) => void;
  onQuery: (value: string) => void;
  onShowAssets: (value: boolean) => void;
  onShowInternal: (value: boolean) => void;
  onShowOptional: (value: boolean) => void;
  onShowStandard: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <label className="flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Search graph"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-3 text-sm">
        <GraphToggle checked={showAssets} label="Assets" onChange={onShowAssets} />
        <GraphToggle checked={showStandard} label="Standard references" onChange={onShowStandard} />
        <GraphToggle
          checked={showOptional}
          label="Optional dependencies"
          onChange={onShowOptional}
        />
        <GraphToggle checked={showInternal} label="Internal counts" onChange={onShowInternal} />
        <GraphToggle checked={expandAll} label="Expand all" onChange={onExpandAll} />
      </div>
    </div>
  );
}

function GraphToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function ProjectedGraphTree({
  expandAll,
  query,
  showAssets,
  showInternal,
  showOptional,
  showStandard,
  view,
}: {
  expandAll: boolean;
  query: string;
  showAssets: boolean;
  showInternal: boolean;
  showOptional: boolean;
  showStandard: boolean;
  view: ImportExportDependencyGraphView;
}) {
  const { edgesByFrom, nodeMap, roots } = useMemo(() => {
    const nodes = new Map(view.nodes.map((node) => [node.id, node]));
    const byFrom = new Map<string, typeof view.edges>();
    view.edges.forEach((edge) => byFrom.set(edge.from, [...(byFrom.get(edge.from) ?? []), edge]));
    return {
      edgesByFrom: byFrom,
      nodeMap: nodes,
      roots: view.roots
        .map((id) => nodes.get(id))
        .filter((node): node is ImportExportDependencyGraphViewNode => Boolean(node)),
    };
  }, [view]);
  const visibleRoots = roots.filter((node) =>
    graphNodeVisible(node, query, showAssets, showOptional, showStandard),
  );
  if (!visibleRoots.length) {
    return <p className="text-sm text-muted-foreground">No graph objects match these filters.</p>;
  }
  return (
    <div className="grid gap-2">
      {visibleRoots.map((root) => (
        <ProjectedGraphBranch
          key={root.id}
          edgesByFrom={edgesByFrom}
          expandAll={expandAll}
          node={root}
          nodeMap={nodeMap}
          query={query}
          relation="Export root"
          seen={new Set()}
          showAssets={showAssets}
          showInternal={showInternal}
          showOptional={showOptional}
          showStandard={showStandard}
        />
      ))}
    </div>
  );
}

function ProjectedGraphBranch({
  edgesByFrom,
  expandAll,
  node,
  nodeMap,
  query,
  relation,
  seen,
  showAssets,
  showInternal,
  showOptional,
  showStandard,
}: {
  edgesByFrom: Map<string, ImportExportDependencyGraphView["edges"]>;
  expandAll: boolean;
  node: ImportExportDependencyGraphViewNode;
  nodeMap: Map<string, ImportExportDependencyGraphViewNode>;
  query: string;
  relation: string;
  seen: Set<string>;
  showAssets: boolean;
  showInternal: boolean;
  showOptional: boolean;
  showStandard: boolean;
}) {
  const repeated = seen.has(node.id);
  const nextSeen = new Set(seen);
  nextSeen.add(node.id);
  const children = (edgesByFrom.get(node.id) ?? [])
    .map((edge) => ({ edge, node: nodeMap.get(edge.to) }))
    .filter(
      (
        item,
      ): item is {
        edge: ImportExportDependencyGraphView["edges"][number];
        node: ImportExportDependencyGraphViewNode;
      } => {
        if (!item.node) return false;
        return graphNodeVisible(item.node, query, showAssets, showOptional, showStandard);
      },
    );

  return (
    <details
      className="rounded-md border border-border bg-background p-3"
      open={expandAll || node.root}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        <GraphIcon asset={node.asset} missing={node.missing} standard={node.standard} />
        <span className="min-w-0 flex-1 truncate font-semibold">{node.label}</span>
        <Badge tone="info">{node.kind}</Badge>
        <span className="text-xs text-muted-foreground">{relation}</span>
        {node.optional && <Badge tone="draft">Optional</Badge>}
        {node.asset && <Badge tone="imported">Asset</Badge>}
        {node.standard && <Badge tone="official">Standard</Badge>}
        {showInternal && node.internalRecords > 0 && (
          <Badge tone="metadata">{node.internalRecords} internal records</Badge>
        )}
        {children.length > 0 && (
          <span className="text-xs text-muted-foreground">{children.length}</span>
        )}
      </summary>
      {showInternal && node.childCounts && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {Object.entries(node.childCounts).map(([kind, count]) => (
            <span className="rounded border border-border px-2 py-1" key={kind}>
              {kind}: {count}
            </span>
          ))}
        </div>
      )}
      {children.length > 0 && !repeated && (
        <div className="mt-3 grid gap-2 border-l border-border pl-3">
          {children.map(({ edge, node: child }) => (
            <ProjectedGraphBranch
              key={`${edge.from}-${edge.to}-${edge.relation}`}
              edgesByFrom={edgesByFrom}
              expandAll={expandAll}
              node={child}
              nodeMap={nodeMap}
              query={query}
              relation={`${edge.relation}${edge.required ? "" : " optional"}`}
              seen={nextSeen}
              showAssets={showAssets}
              showInternal={showInternal}
              showOptional={showOptional}
              showStandard={showStandard}
            />
          ))}
        </div>
      )}
      {repeated && <p className="mt-2 text-xs text-muted-foreground">Already shown above.</p>}
    </details>
  );
}

function RawGraphTree({ graph }: { graph: ImportExportDependencyGraph }) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgesByFrom = new Map<string, typeof graph.edges>();
  graph.edges.forEach((edge) =>
    edgesByFrom.set(edge.from, [...(edgesByFrom.get(edge.from) ?? []), edge]),
  );
  const roots = graph.roots
    .map((id) => nodeMap.get(id))
    .filter((node): node is ImportExportDependencyGraphNode => Boolean(node));

  return (
    <div className="grid gap-2">
      {roots.map((root) => (
        <RawGraphBranch
          key={root.id}
          edgesByFrom={edgesByFrom}
          node={root}
          nodeMap={nodeMap}
          relation="Export root"
          seen={new Set()}
        />
      ))}
    </div>
  );
}

function RawGraphBranch({
  edgesByFrom,
  node,
  nodeMap,
  relation,
  seen,
}: {
  edgesByFrom: Map<string, ImportExportDependencyGraph["edges"]>;
  node: ImportExportDependencyGraphNode;
  nodeMap: Map<string, ImportExportDependencyGraphNode>;
  relation: string;
  seen: Set<string>;
}) {
  const children = (edgesByFrom.get(node.id) ?? [])
    .map((edge) => ({ edge, node: nodeMap.get(edge.to) }))
    .filter(
      (
        item,
      ): item is {
        edge: ImportExportDependencyGraph["edges"][number];
        node: ImportExportDependencyGraphNode;
      } => Boolean(item.node),
    );
  const nextSeen = new Set(seen);
  nextSeen.add(node.id);
  const repeated = seen.has(node.id);

  return (
    <details className="rounded-md border border-border bg-background p-3" open>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
        <GraphIcon asset={node.asset} missing={node.missing} standard={node.standard} />
        <span className="min-w-0 flex-1 truncate font-semibold">{node.label}</span>
        <Badge tone="info">{node.kind}</Badge>
        <span className="text-xs text-muted-foreground">{relation}</span>
        {node.optional && <Badge tone="draft">Optional</Badge>}
        {node.asset && <Badge tone="imported">Asset</Badge>}
        {node.standard && <Badge tone="official">Standard</Badge>}
        {node.missing && <Badge tone="danger">Missing</Badge>}
        {children.length > 0 && (
          <span className="text-xs text-muted-foreground">{children.length}</span>
        )}
      </summary>
      {children.length > 0 && !repeated && (
        <div className="mt-3 grid gap-2 border-l border-border pl-3">
          {children.map(({ edge, node: child }) => (
            <RawGraphBranch
              key={`${edge.from}-${edge.to}-${edge.relation}`}
              edgesByFrom={edgesByFrom}
              node={child}
              nodeMap={nodeMap}
              relation={`${edge.relation}${edge.required ? "" : " optional"}`}
              seen={nextSeen}
            />
          ))}
        </div>
      )}
      {repeated && <p className="mt-2 text-xs text-muted-foreground">Already shown above.</p>}
    </details>
  );
}

function graphNodeVisible(
  node: ImportExportDependencyGraphViewNode,
  query: string,
  showAssets: boolean,
  showOptional: boolean,
  showStandard: boolean,
) {
  if (!showAssets && node.asset) return false;
  if (!showStandard && node.standard) return false;
  if (!showOptional && node.optional) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${node.label} ${node.kind} ${node.category}`.toLowerCase().includes(needle);
}

function GraphIcon({
  asset,
  missing,
  standard,
}: {
  asset?: boolean;
  missing?: boolean;
  standard?: boolean;
}) {
  if (missing) return <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />;
  if (asset) return <FileImage className="h-4 w-4 shrink-0 text-accent" />;
  if (standard) return <Link2 className="h-4 w-4 shrink-0 text-accent" />;
  return <Boxes className="h-4 w-4 shrink-0 text-accent" />;
}

function GraphStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
