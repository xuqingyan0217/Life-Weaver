package graphproc

import (
    "encoding/json"
    "os"

    "multi-agent/internal/orchestrator"
)

// ReadSimpleGraph loads a SimpleGraph from a JSON file path
func ReadSimpleGraph(path string) (orchestrator.SimpleGraph, error) {
    var sg orchestrator.SimpleGraph
    f, err := os.Open(path)
    if err != nil {
        return sg, err
    }
    defer f.Close()
    dec := json.NewDecoder(f)
    if err := dec.Decode(&sg); err != nil {
        return sg, err
    }
    return sg, nil
}