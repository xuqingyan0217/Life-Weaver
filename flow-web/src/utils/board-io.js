import { resolveDefForInstance } from '../hooks/useBoardPersistence.js'

// 统一清洗 payload，去掉会干扰大模型理解的无关字段
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload ?? null
  const { initials, author, symbol, ...rest } = payload
  return Object.keys(rest).length > 0 ? rest : null
}

// 通过显示名称查找定义（严格模式，不兼容旧键）
function resolveDefByName(name, mergedUserDefs) {
  if (!name || !mergedUserDefs) return null
  const target = String(name).trim()
  for (const [defId, def] of Object.entries(mergedUserDefs)) {
    if (String(def?.name || '').trim() === target) return def
  }
  return null
}

// 构建导出数据：只导出参与有效连线的节点与连线
export function buildExportData(modules, links, boardSize, mergedUserDefs) {
  const enabledIds = new Set(Object.entries(modules).filter(([id, m]) => m.enabled !== false).map(([id]) => id))
  const validEdges = (links || []).filter((l) => enabledIds.has(l.from) && enabledIds.has(l.to))
  const participatingIds = new Set(validEdges.flatMap((l) => [l.from, l.to]))

  const nodes = Object.entries(modules)
    .filter(([id]) => participatingIds.has(id))
    .map(([id, m]) => ({
      id,
      x: m.x, y: m.y, w: m.w, h: m.h, z: m.z || 1,
      // 使用显示名称作为类型
      type: (resolveDefForInstance(id, mergedUserDefs)?.name) || id,
      connectable: m.connectable !== false,
      enabled: m.enabled !== false,
      payload: sanitizePayload(m.payload),
    }))

  const edges = validEdges.map((l) => ({
    from: l.from, to: l.to,
    color: l.color || '#111', intent: l.intent || null, params: l.params || null,
  }))

  const board = { width: boardSize?.w || window.innerWidth, height: boardSize?.h || window.innerHeight }
  return { board, nodes, edges }
}

export function downloadJSON(data, filename = 'board-export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 解析导入数据：根据 mergedUserDefs 恢复渲染器与实例数据
export function parseImportData(data, mergedUserDefs) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : []
  const edges = Array.isArray(data?.edges) ? data.edges : []

  const next = {}
  nodes.forEach((n) => {
    const id = String(n.id || '').trim()
    if (!id) return
    const typeName = String(n.type || '').trim()
    const def = resolveDefByName(typeName, mergedUserDefs)
    if (!def) return
    next[id] = {
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      w: Number(n.w) || (def.defaultSize?.w || 200),
      h: Number(n.h) || (def.defaultSize?.h || 120),
      z: Number(n.z) || 1,
      connectable: (n.connectable !== false) && (def.connectable !== false),
      editable: def.editable !== false,
      enabled: n.enabled !== false,
      arranged: true,
      payload: n.payload ?? null,
      render: def.render,
    }
  })

  const enabledIds = new Set(Object.keys(next).filter((id) => next[id].enabled !== false))
  const nextLinks = edges
    .filter((l) => enabledIds.has(String(l.from)) && enabledIds.has(String(l.to)))
    .map((l) => ({
      from: String(l.from),
      to: String(l.to),
      color: l.color || '#111',
      intent: l.intent ?? null,
      params: l.params ?? null,
    }))

  return { modules: next, links: nextLinks }
}