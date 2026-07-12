package store

import (
	"fmt"
	"sort"
	"strings"
)

func AuditDependencyGraph(graph DependencyGraph) DependencyGraphAudit {
	known := map[string]DependencyGraphNode{}
	for _, node := range graph.Nodes {
		known[node.ID] = node
	}
	reachable := map[string]bool{}
	children := map[string][]string{}
	for _, edge := range graph.Edges {
		children[edge.From] = append(children[edge.From], edge.To)
	}
	var audit DependencyGraphAudit
	for _, edge := range graph.Edges {
		if !edge.Required {
			continue
		}
		for _, id := range []string{edge.From, edge.To} {
			node, ok := known[id]
			if ok && node.Missing {
				audit.MissingRequired++
				audit.Errors = append(audit.Errors, fmt.Sprintf("Missing required %s: %s", node.Kind, node.Label))
			}
		}
	}
	var visit func(string)
	visit = func(id string) {
		if reachable[id] {
			return
		}
		reachable[id] = true
		for _, child := range children[id] {
			visit(child)
		}
	}
	for _, root := range graph.Roots {
		visit(root)
	}
	for _, node := range graph.Nodes {
		if node.Missing || node.Standard {
			continue
		}
		if !reachable[node.ID] {
			audit.OrphanedNodes++
		}
	}
	if audit.OrphanedNodes > 0 {
		audit.Warnings = append(audit.Warnings, fmt.Sprintf("%d exported object(s) are not reachable from the export root", audit.OrphanedNodes))
	}
	audit.UnexpectedCycles = countUnexpectedCycles(graph)
	if audit.UnexpectedCycles > 0 {
		audit.Warnings = append(audit.Warnings, fmt.Sprintf("%d unexpected dependency cycle(s) detected", audit.UnexpectedCycles))
	}
	sort.Strings(audit.Errors)
	sort.Strings(audit.Warnings)
	return audit
}

func graphCounts(nodes []DependencyGraphNode, edges []DependencyGraphEdge) DependencyGraphCounts {
	counts := DependencyGraphCounts{Edges: len(edges)}
	for _, node := range nodes {
		switch {
		case node.Missing:
			counts.Missing++
		case node.Asset:
			counts.Assets++
		case node.Standard:
			counts.StandardReferences++
		default:
			counts.Objects++
			if node.Optional {
				counts.OptionalObjects++
			} else {
				counts.RequiredObjects++
			}
		}
	}
	return counts
}

func graphTraversalOrder(roots []string, edges []DependencyGraphEdge) []string {
	children := map[string][]string{}
	for _, edge := range edges {
		children[edge.From] = append(children[edge.From], edge.To)
	}
	for id := range children {
		sort.Strings(children[id])
	}
	visited := map[string]bool{}
	order := []string{}
	var visit func(string)
	visit = func(id string) {
		if visited[id] {
			return
		}
		visited[id] = true
		order = append(order, id)
		for _, child := range children[id] {
			visit(child)
		}
	}
	sortedRoots := append([]string(nil), roots...)
	sort.Strings(sortedRoots)
	for _, root := range sortedRoots {
		visit(root)
	}
	return order
}

func reverseGraphEdges(edges []DependencyGraphEdge) []DependencyGraphEdge {
	reversed := make([]DependencyGraphEdge, 0, len(edges))
	for _, edge := range edges {
		reversed = append(reversed, DependencyGraphEdge{
			From:     edge.To,
			To:       edge.From,
			Relation: "dependent: " + edge.Relation,
			Required: edge.Required,
		})
	}
	sort.Slice(reversed, func(left, right int) bool {
		if reversed[left].From == reversed[right].From {
			return reversed[left].To < reversed[right].To
		}
		return reversed[left].From < reversed[right].From
	})
	return reversed
}

func countUnexpectedCycles(graph DependencyGraph) int {
	children := map[string][]string{}
	for _, edge := range graph.Edges {
		children[edge.From] = append(children[edge.From], edge.To)
	}
	visiting := map[string]bool{}
	visited := map[string]bool{}
	cycles := 0
	var walk func(string)
	walk = func(id string) {
		if visiting[id] {
			cycles++
			return
		}
		if visited[id] {
			return
		}
		visiting[id] = true
		for _, child := range children[id] {
			walk(child)
		}
		delete(visiting, id)
		visited[id] = true
	}
	for _, root := range graph.Roots {
		walk(root)
	}
	return cycles
}

func nodeID(kind, id string) string {
	return kind + ":" + strings.TrimSpace(id)
}

func bundleRootLabel(bundleType string) string {
	if bundleType == "" {
		return "Export bundle"
	}
	return strings.TrimSpace(bundleType) + " bundle"
}

func creatureSpellLabel(level int, standardID *string) string {
	if standardID != nil && strings.TrimSpace(*standardID) != "" {
		return "Standard spell reference"
	}
	if level == 0 {
		return "Cantrip"
	}
	return fmt.Sprintf("Level %d spell", level)
}

func mapPinLabel(label string) string {
	if strings.TrimSpace(label) != "" {
		return label
	}
	return "Map pin"
}

func locationGraphKind(locationType string) string {
	switch strings.ToLower(strings.TrimSpace(locationType)) {
	case "shop", "market", "vendor", "merchant", "blacksmith", "apothecary", "general-store", "armoury", "armory", "potion-store", "tavern", "inn", "magic-shop", "black-market", "stable":
		return "shop"
	case "dungeon", "lair", "cave", "mine", "tomb", "crypt", "ruin-interior", "fortress-interior", "stronghold-dungeon":
		return "dungeon"
	case "floor", "level", "dungeon-level", "basement", "upper-floor", "sublevel", "room", "chamber", "corridor", "hall", "cave-room", "dungeon-area", "zone":
		return "dungeon area"
	case "settlement", "town", "city", "village":
		return "settlement"
	default:
		return "location"
	}
}

func rollPartLabel(diceCount, dieSize, fixedValue int) string {
	if diceCount > 0 && dieSize > 0 {
		label := fmt.Sprintf("%dd%d", diceCount, dieSize)
		if fixedValue > 0 {
			label += fmt.Sprintf(" + %d", fixedValue)
		}
		return label
	}
	if fixedValue > 0 {
		return fmt.Sprintf("%d fixed", fixedValue)
	}
	return "Roll part"
}

func blankDefault(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return "Object"
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	unique := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		unique = append(unique, value)
	}
	sort.Strings(unique)
	return unique
}
