package store

type DependencyGraph struct {
	Roots        []string              `json:"roots"`
	Order        []string              `json:"order"`
	Nodes        []DependencyGraphNode `json:"nodes"`
	Edges        []DependencyGraphEdge `json:"edges"`
	ReverseEdges []DependencyGraphEdge `json:"reverseEdges"`
	Counts       DependencyGraphCounts `json:"counts"`
	Warnings     []string              `json:"warnings"`
	Audit        DependencyGraphAudit  `json:"audit"`
	Projection   DependencyGraphView   `json:"projection"`
}

type DependencyGraphNode struct {
	ID       string `json:"id"`
	Kind     string `json:"kind"`
	Label    string `json:"label"`
	Optional bool   `json:"optional"`
	Asset    bool   `json:"asset"`
	Standard bool   `json:"standard"`
	Missing  bool   `json:"missing"`
}

type DependencyGraphEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
	Required bool   `json:"required"`
}

type DependencyGraphCounts struct {
	Objects            int `json:"objects"`
	RequiredObjects    int `json:"requiredObjects"`
	OptionalObjects    int `json:"optionalObjects"`
	Assets             int `json:"assets"`
	StandardReferences int `json:"standardReferences"`
	Missing            int `json:"missing"`
	Edges              int `json:"edges"`
}

type DependencyGraphAudit struct {
	Errors           []string `json:"errors"`
	Warnings         []string `json:"warnings"`
	OrphanedNodes    int      `json:"orphanedNodes"`
	MissingRequired  int      `json:"missingRequired"`
	UnexpectedCycles int      `json:"unexpectedCycles"`
}

type DependencyGraphView struct {
	Roots  []string                   `json:"roots"`
	Nodes  []DependencyGraphViewNode  `json:"nodes"`
	Edges  []DependencyGraphViewEdge  `json:"edges"`
	Counts DependencyGraphViewCounts  `json:"counts"`
	Groups []DependencyGraphViewGroup `json:"groups"`
}

type DependencyGraphViewNode struct {
	ID              string         `json:"id"`
	Kind            string         `json:"kind"`
	Label           string         `json:"label"`
	Category        string         `json:"category"`
	Root            bool           `json:"root"`
	Optional        bool           `json:"optional"`
	Asset           bool           `json:"asset"`
	Standard        bool           `json:"standard"`
	Missing         bool           `json:"missing"`
	InternalRecords int            `json:"internalRecords"`
	ChildCounts     map[string]int `json:"childCounts,omitempty"`
}

type DependencyGraphViewEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Relation string `json:"relation"`
	Required bool   `json:"required"`
}

type DependencyGraphViewCounts struct {
	Objects            int `json:"objects"`
	RootObjects        int `json:"rootObjects"`
	InternalRecords    int `json:"internalRecords"`
	Assets             int `json:"assets"`
	StandardReferences int `json:"standardReferences"`
	Edges              int `json:"edges"`
}

type DependencyGraphViewGroup struct {
	Kind  string `json:"kind"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

type dependencyGraphBuilder struct {
	nodes    map[string]DependencyGraphNode
	edges    []DependencyGraphEdge
	roots    []string
	warnings []string
}
