package orchestrator

import (
    "encoding/json"
)

// Canonical models for board data and orchestration outputs

type Board struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type ExportNode struct {
    ID          string                 `json:"id"`
    Type        string                 `json:"type"`
    Enabled     bool                   `json:"enabled"`
    Payload     json.RawMessage        `json:"payload"`
    X           float64                `json:"x"`
    Y           float64                `json:"y"`
    W           float64                `json:"w"`
    H           float64                `json:"h"`
    Z           int                    `json:"z"`
    Connectable bool                   `json:"connectable"`
}

type ExportEdge struct {
	From   string      `json:"from"`
	To     string      `json:"to"`
	Color  string      `json:"color"`
	Intent interface{} `json:"intent"`
	Params interface{} `json:"params"`
}

type BoardExport struct {
	Board Board        `json:"board"`
	Nodes []ExportNode `json:"nodes"`
	Edges []ExportEdge `json:"edges"`
}

// Node Canonical normalized node for orchestration
type Node struct {
    ID      string
    Type    string
    Enabled bool
    Payload map[string]interface{}
    RawPayload json.RawMessage
    Text    string // extracted textual content (if any)
}

type Edge struct {
	From string
	To   string
}

type Canonical struct {
	Board Board
	Nodes map[string]Node
	Edges []Edge
}
