package store

import (
	"crypto/sha1"
	"encoding/hex"
	"regexp"
	"sort"
	"strings"
)

var graphKeyUnsafe = regexp.MustCompile(`[^a-z0-9]+`)

func ProjectDependencyGraph(graph DependencyGraph) DependencyGraphView {
	rawNodes := map[string]DependencyGraphNode{}
	for _, node := range graph.Nodes {
		rawNodes[node.ID] = node
	}
	projectedIDs := map[string]string{}
	viewNodes := map[string]DependencyGraphViewNode{}
	for _, node := range graph.Nodes {
		if !isGraphViewNode(node) {
			continue
		}
		viewID := graphViewNodeID(node)
		projectedIDs[node.ID] = viewID
		viewNodes[viewID] = DependencyGraphViewNode{
			ID:          viewID,
			Kind:        graphViewKind(node),
			Label:       node.Label,
			Category:    graphViewCategory(node),
			Root:        containsString(graph.Roots, node.ID),
			Optional:    node.Optional,
			Asset:       node.Asset,
			Standard:    node.Standard,
			Missing:     node.Missing,
			ChildCounts: map[string]int{},
		}
	}
	edgesByFrom := map[string][]DependencyGraphEdge{}
	for _, edge := range graph.Edges {
		edgesByFrom[edge.From] = append(edgesByFrom[edge.From], edge)
	}
	internalOwners := map[string]string{}
	for _, root := range graph.Roots {
		owner := nearestVisibleNode(root, projectedIDs, rawNodes, edgesByFrom)
		if owner != "" {
			internalOwners[root] = owner
		}
	}
	for _, edge := range graph.Edges {
		from := nearestVisibleNode(edge.From, projectedIDs, rawNodes, edgesByFrom)
		to := nearestVisibleNode(edge.To, projectedIDs, rawNodes, edgesByFrom)
		if from != "" && to != "" && from != to {
			addGraphViewEdge(&graph, from, to, edge.Relation, edge.Required)
		}
		if owner := internalOwner(edge.From, edge.To, projectedIDs, internalOwners, rawNodes, edgesByFrom); owner != "" {
			node := viewNodes[owner]
			node.InternalRecords++
			if raw, ok := rawNodes[edge.To]; ok && !isGraphViewNode(raw) {
				node.ChildCounts[raw.Kind]++
			}
			viewNodes[owner] = node
		}
	}
	roots := make([]string, 0, len(graph.Roots))
	for _, root := range graph.Roots {
		if viewID := projectedIDs[root]; viewID != "" {
			roots = append(roots, viewID)
		}
	}
	nodes := make([]DependencyGraphViewNode, 0, len(viewNodes))
	for _, node := range viewNodes {
		if len(node.ChildCounts) == 0 {
			node.ChildCounts = nil
		}
		nodes = append(nodes, node)
	}
	sort.Slice(nodes, func(left, right int) bool {
		if nodes[left].Root != nodes[right].Root {
			return nodes[left].Root
		}
		if nodes[left].Kind == nodes[right].Kind {
			return nodes[left].Label < nodes[right].Label
		}
		return nodes[left].Kind < nodes[right].Kind
	})
	edges := uniqueGraphViewEdges(graph.Projection.Edges)
	groups := graphViewGroups(nodes)
	return DependencyGraphView{
		Roots:  uniqueStrings(roots),
		Nodes:  nodes,
		Edges:  edges,
		Counts: graphViewCounts(nodes, edges),
		Groups: groups,
	}
}

func isGraphViewNode(node DependencyGraphNode) bool {
	if node.Asset || node.Standard || node.Missing {
		return true
	}
	switch node.Kind {
	case "campaign", "encounter", "npc", "player", "item", "spell", "map", "location", "shop", "settlement", "dungeon", "journey", "roll table":
		return true
	default:
		return false
	}
}

func graphViewKind(node DependencyGraphNode) string {
	if node.Asset {
		return "asset"
	}
	if node.Standard {
		return "standard reference"
	}
	return node.Kind
}

func graphViewCategory(node DependencyGraphNode) string {
	if node.Asset {
		return "Assets"
	}
	if node.Standard {
		return "Standard References"
	}
	switch node.Kind {
	case "npc":
		return "NPCs / Creatures"
	case "roll table":
		return "Roll Tables"
	default:
		return titleWords(node.Kind) + "s"
	}
}

func graphViewNodeID(node DependencyGraphNode) string {
	return graphViewKind(node) + ":" + stableGraphKey(node.Label, node.ID)
}

func stableGraphKey(label, id string) string {
	key := strings.Trim(graphKeyUnsafe.ReplaceAllString(strings.ToLower(label), "-"), "-")
	if key == "" {
		key = "object"
	}
	sum := sha1.Sum([]byte(id))
	return key + "-" + hex.EncodeToString(sum[:])[:8]
}

func nearestVisibleNode(id string, projectedIDs map[string]string, rawNodes map[string]DependencyGraphNode, edgesByFrom map[string][]DependencyGraphEdge) string {
	if viewID := projectedIDs[id]; viewID != "" {
		return viewID
	}
	seen := map[string]bool{id: true}
	queue := []string{id}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		for _, edge := range edgesByFrom[current] {
			if seen[edge.To] {
				continue
			}
			seen[edge.To] = true
			if viewID := projectedIDs[edge.To]; viewID != "" {
				return viewID
			}
			if _, ok := rawNodes[edge.To]; ok {
				queue = append(queue, edge.To)
			}
		}
	}
	return ""
}

func internalOwner(from, to string, projectedIDs, internalOwners map[string]string, rawNodes map[string]DependencyGraphNode, edgesByFrom map[string][]DependencyGraphEdge) string {
	fromVisible := projectedIDs[from]
	toVisible := projectedIDs[to]
	if fromVisible != "" && toVisible != "" {
		return ""
	}
	if fromVisible != "" {
		if owner := internalOwners[to]; owner != "" {
			return owner
		}
		owner := preferredInternalOwner(to, rawNodes[to], projectedIDs, edgesByFrom)
		if owner == "" {
			owner = fromVisible
		}
		internalOwners[to] = owner
		return owner
	}
	if toVisible != "" {
		if internalOwners[from] != "" {
			return ""
		}
		internalOwners[from] = toVisible
		return toVisible
	}
	if owner := internalOwners[from]; owner != "" {
		internalOwners[to] = owner
		return owner
	}
	return ""
}

func preferredInternalOwner(id string, node DependencyGraphNode, projectedIDs map[string]string, edgesByFrom map[string][]DependencyGraphEdge) string {
	preferredRelations := map[string]string{
		"location stock":    "location",
		"NPC location link": "location",
	}
	relation := preferredRelations[node.Kind]
	if relation == "" {
		return ""
	}
	for _, edge := range edgesByFrom[id] {
		if edge.Relation == relation {
			return projectedIDs[edge.To]
		}
	}
	return ""
}

func addGraphViewEdge(graph *DependencyGraph, from, to, relation string, required bool) {
	graph.Projection.Edges = append(graph.Projection.Edges, DependencyGraphViewEdge{
		From:     from,
		To:       to,
		Relation: relation,
		Required: required,
	})
}

func uniqueGraphViewEdges(edges []DependencyGraphViewEdge) []DependencyGraphViewEdge {
	seen := map[string]bool{}
	unique := make([]DependencyGraphViewEdge, 0, len(edges))
	for _, edge := range edges {
		key := edge.From + "\x00" + edge.To + "\x00" + edge.Relation
		if seen[key] {
			continue
		}
		seen[key] = true
		unique = append(unique, edge)
	}
	sort.Slice(unique, func(left, right int) bool {
		if unique[left].From == unique[right].From {
			return unique[left].To < unique[right].To
		}
		return unique[left].From < unique[right].From
	})
	return unique
}

func graphViewCounts(nodes []DependencyGraphViewNode, edges []DependencyGraphViewEdge) DependencyGraphViewCounts {
	counts := DependencyGraphViewCounts{Objects: len(nodes), Edges: len(edges)}
	for _, node := range nodes {
		if node.Root {
			counts.RootObjects++
		}
		if node.Asset {
			counts.Assets++
		}
		if node.Standard {
			counts.StandardReferences++
		}
		counts.InternalRecords += node.InternalRecords
	}
	return counts
}

func graphViewGroups(nodes []DependencyGraphViewNode) []DependencyGraphViewGroup {
	counts := map[string]int{}
	labels := map[string]string{}
	for _, node := range nodes {
		counts[node.Kind]++
		labels[node.Kind] = node.Category
	}
	groups := make([]DependencyGraphViewGroup, 0, len(counts))
	for kind, count := range counts {
		groups = append(groups, DependencyGraphViewGroup{Kind: kind, Label: labels[kind], Count: count})
	}
	sort.Slice(groups, func(left, right int) bool {
		return groups[left].Label < groups[right].Label
	})
	return groups
}

func containsString(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}

func titleWords(value string) string {
	parts := strings.Fields(value)
	for index, part := range parts {
		parts[index] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}
