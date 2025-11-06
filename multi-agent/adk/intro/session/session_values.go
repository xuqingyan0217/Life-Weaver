/*
 * Copyright 2025 CloudWeGo Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// 工具间需要用到彼此的上下文的时候，可以参考此次
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
	"github.com/cloudwego/eino/compose"

	"github.com/cloudwego/eino-examples/adk/common/model"
	"github.com/cloudwego/eino-examples/adk/common/prints"
)

func main() {
	ctx := context.Background()

	toolA, err := utils.InferTool("tool_a", "set user name", toolAFn)
	if err != nil {
		log.Fatalf("InferTool failed, err: %v", err)
	}

	toolB, err := utils.InferTool("tool_b", "set user age", toolBFn)
	if err != nil {
		log.Fatalf("InferTool failed, err: %v", err)
	}

	a, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        "ChatModelAgent",
		Description: "A chat model agent",
		Instruction: "You are a chat model agent, call tool_a first, call tool_b secondly",
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				Tools: []tool.BaseTool{
					toolA,
					toolB,
				},
			},
		},
		Model: model.NewChatModel(),
	})
	if err != nil {
		log.Fatalf("NewChatModelAgent failed, err: %v", err)
	}

	r := adk.NewRunner(ctx, adk.RunnerConfig{
		Agent: a,
	})

	iter := r.Query(ctx, "my name is Alice, my age is 18")
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}

		prints.Event(event)
	}
}

type ToolAInput struct {
	Name string `json:"input" jsonschema:"description=user's name'"`
}

// toolAFn 设置了一个session，可以实现一个数据的共享
func toolAFn(ctx context.Context, in *ToolAInput) (string, error) {
	// 这里设置了一个session value，key 为 "user-name"，value 为 in.Name
	adk.AddSessionValue(ctx, "user-name", in.Name)
	return in.Name, nil
}

type ToolBInput struct {
	Age int `json:"input" jsonschema:"description=user's age'"`
}

func toolBFn(ctx context.Context, in *ToolBInput) (string, error) {
	adk.AddSessionValue(ctx, "user-age", in.Age)
	// 这里从session中获取了 "user-name" 这个key对应的值
	userName, _ := adk.GetSessionValue(ctx, "user-name")
	return fmt.Sprintf("user-name: %v, user-age: %v", userName, in.Age), nil
}
