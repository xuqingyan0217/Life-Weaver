package main

import (
    "encoding/json"
    "flag"
    "fmt"
    "os"

    "multi-agent/internal/orchestrator"
)

func main() {
    var file string
    var agentOut string
    flag.StringVar(&file, "file", "../board-export.json", "Path to board export JSON file")
    flag.StringVar(&agentOut, "agent_out", "../agent-graph.json", "Path to write minimal agent graph JSON")
    flag.Parse()

    canon, err := orchestrator.ParseBoardExport(file)
    if err != nil {
        fmt.Fprintf(os.Stderr, "[ERROR] parse board export: %v\n", err)
        os.Exit(1)
    }

    // Write minimal agent graph
    ag := orchestrator.BuildSimpleGraph(canon)
    af, err := os.Create(agentOut)
    if err != nil {
        fmt.Fprintf(os.Stderr, "[ERROR] create agent output file: %v\n", err)
        os.Exit(1)
    }
    defer af.Close()
    aenc := json.NewEncoder(af)
    aenc.SetIndent("", "  ")
    if err := aenc.Encode(ag); err != nil {
        fmt.Fprintf(os.Stderr, "[ERROR] encode agent output: %v\n", err)
        os.Exit(1)
    }

    // Print concise agent graph stats
    fmt.Println("=== Agent Graph ===")
    fmt.Printf("Nodes: %d, Edges: %d\n", len(ag.Nodes), len(ag.Edges))
}