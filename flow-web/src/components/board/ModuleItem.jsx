import React, { useState, useLayoutEffect, useRef } from 'react'

const API_BASE = 'http://localhost:8080'

async function deleteImageAssetIfPresent(m) {
  try {
    const pid = m?.payload
    const imageId = pid?.imageId || (() => {
      const url = pid?.imageUrl
      if (!url) return null
      try {
        const u = new URL(url, window.location.origin)
        const parts = u.pathname.split('/')
        return parts[parts.length - 1] || null
      } catch {
        const parts = (url || '').split('/')
        return parts[parts.length - 1] || null
      }
    })()
    if (!imageId) return
    await fetch(`${API_BASE}/api/images/${imageId}`, { method: 'DELETE' })
  } catch {}
}

export default function ModuleItem({ id, m, editingId, setEditingId, setModules, bringToFront, onEnterEdit, setLinks, openUrlDialog, nodeStreamText, onClearNodeStream }) {
  const [showDeleteBox, setShowDeleteBox] = useState(false)
  // 控制节点流式输出的展开态：点击小框后在其上方显示大框
  const [isStreamExpanded, setStreamExpanded] = useState(false)
  const caretInfoRef = useRef({ el: null, offset: 0 })
  const isComposingRef = useRef(false)
  const queuedPatchRef = useRef(null)

  const getCaretOffset = (el) => {
    try {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return null
      const range = sel.getRangeAt(0)
      const pre = range.cloneRange()
      pre.selectNodeContents(el)
      pre.setEnd(range.endContainer, range.endOffset)
      return pre.toString().length
    } catch {
      return null
    }
  }

  const setCaretOffset = (el, offset) => {
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      let current = 0
      let found = false
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const next = current + (node.textContent?.length || 0)
        if (offset <= next) {
          range.setStart(node, Math.max(0, offset - current))
          range.collapse(true)
          found = true
          break
        }
        current = next
      }
      if (!found) {
        range.selectNodeContents(el)
        range.collapse(false)
      }
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  }

  const moveCaretToEnd = (el) => {
    try {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false) // 光标移动到内容末尾
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  }

  // 在重渲染后恢复光标位置，避免跳到开头
  useLayoutEffect(() => {
    if (editingId !== id) return
    const { el, offset } = caretInfoRef.current
    if (el && typeof offset === 'number') {
      // 使用 requestAnimationFrame 确保 DOM 更新完成后再恢复
      requestAnimationFrame(() => setCaretOffset(el, offset))
    }
  }, [m.payload, editingId])

  const onPointerDown = (e) => {
    // 仅左键拖拽
    if (e.button !== 0) return
    const isEditHandle = e.target.closest('[data-edit-handle="true"]')
    if (isEditHandle) return
    const isEditableTarget = e.target.closest('[contenteditable="true"]')
    if (editingId && !(id === editingId && isEditableTarget)) { setEditingId(null) }
    if (editingId === id && isEditableTarget) return
    e.preventDefault()
    e.stopPropagation()
    bringToFront(id)
    const startX = e.clientX
    const startY = e.clientY
    const start = { x: m.x, y: m.y }

    const onMove = (evt) => {
      const dx = evt.clientX - startX
      const dy = evt.clientY - startY
      const x = start.x + dx
      const y = start.y + dy
      setModules((prev) => ({ ...prev, [id]: { ...prev[id], x, y } }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteBox(true)
  }

  const onPayloadChange = (patch) => {
    if (isComposingRef.current) {
      queuedPatchRef.current = { ...(queuedPatchRef.current || {}), ...patch }
      return
    }
    setModules((prev) => ({
      ...prev,
      [id]: { ...prev[id], payload: { ...(prev[id].payload || {}), ...patch } },
    }))
  }

  return (
    <>
    <div
      className="module-wrapper"
      data-id={id}
      style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h, zIndex: m.z || 1 }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onFocusCapture={(e) => {
        const el = e.target.closest('[contenteditable="true"]')
        if (el) caretInfoRef.current.el = el
      }}
      onInputCapture={(e) => {
        const el = e.target.closest('[contenteditable="true"]')
        if (!el) return
        caretInfoRef.current.el = el
        const off = getCaretOffset(el)
        if (typeof off === 'number') caretInfoRef.current.offset = off
      }}
      onCompositionStartCapture={() => { isComposingRef.current = true }}
      onCompositionUpdateCapture={(e) => {
        const el = e.target.closest('[contenteditable="true"]')
        if (!el) return
        const off = getCaretOffset(el)
        if (typeof off === 'number') caretInfoRef.current.offset = off
      }}
      onCompositionEndCapture={() => {
        isComposingRef.current = false
        const patch = queuedPatchRef.current
        if (patch) {
          queuedPatchRef.current = null
          setModules((prev) => ({
            ...prev,
            [id]: { ...prev[id], payload: { ...(prev[id].payload || {}), ...patch } },
          }))
        }
      }}
      onBlurCapture={() => { caretInfoRef.current.el = null }}
    >
      {/* 删除点击框：右键显示 */}
      {showDeleteBox && (
        <div className="delete-box" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="danger"
            onClick={async (e) => {
              e.stopPropagation()
              // 先尝试删除后端图片资源（如存在）
              await deleteImageAssetIfPresent(m)
              // 再删除前端模块与相关连线
              setModules((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
              })
              if (typeof setLinks === 'function') {
                setLinks((prev) => (prev || []).filter((l) => l.from !== id && l.to !== id))
              }
              // 清理该节点的流式输出内容
              try { onClearNodeStream?.(id) } catch {}
              if (editingId === id) setEditingId(null)
              setShowDeleteBox(false)
            }}
            title="删除此模块/贴纸"
          >删除</button>
          <button onClick={() => setShowDeleteBox(false)} title="取消">取消</button>
        </div>
      )}

      {/* 编辑手柄：仅当模块可编辑时显示 */}
      {m.editable !== false && (
        <div
          className="edit-handle"
          data-edit-handle="true"
          title="编辑"
          onClick={(e) => {
            e.stopPropagation()
            onEnterEdit?.(id)
            const wrapper = e.currentTarget.closest('.module-wrapper')
            setTimeout(() => {
              const el = wrapper?.querySelector('[data-editable="true"]')
              if (el) {
                el.focus()
                moveCaretToEnd(el)
              }
            }, 0)
          }}
        />
      )}
      {m.render?.(m, onPayloadChange, { isEditing: editingId === id, stopEditing: () => setEditingId(null), id, openUrlDialog })}
      {/* 小框改为相对模块定位：贴在模块头上并随模块移动 */}
      {nodeStreamText && (
        <div
          className="node-stream-box"
          onClick={(e) => { e.stopPropagation(); setStreamExpanded((v) => !v) }}
          title={isStreamExpanded ? '点击收起' : '点击展开查看完整内容'}
          style={{
            position: 'absolute',
            left: 0,
            top: -78,
            width: '100%',
            zIndex: 2,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            color: '#222',
            fontSize: 13,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            height: 72, // 固定高度的小框
            cursor: 'pointer'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 12, color: '#666', marginBottom: 6 }}>流式输出</div>
          <div style={{ wordBreak: 'break-word' }}>{nodeStreamText}</div>
          {/* 底部渐隐提升美感，不影响文字 */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24, background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.92))', pointerEvents: 'none' }} />
        </div>
      )}
    </div>

    {nodeStreamText && isStreamExpanded && (
      <div
        className="node-stream-expanded"
        // 展开的大框：在小框正上方显示
        style={{
          position: 'absolute',
          left: m.x,
          // 大框高度 240，避免出界，若空间不足则贴近顶端
          top: Math.max(8, m.y - 246),
          width: Math.min(Math.max(m.w, 420), 860),
          height: 240,
          zIndex: (m.z || 1) + 100, // 保证覆盖在上方
          background: '#fff',
          border: '2px solid #111',
          borderRadius: 10,
          boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
          padding: 12,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#222' }}>节点 {id} 流式输出</div>
          <button
            onClick={(e) => { e.stopPropagation(); setStreamExpanded(false) }}
            style={{ appearance: 'none', background: '#ffd86f', color: '#111', border: '2px solid #111', borderRadius: 999, padding: '4px 10px', fontWeight: 800, cursor: 'pointer' }}
          >关闭</button>
        </div>
        <div style={{ overflow: 'auto', width: '100%', height: 'calc(100% - 32px)', color: '#222', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {nodeStreamText}
        </div>
      </div>
    )}
    </>
  )
}