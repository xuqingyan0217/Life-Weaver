package httpserver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"multi-agent/internal/graphproc"
	"multi-agent/internal/orchestrator"
)

// writerFunc 让函数适配 io.Writer
type writerFunc func(p []byte) (int, error)

func (f writerFunc) Write(p []byte) (int, error) { return f(p) }

const (
	uploadDir  = "uploads"
	serverPort = 8080
)

func ensureDir(path string) error {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return os.MkdirAll(path, 0o755)
	}
	return nil
}

func findFileByID(id string) (string, error) {
	entries, err := os.ReadDir(uploadDir)
	if err != nil {
		return "", err
	}
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, id+".") || name == id {
			return filepath.Join(uploadDir, name), nil
		}
	}
	return "", os.ErrNotExist
}

// deleteByID deletes file for given id if exists
func deleteByID(id string) error {
	path, err := findFileByID(id)
	if err != nil {
		return err
	}
	return os.Remove(path)
}

func contentTypeFromExt(ext string) string {
	if ext == "" {
		return "application/octet-stream"
	}
	ct := mime.TypeByExtension(ext)
	if ct == "" {
		return "application/octet-stream"
	}
	return ct
}

// chooseFileExt chooses a file extension based on content-type header or URL path.
// It strips parameters from content-type (e.g., "; charset=binary").
func chooseFileExt(sourceURL, headerContentType string) string {
	ct := headerContentType
	if i := strings.Index(ct, ";"); i >= 0 {
		ct = strings.TrimSpace(ct[:i])
	}
	// Prefer extension from content-type if available
	if ct != "" {
		if exts, _ := mime.ExtensionsByType(ct); len(exts) > 0 {
			return strings.ToLower(exts[0])
		}
	}
	// Fall back to URL path extension
	if sourceURL != "" {
		if uExt := strings.ToLower(filepath.Ext(sourceURL)); uExt != "" {
			return uExt
		}
	}
	// Final fallback
	return ".bin"
}

// NewServer 构建 Gin 引擎并注册所有路由（图片服务 + 图执行/总结）
func NewServer() *gin.Engine {
	if err := ensureDir(uploadDir); err != nil {
		panic(err)
	}

	// 尝试加载 .env（若不存在则忽略）
	_ = godotenv.Load("./.env")

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"Content-Type"},
		AllowCredentials: true,
	}))

	// Health
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// ===== 图片资源路由 =====
	r.POST("/api/images", func(c *gin.Context) {
		prevId := strings.TrimSpace(c.PostForm("prevId"))
		if prevId != "" {
			_ = deleteByID(prevId)
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file field is required"})
			return
		}
		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot open file"})
			return
		}
		defer src.Close()

		id := uuid.New().String()
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		if ext == "" {
			ext = ".bin"
		}
		dstPath := filepath.Join(uploadDir, id+ext)
		dst, err := os.Create(dstPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot create file"})
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, src); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot save file"})
			return
		}
		url := fmt.Sprintf("http://localhost:%d/api/images/%s", serverPort, id)
		c.JSON(http.StatusOK, gin.H{"id": id, "url": url})
	})

	r.POST("/api/images/url", func(c *gin.Context) {
		var req struct {
			URL    string `json:"url"`
			PrevID string `json:"prevId"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
			return
		}
		srcURL := strings.TrimSpace(req.URL)
		if srcURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
			return
		}
		if pid := strings.TrimSpace(req.PrevID); pid != "" {
			_ = deleteByID(pid)
		}
		resp, err := http.Get(srcURL)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "fetch failed"})
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("upstream status %d", resp.StatusCode)})
			return
		}

		ext := chooseFileExt(srcURL, resp.Header.Get("Content-Type"))
		id := uuid.New().String()
		dstPath := filepath.Join(uploadDir, id+ext)
		dst, err := os.Create(dstPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot create file"})
			return
		}
		defer dst.Close()
		if _, err := io.Copy(dst, resp.Body); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot save file"})
			return
		}
		url := fmt.Sprintf("http://localhost:%d/api/images/%s", serverPort, id)
		c.JSON(http.StatusOK, gin.H{"id": id, "url": url})
	})

	r.GET("/api/images/:id", func(c *gin.Context) {
		id := c.Param("id")
		path, err := findFileByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		ext := strings.ToLower(filepath.Ext(path))
		c.Header("Content-Type", contentTypeFromExt(ext))
		c.File(path)
	})

	r.DELETE("/api/images/:id", func(c *gin.Context) {
		id := c.Param("id")
		path, err := findFileByID(id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if err := os.Remove(path); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot delete"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	})

	// ===== 图执行与总结路由 =====
	// 执行最简代理图：支持两种模式
	// - 非流模式（默认）：仅返回最终 JSON，包含 results，不含 output_text
	// - 流模式（stream=true）：使用 SSE 连续推送增量文本（不再推送最终结果 JSON）
	r.POST("/api/graph/process", func(c *gin.Context) {
		var req struct {
			File    string                   `json:"file"`
			Verbose bool                     `json:"verbose"`
			Stream  bool                     `json:"stream"`
			Graph   orchestrator.SimpleGraph `json:"graph"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
			return
		}
		var sg orchestrator.SimpleGraph
		if strings.TrimSpace(req.File) != "" {
			var err error
			sg, err = graphproc.ReadSimpleGraph(req.File)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("read agent graph: %v", err)})
				return
			}
		} else if len(req.Graph.Nodes) > 0 || len(req.Graph.Edges) > 0 {
			sg = req.Graph
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "either file or graph must be provided"})
			return
		}
		supervisorAgent, textAgent, visionAgent, err := graphproc.BuildAgents()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("build agents: %v", err)})
			return
		}
		ctx := context.Background()
		sp := graphproc.NewStreamPrinter()
		sp.EnableVerbose(req.Verbose)

		results := make(map[string]graphproc.NodeResult, len(sg.Nodes))

		if req.Stream {
			// SSE 流模式：仅推送增量文本，不推送最终结果事件
			c.Header("Content-Type", "text/event-stream; charset=utf-8")
			c.Header("Cache-Control", "no-cache")
			c.Header("Connection", "keep-alive")
			// 将 StreamPrinter 写入包装为 SSE（只发 data 行）
			writeData := func(data []byte) {
				_, _ = c.Writer.Write([]byte("data: "))
				_, _ = c.Writer.Write(data)
				_, _ = c.Writer.Write([]byte("\n\n"))
				c.Writer.Flush()
			}
			// 将 StreamPrinter 的输出封装成 SSE 的 data 事件
			sp.SetWriter(writerFunc(func(p []byte) (int, error) {
				writeData(p)
				return len(p), nil
			}))

			// 执行图，期间将通过 SSE 推送增量内容
			if err := graphproc.ProcessGraph(ctx, sg, supervisorAgent, textAgent, visionAgent, results, sp); err != nil {
				// 推送错误事件（保留 error 事件便于前端处理）
				_, _ = c.Writer.Write([]byte("event: error\n"))
				_, _ = c.Writer.Write([]byte("data: "))
				_, _ = c.Writer.Write([]byte(fmt.Sprintf("process graph: %v", err)))
				_, _ = c.Writer.Write([]byte("\n\n"))
				c.Writer.Flush()
				return
			}
			// 不再推送最终结果 JSON；结束时直接返回，SSE 连接关闭
			return
		}

		// 非流模式：不捕捉 output_text，直接返回 results
		sp.SetWriter(io.Discard)
		if err := graphproc.ProcessGraph(ctx, sg, supervisorAgent, textAgent, visionAgent, results, sp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("process graph: %v", err)})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"nodes":   len(sg.Nodes),
			"edges":   len(sg.Edges),
			"results": results,
		})
	})

	// 从白板导出生成最简代理图；可选择写入文件并返回图内容
	r.POST("/api/graph/summarize", func(c *gin.Context) {
		var req struct {
			File     string                   `json:"file"`
			AgentOut string                   `json:"agent_out"`
			Board    orchestrator.BoardExport `json:"board"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
			return
		}
		var canon orchestrator.Canonical
		if strings.TrimSpace(req.File) != "" {
			var err error
			canon, err = orchestrator.ParseBoardExport(req.File)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("parse board export: %v", err)})
				return
			}
		} else if len(req.Board.Nodes) > 0 || len(req.Board.Edges) > 0 {
			// 将 BoardExport 直接转换为 Canonical（复用 parser.go 的逻辑）
			canon.Board = req.Board.Board
			canon.Nodes = make(map[string]orchestrator.Node, len(req.Board.Nodes))
			for _, n := range req.Board.Nodes {
				var payloadMap map[string]interface{}
				if len(n.Payload) > 0 {
					_ = json.Unmarshal(n.Payload, &payloadMap)
				}
				text := orchestratorExtractText(payloadMap)
				canon.Nodes[n.ID] = orchestrator.Node{
					ID:         n.ID,
					Type:       n.Type,
					Enabled:    n.Enabled,
					Payload:    payloadMap,
					RawPayload: n.Payload,
					Text:       text,
				}
			}
			canon.Edges = make([]orchestrator.Edge, 0, len(req.Board.Edges))
			for _, e := range req.Board.Edges {
				if e.From == "" || e.To == "" {
					continue
				}
				canon.Edges = append(canon.Edges, orchestrator.Edge{From: e.From, To: e.To})
			}
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "either file or board must be provided"})
			return
		}
		ag := orchestrator.BuildSimpleGraph(canon)

		// 可选：写入到文件
		if p := strings.TrimSpace(req.AgentOut); p != "" {
			f, err := os.Create(p)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("create output file: %v", err)})
				return
			}
			defer f.Close()
			enc := json.NewEncoder(f)
			enc.SetIndent("", "  ")
			if err := enc.Encode(ag); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("encode agent graph: %v", err)})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"nodes":  len(ag.Nodes),
			"edges":  len(ag.Edges),
			"graph":  ag,
		})
	})

	return r
}

// orchestratorExtractText 复制 orchestrator.extractText 的核心逻辑以便处理前端直接提交的 BoardExport
func orchestratorExtractText(payload map[string]interface{}) string {
	if payload == nil {
		return ""
	}
	ignore := map[string]struct{}{"src": {}, "imageId": {}, "objectUrl": {}}
	parts := make([]string, 0, len(payload))
	// deterministic order
	keys := make([]string, 0, len(payload))
	for k := range payload {
		keys = append(keys, k)
	}
	// First, explicitly include imageUrl
	if v, ok := payload["imageUrl"]; ok {
		if s, ok := v.(string); ok {
			s = strings.TrimSpace(s)
			if s != "" {
				parts = append(parts, "图片: "+s)
			}
		}
	}
	for _, k := range keys {
		if _, ok := ignore[k]; ok {
			continue
		}
		v := payload[k]
		switch t := v.(type) {
		case string:
			s := strings.TrimSpace(t)
			if s != "" {
				parts = append(parts, s)
			}
		case []interface{}:
			arr := make([]string, 0, len(t))
			for _, item := range t {
				if sv, ok := item.(string); ok {
					sv = strings.TrimSpace(sv)
					if sv != "" {
						arr = append(arr, sv)
					}
				}
			}
			if len(arr) > 0 {
				parts = append(parts, strings.Join(arr, "; "))
			}
		}
	}
	return strings.Join(parts, " \u2022 ")
}
