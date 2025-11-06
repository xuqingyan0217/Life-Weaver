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

package agent

import (
	"context"
	"fmt"
	"strings"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/adk/prebuilt/planexecute"
	"github.com/cloudwego/eino/components/prompt"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/schema"

	"github.com/cloudwego/eino-examples/adk/common/model"
	"github.com/cloudwego/eino-examples/adk/multiagent/plan-execute-replan/tools"
)

// 本文件实现了"计划-执行-重新计划"多智能体系统中的三个核心智能体：
// 1. 计划者(Planner)：负责分析用户请求并创建初始计划
// 2. 执行者(Executor)：负责执行计划中的具体步骤
// 3. 重新计划者(Replanner)：负责在需要时调整计划

// NewPlanner 创建计划者智能体
// 计划者负责接收用户请求，分析需求，并创建一个结构化的执行计划
func NewPlanner(ctx context.Context) (adk.Agent, error) {
	// 使用预构建的计划者组件，配置工具调用型聊天模型
	return planexecute.NewPlanner(ctx, &planexecute.PlannerConfig{
		ToolCallingChatModel: model.NewChatModel(), // 配置聊天模型，用于生成计划
	})
}

// executorPrompt 定义执行者智能体的提示词模板
// 包含系统消息和用户消息模板，用于指导执行者如何执行任务
var executorPrompt = prompt.FromMessages(schema.FString,
	// 系统消息：定义执行者的角色和行为准则
	schema.SystemMessage(`You are a diligent and meticulous travel research executor, Follow the given plan and execute your tasks carefully and thoroughly.
Execute each planning step by using available tools.
For weather queries, use get_weather tool.
For flight searches, use search_flights tool.
For hotel searches, use search_hotels tool.
For attraction research, use search_attractions tool.
For user's clarification, use ask_for_clarification tool. In summary, repeat the questions and results to confirm with the user, try to avoid disturbing users'
Provide detailed results for each task.
Cloud Call multiple tools to get the final result.`),
	// 用户消息模板：定义执行任务的上下文信息
	schema.UserMessage(`## OBJECTIVE
{input}
## Given the following plan:
{plan}
## COMPLETED STEPS & RESULTS
{executed_steps}
## Your task is to execute the first step, which is: 
{step}`))

// formatInput 格式化用户输入消息
// 从消息数组中提取第一条消息的内容作为用户输入
func formatInput(in []adk.Message) string {
	return in[0].Content
}

// formatExecutedSteps 格式化已执行的步骤
// 将已执行的步骤和结果格式化为字符串，用于提示词中的上下文信息
func formatExecutedSteps(in []planexecute.ExecutedStep) string {
	var sb strings.Builder
	for idx, m := range in {
		// 格式化每个步骤为：序号. 步骤描述\n  结果内容\n\n
		sb.WriteString(fmt.Sprintf("## %d. Step: %v\n  Result: %v\n\n", idx+1, m.Step, m.Result))
	}
	return sb.String()
}

// NewExecutor 创建执行者智能体
// 执行者负责按照计划逐步执行任务，使用各种工具完成具体操作
func NewExecutor(ctx context.Context) (adk.Agent, error) {
	// 获取执行者需要的旅行相关工具
	travelTools, err := tools.GetAllTravelTools(ctx)
	if err != nil {
		return nil, err
	}

	// 使用预构建的执行者组件，配置模型、工具和输入生成函数
	return planexecute.NewExecutor(ctx, &planexecute.ExecutorConfig{
		Model: model.NewChatModel(), // 配置聊天模型，用于执行任务
		// 配置工具集合，包含天气查询、航班搜索、酒店搜索、景点搜索等工具
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				Tools: travelTools,
			},
		},
		// GenInputFn 是关键函数，用于生成执行者的输入
		// 它将执行上下文(ExecutionContext)转换为模型可理解的消息格式
		GenInputFn: func(ctx context.Context, in *planexecute.ExecutionContext) ([]adk.Message, error) {
			// 将计划转换为JSON字符串，便于在提示词中使用
			planContent, err_ := in.Plan.MarshalJSON()
			if err_ != nil {
				return nil, err_
			}

			// 获取当前要执行的第一步
			firstStep := in.Plan.FirstStep()

			// 使用预定义的提示词模板，填充上下文信息
			msgs, err_ := executorPrompt.Format(ctx, map[string]any{
				"input":          formatInput(in.UserInput),             // 用户原始输入
				"plan":           string(planContent),                   // 完整计划(JSON格式)
				"executed_steps": formatExecutedSteps(in.ExecutedSteps), // 已执行步骤和结果
				"step":           firstStep,                             // 当前要执行的步骤
			})
			if err_ != nil {
				return nil, err_
			}

			return msgs, nil
		},
	})
}

// NewReplanAgent 创建重新计划者智能体
// 重新计划者负责在执行过程中遇到问题或需要调整时，评估执行状态并调整计划
func NewReplanAgent(ctx context.Context) (adk.Agent, error) {
	// 使用预构建的重新计划者组件，配置聊天模型
	return planexecute.NewReplanner(ctx, &planexecute.ReplannerConfig{
		ChatModel: model.NewChatModel(), // 配置聊天模型，用于评估和调整计划
	})
}
