package orchestrator

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

// ParseBoardExport reads a JSON file and converts it into Canonical form.
func ParseBoardExport(filePath string) (Canonical, error) {
	var canon Canonical

	f, err := os.Open(filePath)
	if err != nil {
		return canon, fmt.Errorf("open export file: %w", err)
	}
	defer f.Close()

	var be BoardExport
	if err := json.NewDecoder(f).Decode(&be); err != nil {
		return canon, fmt.Errorf("decode export json: %w", err)
	}

	canon.Board = be.Board
	canon.Nodes = make(map[string]Node, len(be.Nodes))

	for _, n := range be.Nodes {
		var payloadMap map[string]interface{}
		if len(n.Payload) > 0 {
			_ = json.Unmarshal(n.Payload, &payloadMap)
		}
		text := extractText(payloadMap)
		canon.Nodes[n.ID] = Node{
			ID:         n.ID,
			Type:       n.Type,
			Enabled:    n.Enabled,
			Payload:    payloadMap,
			RawPayload: n.Payload,
			Text:       text,
		}
	}

	canon.Edges = make([]Edge, 0, len(be.Edges))
	for _, e := range be.Edges {
		if e.From == "" || e.To == "" {
			continue
		}
		canon.Edges = append(canon.Edges, Edge{From: e.From, To: e.To})
	}

	return canon, nil
}

// extractText pulls meaningful string values from payload while avoiding binary fields.
func extractText(payload map[string]interface{}) string {
	if payload == nil {
		return ""
	}
	// Keys to ignore from textual extraction
	ignore := map[string]struct{}{
		"src":       {},
		"imageId":   {},
		"objectUrl": {},
	}

	// Collect candidate strings
	parts := make([]string, 0, len(payload))
	// deterministic order
	keys := make([]string, 0, len(payload))
	for k := range payload {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// First, explicitly include imageUrl in a labeled form if present
	if v, ok := payload["imageUrl"]; ok {
		if s, ok := v.(string); ok {
			s = strings.TrimSpace(s)
			if s != "" {
				parts = append(parts, "图片: "+s)
			}
		}
	}

	for _, k := range keys {
		if _, ok := ignore[k]; ok {
			continue
		}
		v := payload[k]
		switch t := v.(type) {
		case string:
			s := strings.TrimSpace(t)
			if s != "" {
				parts = append(parts, s)
			}
		case []interface{}:
			// join string arrays conservatively
			arr := make([]string, 0, len(t))
			for _, item := range t {
				if sv, ok := item.(string); ok {
					sv = strings.TrimSpace(sv)
					if sv != "" {
						arr = append(arr, sv)
					}
				}
			}
			if len(arr) > 0 {
				parts = append(parts, strings.Join(arr, "; "))
			}
		}
	}

	return strings.Join(parts, " \u2022 ") // use bullet separator
}
