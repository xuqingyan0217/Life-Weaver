import { useRef, useState } from 'react'
import { defaultUserModuleDefs } from '../../defs/registry.jsx'

// Board model hook: centralize links, linking, editing, user templates, and helpers
export function useBoardModel(modules, setModules) {
  const [links, setLinks] = useState([])
  const [linking, setLinking] = useState({ active: false, from: null, cursor: { x: 0, y: 0 } })
  const [editingId, setEditingId] = useState(null)
  const lastEditedIdRef = useRef(null)
  const [showModuleList, setShowModuleList] = useState(false)

  const initialModulesRef = useRef(null)

  const [userModuleDefs, setUserModuleDefs] = useState(defaultUserModuleDefs)

  // helpers
  const genId = (base) => {
    let i = 1
    let id = `${base}-${i}`
    while (modules[id]) { i += 1; id = `${base}-${i}` }
    return id
  }

  const bringToFront = (id) => {
    setModules((prev) => {
      const maxZ = Object.values(prev).reduce((m, v) => Math.max(m, v.z || 0), 0)
      return { ...prev, [id]: { ...prev[id], z: maxZ + 1 } }
    })
  }

  const addModuleFromDef = (defId, at) => {
    const def = userModuleDefs[defId]
    if (!def) return
    const margin = 24
    const jitter = Math.round(Math.random() * 80)
    const x = Math.round(at?.x ?? (margin + jitter))
    const y = Math.round(at?.y ?? (margin + jitter))
    const newId = genId(defId)
    setModules(prev => ({
      ...prev,
      [newId]: {
        x, y,
        w: def.defaultSize?.w || 200,
        h: def.defaultSize?.h || 120,
        z: 1,
        connectable: def.connectable !== false,
        editable: def.editable !== false,
        enabled: true,
        // New instances are not arranged until autoArrange runs
        arranged: false,
        payload: def.defaultPayload ? JSON.parse(JSON.stringify(def.defaultPayload)) : null,
        render: def.render,
      }
    }))
  }

  const saveTemplateFromEditing = () => {
    const sourceId = editingId ?? lastEditedIdRef.current
    if (!sourceId) return
    const src = modules[sourceId]
    if (!src) return
    let defId = `tpl-${sourceId}`
    let i = 1
    while (userModuleDefs[defId]) { defId = `tpl-${sourceId}-${i++}` }
    setUserModuleDefs(prev => ({
      ...prev,
      [defId]: {
        name: `模板：${sourceId}`,
        connectable: src.connectable !== false,
        defaultSize: { w: src.w || 200, h: src.h || 120 },
        defaultPayload: src.payload ? JSON.parse(JSON.stringify(src.payload)) : null,
        render: src.render,
      }
    }))
  }

  const isChanged = (id, m) => {
    const init = initialModulesRef.current?.[id]
    if (!init) return false
    const moved = (m.x !== init.x) || (m.y !== init.y) || (m.w !== init.w) || (m.h !== init.h)
    const payloadChanged = JSON.stringify(m.payload ?? null) !== JSON.stringify(init.payload ?? null)
    return moved || payloadChanged
  }

  const finishLink = (toId) => {
    if (linking?.active && linking.from && linking.from !== toId) {
      setLinks((prev) => [...prev, { from: linking.from, to: toId, color: '#111' }])
    }
    setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
  }

  return {
    links,
    setLinks,
    linking,
    setLinking,
    editingId,
    setEditingId,
    lastEditedIdRef,
    showModuleList,
    setShowModuleList,
    initialModulesRef,
    userModuleDefs,
    setUserModuleDefs,
    bringToFront,
    addModuleFromDef,
    saveTemplateFromEditing,
    isChanged,
    finishLink,
  }
}