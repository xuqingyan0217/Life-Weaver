package main

import (
    "fmt"
    "multi-agent/internal/httpserver"
)

func main() {
    r := httpserver.NewServer()
    addr := fmt.Sprintf(":%d", 8080)
    if err := r.Run(addr); err != nil {
        panic(err)
    }
}
