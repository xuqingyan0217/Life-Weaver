package graphproc

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"github.com/cloudwego/eino/adk"
)

// RunAgentOnceWithUsageStreaming 在消费事件流的同时进行增量打印（使用 StreamPrinter），并提取/估算 token 用量。
// 注意：为避免并发输出混流，StreamPrinter 会在一次完整打印期间持锁。
func RunAgentOnceWithUsageStreaming(ctx context.Context, a adk.Agent, input string, printer *StreamPrinter, nodeID string) (string, *TokenUsage, error) {
	r := adk.NewRunner(ctx, adk.RunnerConfig{
		Agent:           a,
		EnableStreaming: true,
	})
	iter := r.Query(ctx, input)

	var last string
	var okMsg bool
	var firstErr error
	var usage *TokenUsage

	var drainedNonEmpty bool
	var eventIdx int
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}
		if event.Err != nil {
			if firstErr == nil {
				firstErr = event.Err
			}
			if printer != nil && printer.IsVerbose() {
				fmt.Printf("[event idx=%d node=%s error=%v]\n", eventIdx, nodeID, event.Err)
			}
			continue
		}
		if printer != nil && printer.IsVerbose() {
			debugPrintEventMeta(nodeID, eventIdx, event)
		}
		if u := extractUsageFromEvent(event); u != nil {
			usage = u
		}
		if event.Output != nil && event.Output.MessageOutput != nil {
			// 优先读取 MessageStream 以进行流式打印
			if s := event.Output.MessageOutput.MessageStream; s != nil && printer != nil {
				if printer.IsVerbose() {
					fmt.Printf("[event idx=%d node=%s output=message_stream open]\n", eventIdx, nodeID)
				}
				out, err := DrainMessageStream(printer, nodeID, s)
				if err == nil {
					if out != "" {
						drainedNonEmpty = true
						last = out
						okMsg = true
					}
				} else if firstErr == nil {
					firstErr = err
				}
			}
			// 若没有流或额外的最终消息，则以最终消息为准，并进行一次性打印
			if m := event.Output.MessageOutput.Message; m != nil && m.Content != "" {
				if printer != nil && !drainedNonEmpty {
					// 流中没有内容时，进行一次性内容打印（无前缀）
					printer.Begin(nodeID)
					// 若开启调试，打印最终消息的角色信息
					if printer.IsVerbose() {
						role := extractRoleFromMessage(m)
						printer.PrintAnswerChunk(fmt.Sprintf("[final role=%s] ", role))
					}
					printer.PrintAnswerChunk(m.Content)
					printer.End()
				}
				last = m.Content
				okMsg = true
			}
		}
		eventIdx++
	}

	if okMsg {
		return last, usage, nil
	}
	return "", usage, firstErr
}

// extractUsageFromEvent 通过反射从消息中提取ResponseMeta.Usage中的token使用情况
func extractUsageFromEvent(event *adk.AgentEvent) *TokenUsage {
	if event == nil || event.Output == nil || event.Output.MessageOutput == nil || event.Output.MessageOutput.Message == nil {
		return nil
	}
	msg := event.Output.MessageOutput.Message
	v := reflect.ValueOf(msg)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if !v.IsValid() {
		return nil
	}
	// 寻找 ResponseMeta 字段
	meta := v.FieldByName("ResponseMeta")
	if !meta.IsValid() || (meta.Kind() == reflect.Ptr && meta.IsNil()) {
		return nil
	}
	if meta.Kind() == reflect.Ptr {
		meta = meta.Elem()
	}
	// 寻找 Usage 字段
	u := meta.FieldByName("Usage")
	if !u.IsValid() || (u.Kind() == reflect.Ptr && u.IsNil()) {
		return nil
	}
	if u.Kind() == reflect.Ptr {
		u = u.Elem()
	}
	// 读取 PromptTokens / CompletionTokens / TotalTokens
	pt := u.FieldByName("PromptTokens")
	ct := u.FieldByName("CompletionTokens")
	tt := u.FieldByName("TotalTokens")
	if !pt.IsValid() || !ct.IsValid() || !tt.IsValid() {
		return nil
	}
	tu := &TokenUsage{}
	// 兼容 int32/uint32/int
	if pt.CanInt() {
		tu.PromptTokens = int(pt.Int())
	} else if pt.CanUint() {
		tu.PromptTokens = int(pt.Uint())
	}
	if ct.CanInt() {
		tu.CompletionTokens = int(ct.Int())
	} else if ct.CanUint() {
		tu.CompletionTokens = int(ct.Uint())
	}
	if tt.CanInt() {
		tu.TotalTokens = int(tt.Int())
	} else if tt.CanUint() {
		tu.TotalTokens = int(tt.Uint())
	}
	// 若全部为0，认为无效
	if tu.PromptTokens == 0 && tu.CompletionTokens == 0 && tu.TotalTokens == 0 {
		return nil
	}
	return tu
}

// extractRoleFromMessage 通过反射获取消息的角色（Role），若不存在则返回空字符串
func extractRoleFromMessage(msg any) string {
	if msg == nil {
		return ""
	}
	v := reflect.ValueOf(msg)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if !v.IsValid() {
		return ""
	}
	f := v.FieldByName("Role")
	if f.IsValid() && f.Kind() == reflect.String {
		return f.String()
	}
	return ""
}

// runRouterWithUsage 执行监督者路由，同时提取/估算token使用情况
func runRouterWithUsage(ctx context.Context, a adk.Agent, input string) (used string, output string, usage *TokenUsage, err error) {
	r := adk.NewRunner(ctx, adk.RunnerConfig{
		Agent:           a,
		EnableStreaming: true,
	})
	iter := r.Query(ctx, input)

	var last string
	var dest string
	var firstErr error
	var u *TokenUsage
	var eventIdx int
	for {
		event, ok := iter.Next()
		if !ok {
			break
		}
		if event.Err != nil {
			if firstErr == nil {
				firstErr = event.Err
			}
			// 不中断，继续尽力收集usage与最后输出
			fmt.Printf("[router event idx=%d error=%v]\n", eventIdx, event.Err)
			continue
		}
		if tu := extractUsageFromEvent(event); tu != nil {
			u = tu
		}
		if event.Action != nil && event.Action.TransferToAgent != nil {
			dest = event.Action.TransferToAgent.DestAgentName
			fmt.Printf("[router event idx=%d transfer to=%s]\n", eventIdx, dest)
		}
		if event.Output != nil && event.Output.MessageOutput != nil {
			if m := event.Output.MessageOutput.Message; m != nil {
				last = m.Content
				fmt.Printf("[router event idx=%d final_message len=%d]\n", eventIdx, len(last))
			}
		}
		eventIdx++
	}

	// 依据 transfer 事件确定使用的子代理
	if dest != "" {
		if strings.Contains(strings.ToLower(dest), "vision") {
			used = "vision"
		} else {
			used = "text"
		}
		return used, last, u, firstErr
	}

	return used, last, u, firstErr
}

// debugPrintEventMeta 打印事件级别的详细内容（仅在 verbose 下触发）
func debugPrintEventMeta(nodeID string, idx int, event *adk.AgentEvent) {
	if event == nil {
		return
	}
	hasAction := event.Action != nil
	hasOutput := event.Output != nil
	fmt.Printf("[event idx=%d node=%s has_action=%t has_output=%t]\n", idx, nodeID, hasAction, hasOutput)
	if hasAction {
		if event.Action.TransferToAgent != nil {
			fmt.Printf("  - action: transfer -> %s\n", event.Action.TransferToAgent.DestAgentName)
		}
		if event.Action.Interrupted != nil {
			fmt.Printf("  - action: interrupted\n")
		}
		if event.Action.Exit {
			fmt.Printf("  - action: exit\n")
		}
	}
	if hasOutput && event.Output.MessageOutput != nil {
		if ms := event.Output.MessageOutput.MessageStream; ms != nil {
			fmt.Printf("  - output: message_stream (open)\n")
		}
		if m := event.Output.MessageOutput.Message; m != nil {
			role := extractRoleFromMessage(m)
			fmt.Printf("  - output: final_message role=%s len=%d\n", role, len(m.Content))
		}
	}
}
