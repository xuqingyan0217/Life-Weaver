package graphproc

// NodeResult holds processing output per node
type NodeResult struct {
    Kind   string `json:"kind"`
    Output string `json:"output"`
    Error  string `json:"error,omitempty"`
    // 记录每个节点的输入/输出/总token，用于费用与优化分析
    PromptTokens     int `json:"prompt_tokens,omitempty"`
    CompletionTokens int `json:"completion_tokens,omitempty"`
    TotalTokens      int `json:"total_tokens,omitempty"`
    // 监督者路由阶段的token（每节点）
    RouterPromptTokens     int `json:"router_prompt_tokens,omitempty"`
    RouterCompletionTokens int `json:"router_completion_tokens,omitempty"`
    RouterTotalTokens      int `json:"router_total_tokens,omitempty"`
}

// FinalResult is the printed output schema
type FinalResult struct {
    Results map[string]NodeResult `json:"results"`
    // 保留结构占位，当前不再使用 summary 阶段
    UsageSummary UsageSummary     `json:"usage_summary,omitempty"`
}

// TokenUsage 用于在执行阶段从模型响应中提取token使用情况
type TokenUsage struct {
    PromptTokens     int
    CompletionTokens int
    TotalTokens      int
}

// UsageSummary 汇总整个执行过程的token用量
type UsageSummary struct {
    // 汇总各节点的监督者路由阶段token
    SupervisorPromptTokens     int `json:"supervisor_prompt_tokens"`
    SupervisorCompletionTokens int `json:"supervisor_completion_tokens"`
    SupervisorTotalTokens      int `json:"supervisor_total_tokens"`

    // 汇总各节点的子代理阶段token（text/vision）
    SubAgentPromptTokens     int `json:"subagent_prompt_tokens"`
    SubAgentCompletionTokens int `json:"subagent_completion_tokens"`
    SubAgentTotalTokens      int `json:"subagent_total_tokens"`

    // 全过程总计
    TotalPromptTokens     int `json:"total_prompt_tokens"`
    TotalCompletionTokens int `json:"total_completion_tokens"`
    TotalTokens           int `json:"total_tokens"`
}