import { useEffect } from 'react'
import { builtinModuleDefs, builtinStickerDefs } from '../components/defs/builtins.jsx'

export const STORAGE_KEYS = {
  modules: 'jam.modules.v1',
  links: 'jam.links.v1',
  view: 'jam.view.v1',
  templates: 'jam.templates.v1',
  nodeStreams: 'jam.nodeStreams.v1',
}

// 新：同步从 localStorage 获取初始状态
export const getInitialStateFromCache = () => {
  let wasRestored = false
  let initialModules = null
  let initialLinks = null
  let initialViewOffset = null
  let initialUserModuleDefs = null

  try {
    // 模板必须首先恢复，后续模块恢复依赖它
    const rawTemplates = localStorage.getItem(STORAGE_KEYS.templates)
    if (rawTemplates) {
      const parsed = JSON.parse(rawTemplates)
      if (Object.keys(parsed).length > 0) {
        initialUserModuleDefs = parsed
      }
    }

    const rawMods = localStorage.getItem(STORAGE_KEYS.modules)
    if (rawMods !== null) {
      let saved = {}
      try { saved = JSON.parse(rawMods) || {} } catch {}
      initialModules = saved
      wasRestored = true

      // 仅当存在实例时才恢复连线与视图
      if (Object.keys(saved).length > 0) {
        const rawLinks = localStorage.getItem(STORAGE_KEYS.links)
        if (rawLinks) {
          initialLinks = JSON.parse(rawLinks)
        }
        const rawView = localStorage.getItem(STORAGE_KEYS.view)
        if (rawView) {
          const v = JSON.parse(rawView)
          if (v && typeof v.x === 'number' && typeof v.y === 'number') {
            initialViewOffset = v
          }
        }
      }
    }
  } catch (err) {
    // 忽略解析错误
    console.error('Error hydrating from localStorage', err)
  }

  return { wasRestored, initialModules, initialLinks, initialViewOffset, initialUserModuleDefs }
}

export const clearBoardCache = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.modules)
    localStorage.removeItem(STORAGE_KEYS.links)
    localStorage.removeItem(STORAGE_KEYS.view)
    localStorage.removeItem(STORAGE_KEYS.templates)
    // 清理流式输出缓存
    localStorage.removeItem(STORAGE_KEYS.nodeStreams)
  } catch {}
}

export const serializeModules = (mods) => {
  const plain = {}
  Object.entries(mods || {}).forEach(([id, m]) => {
    const { render, ...rest } = m || {}
    plain[id] = rest
  })
  return plain
}

const pickDef = (key, userModuleDefs) => (
  (userModuleDefs && userModuleDefs[key]) || builtinModuleDefs[key] || builtinStickerDefs[key]
)

export const resolveDefForInstance = (id, userModuleDefs) => {
  if (!id) return null
  if (pickDef(id, userModuleDefs)) return pickDef(id, userModuleDefs)
  const baseMatch = id?.match(/^(.*?)-\d+$/)
  const baseId = baseMatch ? baseMatch[1] : id
  if (pickDef(baseId, userModuleDefs)) return pickDef(baseId, userModuleDefs)
  const tplBase = baseId?.startsWith('tpl-') ? baseId.slice(4).replace(/-\d+$/, '') : null
  if (tplBase && pickDef(tplBase, userModuleDefs)) return pickDef(tplBase, userModuleDefs)
  return null
}

export const mapPersistedTemplatesToDefs = (raw, userModuleDefs) => {
  const out = {}
  Object.entries(raw || {}).forEach(([defId, defData]) => {
    const tplBase = defId.startsWith('tpl-') ? defId.slice(4) : defId
    const baseId = tplBase.replace(/-\d+$/, '')
    const baseDef = (
      (userModuleDefs && userModuleDefs[baseId]) || builtinModuleDefs[baseId] || builtinStickerDefs[baseId] ||
      (userModuleDefs && userModuleDefs[tplBase]) || builtinModuleDefs[tplBase] || builtinStickerDefs[tplBase] ||
      (userModuleDefs && userModuleDefs[defId]) || builtinModuleDefs[defId] || builtinStickerDefs[defId]
    )
    out[defId] = { ...defData, render: baseDef?.render }
  })
  return out
}

// useBoardPersistence Hook 现在只负责“持久化”，不再负责“恢复”
export function useBoardPersistence({
  modules,
  links,
  viewOffset,
  userModuleDefs,
}) {
  // 变更时持久化 modules（包括空对象，用于表示“已清空”）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.modules, JSON.stringify(serializeModules(modules || {})))
    } catch {}
  }, [modules])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(links))
    } catch {}
  }, [links])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.view, JSON.stringify(viewOffset))
    } catch {}
  }, [viewOffset])

  // 持久化用户模板（仅 tpl-*），渲染函数由基模板恢复
  useEffect(() => {
    try {
      const persisted = {}
      Object.entries(userModuleDefs || {}).forEach(([defId, def]) => {
        if (defId.startsWith('tpl-')) {
          persisted[defId] = {
            name: def.name,
            connectable: def.connectable !== false,
            defaultSize: def.defaultSize,
            defaultPayload: def.defaultPayload,
          }
        }
      })
      if (Object.keys(persisted).length > 0) {
        localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(persisted))
      }
    } catch {}
  }, [userModuleDefs])

  // 在页面刷新/关闭前，同步写入最新状态，避免 onBlur 未触发导致丢失
  useEffect(() => {
    const beforeUnloadHandler = () => {
      try {
        localStorage.setItem(STORAGE_KEYS.modules, JSON.stringify(serializeModules(modules || {})))
        localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(links))
        localStorage.setItem(STORAGE_KEYS.view, JSON.stringify(viewOffset))
      } catch {}
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler)
  }, [modules, links, viewOffset])
}