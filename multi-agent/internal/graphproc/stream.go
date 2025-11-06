package graphproc

import (
    "fmt"
    "io"
    "os"
    "strings"
    "sync"
    "reflect"

    "github.com/cloudwego/eino/schema"
)

// StreamPrinter 提供并发安全的控制台流式输出，避免多个节点同时写 stdout 造成混流
type StreamPrinter struct {
    mu sync.Mutex
    // 每行最大字符数，达到后自动换行；参考 prints.util.go 的行为
    maxPerLine int
    // 是否启用详细调试输出（打印角色、事件等元信息）
    verbose bool
    // 输出目标（默认 stdout），用于HTTP响应抓取或自定义日志
    w io.Writer
}

func NewStreamPrinter() *StreamPrinter {
    return &StreamPrinter{maxPerLine: 120, verbose: false, w: os.Stdout}
}

// EnableVerbose 启用或关闭详细调试输出
func (p *StreamPrinter) EnableVerbose(v bool) { p.verbose = v }

// IsVerbose 返回是否开启详细调试输出
func (p *StreamPrinter) IsVerbose() bool { return p.verbose }

// SetWriter 设置输出目标（默认 stdout）
func (p *StreamPrinter) SetWriter(w io.Writer) { if w != nil { p.w = w } }

// Begin 在输出节点内容前加上边界与前缀，并持锁，保证该节点的完整输出不被其他节点打断
func (p *StreamPrinter) Begin(nodeID string) {
    p.mu.Lock()
    fmt.Fprintf(p.w, "\n=== node=%s ===\n", nodeID)
}

// PrintAnswerChunk 打印增量文本内容，带自动换行控制
func (p *StreamPrinter) PrintAnswerChunk(chunk string) {
	if chunk == "" {
		return
	}
	// 简单的行宽控制：遇到换行直接复位；否则按 maxPerLine 断行
	// 为了兼容中文/ASCII混排，这里按字节长度近似处理（与参考实现一致）
	var count int
	for _, part := range strings.Split(chunk, "\n") {
        if part == "" {
            fmt.Fprintf(p.w, "\n")
            count = 0
            continue
        }
        count += len(part)
        fmt.Fprintf(p.w, "%s", part)
        if count >= p.maxPerLine {
            fmt.Fprintf(p.w, "\n")
            count = 0
        }
    }
}

// （已简化）不打印任何工具或路由相关内容

// End 结束该节点的输出并解锁
func (p *StreamPrinter) End() {
    fmt.Fprintf(p.w, "\n\n")
    p.mu.Unlock()
}

// 已移除工具消息拼接逻辑，专注于内容流打印

// DrainMessageStream 读取消息流并通过 printer 输出（仅内容与工具调用）
// 返回完整的拼接文本，便于作为 last 输出记录
// 为了兼容不同版本的 ADK，这里不直接依赖具体的 MessageStream 类型名，
// 而是使用一个仅包含 Recv 方法的接口，返回 *schema.Message。
type messageStream interface {
	Recv() (*schema.Message, error)
}

func DrainMessageStream(printer *StreamPrinter, nodeID string, s messageStream) (string, error) {
	if s == nil {
		return "", nil
	}
	printer.Begin(nodeID)
	charNumOfOneRow := 0
	maxCharNumOfOneRow := printer.maxPerLine

	var builder strings.Builder

	for {
		chunk, err := s.Recv()
		if err != nil {
			if err == io.EOF {
				break
			}
			// 打印错误并结束此节点
            fmt.Fprintf(printer.w, "error: %v", err)
            printer.End()
            return builder.String(), err
        }

        // 打印任何角色的非空内容（包括 assistant 与 tool）
        if chunk.Content != "" {
            if printer.verbose {
                // 打印角色前缀，便于观测是否由 assistant/tool 产生
                // 注意：schema.Message 一般包含 Role 字段
                fmt.Fprintf(printer.w, "[stream role=%v] ", chunk.Role)
            }
            charNumOfOneRow += len(chunk.Content)
            if strings.Contains(chunk.Content, "\n") {
                charNumOfOneRow = 0
            } else if charNumOfOneRow >= maxCharNumOfOneRow {
                fmt.Fprintf(printer.w, "\n")
                charNumOfOneRow = 0
            }
            fmt.Fprintf(printer.w, "%v", chunk.Content)
            builder.WriteString(chunk.Content)
        }
        // 打印工具调用摘要（仅在 verbose 下）
        if printer.verbose {
            printToolCallsSummaryTo(printer.w, chunk)
        }
    }

	printer.End()
	return builder.String(), nil
}

// printToolCallsSummary 尝试打印工具调用摘要（名称与参数），若不可用则忽略
func printToolCallsSummaryTo(w io.Writer, msg *schema.Message) {
    if msg == nil {
        return
    }
    // schema.Message.ToolCalls 可能不存在，不直接访问，避免编译错误；使用反射增强兼容性
    // 这里做一个 best-effort 的打印：若存在 ToolCalls 字段且为切片，则打印长度
    // 并尝试打印第一个工具的 Name/Arguments（若存在）
    v := reflect.ValueOf(msg)
    if v.Kind() == reflect.Ptr {
        v = v.Elem()
    }
    if !v.IsValid() {
        return
    }
    tc := v.FieldByName("ToolCalls")
    if !tc.IsValid() || tc.Kind() != reflect.Slice {
        return
    }
    n := tc.Len()
    if n == 0 {
        return
    }
    fmt.Fprintf(w, "\n[stream tool_calls=%d] ", n)
    // 尝试打印第一个工具调用的名称与参数（若字段存在）
    first := tc.Index(0)
    if first.Kind() == reflect.Ptr {
        first = first.Elem()
    }
    if first.IsValid() && first.Kind() == reflect.Struct {
        name := first.FieldByName("Name")
        args := first.FieldByName("Arguments")
        if name.IsValid() && name.Kind() == reflect.String {
            fmt.Fprintf(w, "name=%s ", name.String())
        }
        // Arguments 可能为字符串或 map；尝试以字符串打印
        if args.IsValid() {
            if args.Kind() == reflect.String {
                fmt.Fprintf(w, "args=%s ", args.String())
            } else {
                // 其他类型，打印类型信息
                fmt.Fprintf(w, "args_type=%s ", args.Kind().String())
            }
        }
    }
}
