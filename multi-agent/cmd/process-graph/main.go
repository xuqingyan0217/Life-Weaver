package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/joho/godotenv"

	"multi-agent/internal/graphproc"
)

func main() {
	if err := godotenv.Load("./.env"); err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] load env: %v\n", err)
		os.Exit(1)
	}

	var file string
	var verbose bool
	flag.StringVar(&file, "file", "../agent-graph.json", "Path to agent graph JSON file")
	flag.BoolVar(&verbose, "verbose", true, "Enable verbose streaming debug output")
	flag.Parse()

	sg, err := graphproc.ReadSimpleGraph(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] read agent graph: %v\n", err)
		os.Exit(1)
	}
	supervisorAgent, textAgent, visionAgent, err := graphproc.BuildAgents()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] build agents: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()
	sp := graphproc.NewStreamPrinter()
	sp.EnableVerbose(verbose)

	results := make(map[string]graphproc.NodeResult, len(sg.Nodes))
	if err := graphproc.ProcessGraph(ctx, sg, supervisorAgent, textAgent, visionAgent, results, sp); err != nil {
		fmt.Fprintf(os.Stderr, "[ERROR] process graph: %v\n", err)
		os.Exit(1)
	}
}
