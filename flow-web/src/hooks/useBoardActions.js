import { useRef } from 'react'
import { buildDefaultModules } from '../components/defs/defaultLayout.js'
import { buildExportData, parseImportData, downloadJSON } from '../utils/board-io.js'
import { autoArrangeModules } from '../utils/layout-arrange.js'
import { STORAGE_KEYS, clearBoardCache } from './useBoardPersistence.js'
import { computeVerticalCenterOffset } from '../utils/layout.js'
const API_BASE = 'http://localhost:8080'

function extractImageIdFromPayload(payload) {
  if (!payload) return null
  if (payload.imageId) return payload.imageId
  const url = payload.imageUrl
  if (!url) return null
  try {
    const u = new URL(url, window.location.origin)
    const parts = u.pathname.split('/')
    return parts[parts.length - 1] || null
  } catch {
    const parts = (url || '').split('/')
    return parts[parts.length - 1] || null
  }
}

async function deleteImageAssetsForModules(mods) {
  try {
    const ids = new Set()
    Object.values(mods || {}).forEach((m) => {
      const id = extractImageIdFromPayload(m?.payload)
      if (id) ids.add(id)
    })
    if (ids.size === 0) return
    await Promise.allSettled(
      Array.from(ids).map((id) => fetch(`${API_BASE}/api/images/${id}`, { method: 'DELETE' }))
    )
  } catch {}
}

// 集中管理 JamBoard 的动作逻辑，保持 JamBoard 组件为“骨架”
export function useBoardActions(cfg) {
  const {
    modules, links, boardSize, viewOffset,
    setModules, setLinks, linking, setLinking,
    setEditingId, addModuleFromDef, userModuleDefs,
    setIsArranging, autoArrange,
    setViewOffset,
    initialModulesRef,
    mergedUserDefs,
    setShowClearConfirm,
    setIsPanning,
    setNodeStreams,
  } = cfg

  const addModuleAtCurrentView = (defId) => {
    const def = userModuleDefs[defId]
    const w = def?.defaultSize?.w || 200
    const h = def?.defaultSize?.h || 120
    const boardW = boardSize?.w || window.innerWidth
    const boardH = boardSize?.h || window.innerHeight
    const jitter = Math.round(Math.random() * 24) - 12
    const x = Math.round(-viewOffset.x + Math.max(24, (boardW - w) / 2) + jitter)
    const y = Math.round(-viewOffset.y + Math.max(24, (boardH - h) / 2) + jitter)
    addModuleFromDef(defId, { x, y })
  }

  const clearCacheAndArrange = () => {
    clearBoardCache()
    setLinks(() => [])
    setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
    setIsArranging?.(true)
    autoArrange({ animated: true, duration: 260, onDone: () => setIsArranging?.(false) })
  }

  const restoreDefaultLayout = () => {
    const defaults = buildDefaultModules()
    setLinks(() => [])
    setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
    setEditingId(null)
    const { nextModules, offsetY } = autoArrangeModules(defaults, boardSize)
    setModules(() => nextModules)
    setViewOffset((prev) => ({ ...prev, y: offsetY }))
    if (initialModulesRef) initialModulesRef.current = JSON.parse(JSON.stringify(nextModules))
  }

  const clearBoardInstances = async () => {
    // 先尝试删除后端图片资源（如存在）
    await deleteImageAssetsForModules(modules)
    // 再清空前端实例与缓存
    try {
      localStorage.setItem(STORAGE_KEYS.modules, JSON.stringify({}))
      localStorage.removeItem(STORAGE_KEYS.links)
      localStorage.removeItem(STORAGE_KEYS.view)
      localStorage.removeItem(STORAGE_KEYS.templates)
      localStorage.removeItem(STORAGE_KEYS.nodeStreams)
    } catch {}
    // 清空内存中的流式输出，避免 useEffect 重新写回旧数据
    setNodeStreams(() => ({}))
    setModules(() => ({}))
    setLinks(() => [])
    setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
    setEditingId(null)
    if (initialModulesRef) initialModulesRef.current = null
    setShowClearConfirm?.(false)
  }

  const onBackgroundPointerDown = (e) => {
    const inUI =
      e.target.closest('.board-toolbar') ||
      e.target.closest('.module-list-panel') ||
      e.target.closest('.modal') ||
      e.target.closest('.modal-overlay') ||
      e.target.closest('.module-wrapper') ||
      e.target.closest('.connector-dot') ||
      e.target.closest('.link-remove')
    if (inUI) return
    if (linking?.active) {
      setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
      return
    }
    setEditingId(null)
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const start = { x: viewOffset.x, y: viewOffset.y }
    setIsPanning?.(true)
    const onMove = (evt) => {
      const dx = evt.clientX - startX
      const dy = evt.clientY - startY
      setViewOffset({ x: start.x + dx, y: start.y + dy })
    }
    const onUp = () => {
      setIsPanning?.(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const exportBoard = () => {
    const data = buildExportData(modules, links, boardSize, mergedUserDefs)
    downloadJSON(data, 'board-export.json')
  }

  const importBoard = (data) => {
    try {
      const { modules: next, links: nextLinks } = parseImportData(data, mergedUserDefs)
      if (!next || Object.keys(next).length === 0) {
        setModules(() => ({}))
        setLinks(() => [])
        setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
        setEditingId(null)
        if (initialModulesRef) initialModulesRef.current = null
        return
      }
      setModules(() => next)
      setLinks(() => nextLinks)
      setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
      setEditingId(null)
      const offsetY = computeVerticalCenterOffset(next, boardSize)
      setViewOffset((prev) => ({ ...prev, y: offsetY }))
      if (initialModulesRef) initialModulesRef.current = JSON.parse(JSON.stringify(next))
    } catch {}
  }

  // ==== 后端打通：生成代理图 + 流式执行 ====
  const lastGraphRef = useRef(null)

  const summarizeToBackend = async () => {
    try {
      const data = buildExportData(modules, links, boardSize, mergedUserDefs)
      const resp = await fetch(`${API_BASE}/api/graph/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: data })
      })
      if (!resp.ok) throw new Error('summarize failed')
      const json = await resp.json()
      if (json?.graph) {
        lastGraphRef.current = json.graph
        console.log('[summarize] graph nodes=', json.nodes, 'edges=', json.edges)
        return true
      }
      return false
    } catch (e) {
      console.error('[summarize] error', e)
      return false
    }
  }

  const processGraphStreaming = async () => {
    try {
      // 若无图，先生成
      if (!lastGraphRef.current) {
        await summarizeToBackend()
        if (!lastGraphRef.current) return
      }
      if (typeof setNodeStreams === 'function') {
        setNodeStreams({})
      }
      const resp = await fetch(`${API_BASE}/api/graph/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ graph: lastGraphRef.current, verbose: false, stream: true })
      })
      if (!resp.ok) throw new Error('process failed')
      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buf = ''
      let currentNodeId = null
      // 简易解析：按 SSE 的空行分段，聚合 data 行
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const chunk of parts) {
          // 支持后端一次 data 事件中包含多行（StreamPrinter 在前面加了换行），
          // 因此我们不再仅筛选以 `data:` 开头的行，而是取首行 `data:` 之后的整段。
          const errEvent = /^event:\s?error/.test(chunk)
          if (errEvent) {
            const msg = chunk.replace(/^event:\s?error\n?/, '').replace(/^data:\s?/, '')
            console.error('[stream] error event:', msg)
            continue
          }
          if (!/^data:/.test(chunk)) {
            // 兼容性兜底：若不是 data 事件，跳过
            continue
          }
          let text = chunk.replace(/^data:\s?/, '')
          // 去掉可能的开头空白换行（由于 Begin 前置换行）
          text = text.replace(/^\s*\n?/, '')
          if (text.trim()) {
            const m = text.match(/=== node=(.+?) ===/)
            if (m) {
              currentNodeId = m[1]
              if (typeof setNodeStreams === 'function') {
                setNodeStreams(prev => ({ ...prev, [currentNodeId]: '' }))
              }
              // 如果边界行后还有正文，同一事件中继续处理
              const after = text.replace(m[0], '').trim()
              if (!after) continue
              text = after
            }
            if (typeof setNodeStreams === 'function' && currentNodeId) {
              // 去掉每个 token 后的强制换行，直接累积原始文本
              setNodeStreams(prev => ({ ...prev, [currentNodeId]: `${prev[currentNodeId] || ''}${text}` }))
            }
            console.log('[stream]', text)
          }
        }
      }
      console.log('[stream] done')
      return true
    } catch (e) {
      console.error('[process] error', e)
      return false
    }
  }

  return {
    addModuleAtCurrentView,
    clearCacheAndArrange,
    restoreDefaultLayout,
    clearBoardInstances,
    onBackgroundPointerDown,
    exportBoard,
    importBoard,
    summarizeToBackend,
    processGraphStreaming,
  }
}