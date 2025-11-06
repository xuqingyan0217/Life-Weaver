import { resolveDefForInstance } from '../hooks/useBoardPersistence.js'
import { buildDefaultModules } from '../components/defs/defaultLayout.js'

// 计算初始模块：优先从缓存恢复并修复 render，否则使用默认布局
export function computeInitialModules(cache, mergedUserDefs) {
  if (cache?.initialModules) {
    const next = {}
    Object.entries(cache.initialModules).forEach(([id, m]) => {
      const def = resolveDefForInstance(id, mergedUserDefs)
      next[id] = { ...m, render: def?.render }
    })
    return next
  }
  return buildDefaultModules()
}