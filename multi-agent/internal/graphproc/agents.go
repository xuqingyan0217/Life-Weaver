package graphproc

import (
	"context"
	"fmt"

	"multi-agent/model"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/compose"
)

// BuildAgents 构建监督者（仅决策）与子代理（执行）
func BuildAgents() (adk.Agent, adk.Agent, adk.Agent, error) {
	cm := model.NewChatModel()

	textAgent, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
		Name:        "text_agent",
		Description: "负责处理文本内容的代理",
		Instruction: "你是文本分析代理。目的：对节点内容进行理解、提炼要点并进行简短联想。行为准则：1) 当输入中没有任何前驱输出或前驱输入为空时，仅依据本节点负载进行分析；2) 当输入包含前驱的输出时，结合这些前驱内容和当前节点的负载进行文本关联分析；3) 输出中文，精炼（不超过 4 句）；必要时使用要点式（- 开头）；4) 可以使用表情符号。",
		Model:       cm,
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				UnknownToolsHandler: func(ctx context.Context, name, input string) (string, error) {
					return fmt.Sprintf("unknown tool: %s", name), nil
				},
			},
		},
	})
	if err != nil {
		return nil, nil, nil, err
	}

	visionAgent, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
		Name:        "vision_agent",
		Description: "负责处理图像内容的代理",
		Instruction: "你是图像分析代理。目的：对节点负载中的图片链接进行内容描述。行为准则：1) 当输入中没有任何前驱输出或前驱输入为空时，仅依据本节点负载/图片进行分析；2) 当输入包含前驱的输出时，结合这些前驱内容和当前节点的负载进行关联图片分析；3) 若给出 imageUrl，利用工具来获取图片，然后再进行图片分析；4) 输出中文，精炼（不超过 3 句）；可以使用表情符号。",
		Model:       cm,
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				UnknownToolsHandler: func(ctx context.Context, name, input string) (string, error) {
					return fmt.Sprintf("unknown tool: %s", name), nil
				},
			},
		},
	})
	if err != nil {
		return nil, nil, nil, err
	}

	supervisorAgentLLM, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
		Name:        "graph_supervisor",
		Description: "负责在子代理之间进行判断与调用的监督者",
		Instruction: "你是监督者，只负责在 text_agent 与 vision_agent 之间进行路由选择。规则：如果节点负载包含非空 imageUrl，则选择 vision_agent；否则选择text_agent。不要自己完成任务，不要调用工具或输出除 JSON 外的任何内容。仅返回严格 JSON：{\"used\":\"text\"} 或 {\"used\":\"vision\"}。一次只选择一个子代理。",
		Model:       cm,
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				UnknownToolsHandler: func(ctx context.Context, name, input string) (string, error) {
					return fmt.Sprintf("unknown tool: %s", name), nil
				},
			},
		},
	})
	if err != nil {
		return nil, nil, nil, err
	}
	// 返回监督者（仅用于决策）；子代理在执行阶段由我们显式调用
	return supervisorAgentLLM, textAgent, visionAgent, nil
}
