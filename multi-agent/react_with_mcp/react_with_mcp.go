package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"multi-agent/internal/gptr"
	"multi-agent/internal/logs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/cloudwego/eino/callbacks"
	"github.com/cloudwego/eino/flow/agent"

	"github.com/cloudwego/eino-ext/components/model/ark"
	pmcp "github.com/cloudwego/eino-ext/components/prompt/mcp"
	tmcp "github.com/cloudwego/eino-ext/components/tool/mcp"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/flow/agent/react"
	"github.com/cloudwego/eino/schema"

	"github.com/mark3labs/mcp-go/client"
	mcpgo "github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// 启动mcp server，包含tools和prompt
	startMCPServer()
	time.Sleep(1 * time.Second)

	ctx := context.Background()

	// 获取到客户端
	cli, err := getMCPToolClient(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// 获取mcp的server端的工具
	mcpTools, err := tmcp.GetTools(ctx, &tmcp.Config{Cli: cli})
	if err != nil {
		log.Fatal(err)
	}

	// 获取 Prompt 模板
	mcpPrompt, err := pmcp.NewPromptTemplate(ctx, &pmcp.Config{Cli: cli, Name: "test"})
	if err != nil {
		log.Fatal(err)
	}

	// 初始化AI大模型，function call
	chatModel, err := ark.NewChatModel(ctx, &ark.ChatModelConfig{
		Model:       "ep-20250118131322-zb8w6",
		APIKey:      "0a61c0da-3f97-4b8b-959c-a61d2b000044",
		Temperature: gptr.Of(float32(0.7)),
	})
	if err != nil {
		logs.Errorf("NewChatModel failed, err=%v", err)
		return
	}

	// 使用react.Agent实现循环调用工具链
	reactAgent, err := react.NewAgent(ctx, &react.AgentConfig{
		ToolCallingModel: chatModel,
		ToolsConfig: compose.ToolsNodeConfig{
			Tools: mcpTools,
		},
		// 可作一些系统提示
		// MessageModifier: react.NewPersonaModifier(systemPrompt),
		MaxStep:            25,                    // 设置最大步骤数，允许多次工具调用
		ToolReturnDirectly: map[string]struct{}{}, // 设置直接返回结果的工具
	})

	if err != nil {
		logs.Errorf("react.NewAgent failed, err=%v", err)
		return
	}

	// 格式化 Prompt
	// 依据语句调用计算工具
	// result, err := mcpPrompt.Format(ctx, map[string]interface{}{"persona": "计算 5 + 3，并显示出当前项目的目录结构"})
	// 依据语句调用获取目录结构工具
	// result, err := mcpPrompt.Format(ctx, map[string]interface{}{"persona": "当前的项目文件目录结构是怎样的"})
	result, err := mcpPrompt.Format(ctx, map[string]interface{}{"persona": "生成两个随机数，然后做加法计算"})
	if err != nil {
		log.Fatal(err)
	}

	// 运行示例，使用格式化后的 Prompt 作为用户输入
	// 使用Stream方法可以获取实时的响应流
	sr, err := reactAgent.Stream(ctx, []*schema.Message{
		{
			Role:    schema.User,
			Content: messagesToString(result),
		},
	}, agent.WithComposeOptions(compose.WithCallbacks(&LoggerCallback{})))

	if err != nil {
		logs.Errorf("reactAgent.Stream failed, err=%v", err)
		return
	}
	defer sr.Close()
	// 输出流式结果
	logs.Infof("\n\n===== start streaming =====\n\n")

	// 循环接收流式响应
	for {
		msg, err := sr.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				// finish
				break
			}
			// error
			logs.Infof("failed to recv: %v", err)
			return
		}
		if usage := msg.ResponseMeta.Usage; usage != nil {
			logs.Infof("prompt token: %d, completion token: %d, total token: %d\n", usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
		}

		// 打字机打印
		logs.Tokenf("%v", msg.Content)
	}

	logs.Infof("\n\n===== finished =====\n")
}

func getMCPToolClient(ctx context.Context) (client.MCPClient, error) {
	cli, err := client.NewSSEMCPClient("http://localhost:12345/sse")
	if err != nil {
		return nil, err
	}
	err = cli.Start(ctx)
	if err != nil {
		return nil, err
	}

	initRequest := mcpgo.InitializeRequest{}
	initRequest.Params.ProtocolVersion = mcpgo.LATEST_PROTOCOL_VERSION
	initRequest.Params.ClientInfo = mcpgo.Implementation{
		Name:    "example-client",
		Version: "1.0.0",
	}

	_, err = cli.Initialize(ctx, initRequest)
	if err != nil {
		return nil, err
	}

	return cli, nil
}

func startMCPServer() {
	svr := server.NewMCPServer("demo", mcpgo.LATEST_PROTOCOL_VERSION)
	// 定义回调函数类型
	type ToolCallback func(ctx context.Context, request mcpgo.CallToolRequest, result interface{})

	// 定义一个全局的回调函数
	var toolCallback ToolCallback = func(ctx context.Context, request mcpgo.CallToolRequest, result interface{}) {
		// 这里可以添加你想要执行的回调逻辑
		log.Printf("Callback executed for tool %s with result: %v", request.Params.Name, result)
	}
	// 添加新的工具：计算
	svr.AddTool(mcpgo.NewTool("calculate",
		mcpgo.WithDescription("Perform basic arithmetic operations"),
		// WithString和WithNumber都是用来做约束的，a + b
		mcpgo.WithString("operation",
			mcpgo.Required(),
			mcpgo.Description("The operation to perform (add, subtract, multiply, divide)"),
			mcpgo.Enum("add", "subtract", "multiply", "divide"),
		),
		mcpgo.WithNumber("x",
			mcpgo.Required(),
			mcpgo.Description("First number"),
		),
		mcpgo.WithNumber("y",
			mcpgo.Required(),
			mcpgo.Description("Second number"),
		),
	), func(ctx context.Context, request mcpgo.CallToolRequest) (*mcpgo.CallToolResult, error) {
		op, err := request.RequireString("operation")
		if err != nil {
			return mcpgo.NewToolResultError(fmt.Sprintf("Failed to get operation: %v", err)), nil
		}
		x, err := request.RequireFloat("x")
		if err != nil {
			return mcpgo.NewToolResultError(fmt.Sprintf("Failed to get x: %v", err)), nil
		}
		y, err := request.RequireFloat("y")
		if err != nil {
			return mcpgo.NewToolResultError(fmt.Sprintf("Failed to get y: %v", err)), nil
		}

		var result float64
		switch op {
		case "add":
			result = x + y
		case "subtract":
			result = x - y
		case "multiply":
			result = x * y
		case "divide":
			if y == 0 {
				return mcpgo.NewToolResultError("Cannot divide by zero"), nil
			}
			result = x / y
		}
		// 调用回调，可用于测试
		toolCallback(ctx, request, result)
		log.Printf("Calculated result: %.2f", result)
		return mcpgo.NewToolResultText(fmt.Sprintf("%.2f", result)), nil
	})
	// 添加新的工具：获取当前文件目录结构
	svr.AddTool(mcpgo.NewTool("getDirectoryStructure",
		mcpgo.WithDescription("Get the current directory structure"),
	), func(ctx context.Context, request mcpgo.CallToolRequest) (*mcpgo.CallToolResult, error) {
		var dirStructure string
		err := filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			// 修正目录层级计算方式
			parts := strings.Split(filepath.ToSlash(path), "/")
			level := len(parts) - 1
			indent := ""
			for i := 0; i < level; i++ {
				indent += "  "
			}
			if info.IsDir() {
				dirStructure += fmt.Sprintf("%s%s/\n", indent, info.Name())
			} else {
				dirStructure += fmt.Sprintf("%s%s\n", indent, info.Name())
			}
			return nil
		})
		if err != nil {
			return mcpgo.NewToolResultError(fmt.Sprintf("Failed to get directory structure: %v", err)), nil
		}
		return mcpgo.NewToolResultText(dirStructure), nil
	})
	// 新增工具：生成两个随机数
	svr.AddTool(mcpgo.NewTool("generateRandomNumbers",
		mcpgo.WithDescription("Generate two random numbers"),
	), func(ctx context.Context, request mcpgo.CallToolRequest) (*mcpgo.CallToolResult, error) {
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		num1 := r.Float64()
		num2 := r.Float64()
		result := fmt.Sprintf("Random numbers: %.2f, %.2f", num1, num2)
		// 调用自定义回调，可用于测试
		toolCallback(ctx, request, result)
		return mcpgo.NewToolResultText(result), nil
	})
	// 添加 Prompt 模板
	svr.AddPrompt(mcpgo.Prompt{
		Name: "test",
	}, func(ctx context.Context, request mcpgo.GetPromptRequest) (*mcpgo.GetPromptResult, error) {
		return &mcpgo.GetPromptResult{
			Messages: []mcpgo.PromptMessage{
				mcpgo.NewPromptMessage(mcpgo.RoleUser, mcpgo.NewTextContent(request.Params.Arguments["persona"])),
				/*mcpgo.NewPromptMessage(mcpgo.RoleUser, mcpgo.NewImageContent("https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg", "image/jpeg")),
				mcpgo.NewPromptMessage(mcpgo.RoleUser, mcpgo.NewEmbeddedResource(mcpgo.TextResourceContents{
					URI:      "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
					MIMEType: "image/jpeg",
					Text:     "resource",
				})),*/
			},
		}, nil
	})
	// 启动 SSE 服务器
	go func() {
		defer func() {
			e := recover()
			if e != nil {
				fmt.Println(e)
			}
		}()

		err := server.NewSSEServer(svr, server.WithBaseURL("http://localhost:12345")).Start("localhost:12345")

		if err != nil {
			log.Fatal(err)
		}
	}()
}

// 将消息切片转换为字符串，便于传给prompt，进而传给agent
func messagesToString(messages []*schema.Message) string {
	var contents []string
	for _, msg := range messages {
		contents = append(contents, msg.Content)
	}
	return strings.Join(contents, "\n")
}

// LoggerCallback 定义回调结构体
type LoggerCallback struct {
	callbacks.HandlerBuilder            // 可以用 callbacks.HandlerBuilder 来辅助实现 callback
	mu                       sync.Mutex // 添加互斥锁
}

func (cb *LoggerCallback) OnStart(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	inputStr, _ := json.MarshalIndent(input, "", "  ") // nolint: byte_s_returned_err_check
	fmt.Printf("=========[OnStart]========= %s\n", string(inputStr))
	return ctx
}

func (cb *LoggerCallback) OnEnd(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	fmt.Println("=========[OnEnd]=========")
	outputStr, _ := json.MarshalIndent(output, "", "  ") // nolint: byte_s_returned_err_check
	fmt.Println(string(outputStr))
	return ctx
}

func (cb *LoggerCallback) OnError(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	fmt.Println("=========[OnError]=========")
	fmt.Println(err)
	return ctx
}

func (cb *LoggerCallback) OnEndWithStreamOutput(ctx context.Context, info *callbacks.RunInfo,
	output *schema.StreamReader[callbacks.CallbackOutput]) context.Context {

	var graphInfoName = react.GraphName

	go func() {
		defer func() {
			if err := recover(); err != nil {
				fmt.Println("[OnEndStream] panic err:", err)
			}
		}()

		defer output.Close() // remember to close the stream in defer

		cb.mu.Lock()
		defer cb.mu.Unlock()

		fmt.Println("=========[OnEndStream]=========")
		for {
			frame, err := output.Recv()
			if errors.Is(err, io.EOF) {
				// finish
				break
			}
			if err != nil {
				fmt.Printf("internal error: %s\n", err)
				return
			}

			s, err := json.Marshal(frame)
			if err != nil {
				fmt.Printf("internal error: %s\n", err)
				return
			}

			if info.Name == graphInfoName { // 仅打印 graph 的输出, 否则每个 stream 节点的输出都会打印一遍
				fmt.Printf("%s: %s\n", info.Name, string(s))
			}
		}

	}()
	return ctx
}

func (cb *LoggerCallback) OnStartWithStreamInput(ctx context.Context, info *callbacks.RunInfo,
	input *schema.StreamReader[callbacks.CallbackInput]) context.Context {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	defer input.Close()
	return ctx
}
