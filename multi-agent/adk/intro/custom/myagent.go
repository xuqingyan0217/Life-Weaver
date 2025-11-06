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

package custom

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/schema"
)

// MyAgent 实现一个自定义的agent，只需要实现一些相关的方法即可
type MyAgent struct {
}

func (m *MyAgent) Name(ctx context.Context) string {
	return "MyAgent"
}

func (m *MyAgent) Description(ctx context.Context) string {
	return "Description"
}

// Run 实现agent的运行方法，这里简单返回一个hello world，并不再是通过NewChatModelAgent内容实现一个图执行级别的方法了
func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, options ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
	iter, gen := adk.NewAsyncIteratorPair[*adk.AgentEvent]()
	go func() {
		defer func() {
			e := recover()
			if e != nil {
				gen.Send(&adk.AgentEvent{
					Err: fmt.Errorf("recover from panic: %v", e),
				})
			}
			gen.Close()
		}()
		// agent run code
		gen.Send(&adk.AgentEvent{
			Output: &adk.AgentOutput{
				MessageOutput: &adk.MessageVariant{
					IsStreaming: false,
					Message: &schema.Message{
						Role:    schema.Assistant,
						Content: "hello world",
					},
					Role: schema.Assistant,
				},
			},
		})
	}()
	return iter
}
