package orchestrator

import (
    "encoding/json"
)

// Minimal graph for LLM agent: passthrough payload and directed edges

type SimpleNode struct {
    ID      string          `json:"id"`
    Payload json.RawMessage `json:"payload,omitempty"`
}

type SimpleEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type SimpleGraph struct {
	Nodes []SimpleNode `json:"nodes"`
	Edges []SimpleEdge `json:"edges"`
}

// BuildSimpleGraph converts Canonical into SimpleGraph using only enabled nodes
func BuildSimpleGraph(c Canonical) SimpleGraph {
    sg := SimpleGraph{
        Nodes: make([]SimpleNode, 0, len(c.Nodes)),
        Edges: make([]SimpleEdge, 0, len(c.Edges)),
    }

    enabled := map[string]struct{}{}
    for id, n := range c.Nodes {
        if !n.Enabled {
            continue
        }
        sn := SimpleNode{ID: id, Payload: n.RawPayload}
        sg.Nodes = append(sg.Nodes, sn)
        enabled[id] = struct{}{}
    }

	for _, e := range c.Edges {
		if _, ok := enabled[e.From]; !ok {
			continue
		}
		if _, ok := enabled[e.To]; !ok {
			continue
		}
		sg.Edges = append(sg.Edges, SimpleEdge{From: e.From, To: e.To})
	}

	return sg
}
