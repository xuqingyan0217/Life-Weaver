package orchestrator

import (
	"strings"
)

func imageURLFromPayload(p map[string]interface{}) string {
	if p == nil {
		return ""
	}
	if v, ok := p["imageUrl"]; ok {
		if s, ok := v.(string); ok {
			return strings.TrimSpace(s)
		}
	}
	return ""
}
