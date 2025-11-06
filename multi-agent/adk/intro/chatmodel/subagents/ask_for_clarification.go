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

package subagents

import (
	"context"
	"log"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
	"github.com/cloudwego/eino/compose"
)

// 这里是实现一个中断并恢复的关键处，靠的是一个澄清工具，大模型会依据该工具的描述，以及用户输入判断是否应该调用该工具
// 如果调用了该工具，则会触发中断，等待主函数里面触发Resume之后再继续执行
// 这里对于中断需要和前面我们在graph里面接触的区分开，本质差不多，都需要一个checkpoint
type askForClarificationOptions struct {
	// 表示用户输入的澄清内容
	NewInput *string
}

// WithNewInput 是一个选项函数，用于设置 askForClarificationOptions 中的 NewInput 字段
// 该选项函数会在Resume里面传入，用于提前设置用户输入的澄清内容，这样再次调用该工具时，就可以直接获取到澄清的内容了
func WithNewInput(input string) tool.Option {
	return tool.WrapImplSpecificOptFn(func(t *askForClarificationOptions) {
		t.NewInput = &input
	})
}

type AskForClarificationInput struct {
	// 这里面的输出参数，是需要大模型进行自己生成了，用于生成一个问题返回给用户，以准备获取到用户的澄清输入
	// 需要注意的是，当是在Resume后，也即是用于已经输入了澄清内容了，那么此时，这个参数也就不会生成了，工具直接返回用户的澄清内容
	Question string `json:"question" jsonschema:"description=The specific question you want to ask the user to get the missing information"`
}

func NewAskForClarificationTool() tool.InvokableTool {
	t, err := utils.InferOptionableTool(
		"ask_for_clarification",
		"Call this tool when the user's request is ambiguous or lacks the necessary information to proceed. Use it to ask a follow-up question to get the details you need, such as the book's genre, before you can use other tools effectively.",
		func(ctx context.Context, input *AskForClarificationInput, opts ...tool.Option) (output string, err error) {
			o := tool.GetImplSpecificOptions[askForClarificationOptions](nil, opts...)
			if o.NewInput == nil {
				// 这里是触发中断的关键处，当用户输入的内容为空时，触发中断，进而主程序处会停止执行，等待用户输入后Resume
				return "", compose.NewInterruptAndRerunErr(input.Question)
			}
			output = *o.NewInput
			o.NewInput = nil
			return output, nil
		})
	if err != nil {
		log.Fatal(err)
	}
	return t
}
