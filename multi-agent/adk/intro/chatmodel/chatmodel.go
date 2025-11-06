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

package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/compose"

	"github.com/cloudwego/eino-examples/adk/common/prints"
	"github.com/cloudwego/eino-examples/adk/intro/chatmodel/subagents"
)

// 注意，这里我们进行中断处理时，没有使用到graph的state来存储获取工具节点信息进行更新
// 而是通过tool.Option来实现一个更加直接的更新，本质是一样的
// 相同的是我们都使用到了checkpoint
func main() {
	ctx := context.Background()
	a := subagents.NewBookRecommendAgent()
	runner := adk.NewRunner(ctx, adk.RunnerConfig{
		EnableStreaming: true, // you can disable streaming here
		Agent:           a,
		CheckPointStore: newInMemoryStore(),
	})
	// 也是需要传入一个checkpoint id，整体上和graph是差不多的，注意id要特定，这里程序是一次性的，所以不需要考虑重复
	// 其中这个Query，一般在使用的时候，是配合Resume来使用的，而且传入的input本身也很简单，为string类型
	// 相对的，还有一个Run方法，这个就偏向与传统的调用，input是一个[]message类型
	iter := runner.Query(ctx, "recommend a book to me", adk.WithCheckPointID("1"))
	// for循环里面是会因为澄清工具里面的中断错误而导致失败，然后循环就终止了
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}
		if event.Err != nil {
			log.Fatal(event.Err)
		}

		prints.Event(event)
	}
	// 这里是等待用户输入，然后把用户输入的澄清内容传给Resume
	scanner := bufio.NewScanner(os.Stdin)
	fmt.Print("\nyour input here: ")
	scanner.Scan()
	fmt.Println()
	nInput := scanner.Text()

	// 通过传入WithNewInput选项，把用户输入的澄清内容传给Resume，同时传入checkpoint id，保证能够拿到之前的状态
	// 在原本的graph中，我们是利用了各个节点存储信息到state来实现一个获取并修改，并在后续调用工具时更新这个信息，从而达到一种更新级别的恢复
	// 而这里呢，本质也是同理的，我们通过tool.Option来实现一个更新，这个更新也会在工具二次执行的时候被使用到，也达到更新级别的恢复
	iter, err := runner.Resume(ctx, "1", adk.WithToolOptions([]tool.Option{subagents.WithNewInput(nInput)}))
	if err != nil {
		log.Fatal(err)
	}
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}

		if event.Err != nil {
			log.Fatal(event.Err)
		}

		prints.Event(event)
	}
}

func newInMemoryStore() compose.CheckPointStore {
	return &inMemoryStore{
		mem: map[string][]byte{},
	}
}

type inMemoryStore struct {
	mem map[string][]byte
}

func (i *inMemoryStore) Set(ctx context.Context, key string, value []byte) error {
	i.mem[key] = value
	return nil
}

func (i *inMemoryStore) Get(ctx context.Context, key string) ([]byte, bool, error) {
	v, ok := i.mem[key]
	return v, ok, nil
}
