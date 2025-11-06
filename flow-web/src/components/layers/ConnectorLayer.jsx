import React, { useEffect } from 'react'

export default function ConnectorLayer({ modules, links, setLinks, linking, setLinking, onFinishLink, size }) {
  useEffect(() => {
    const onMove = (e) => {
      if (!linking?.active) return
      // 将窗口坐标转换为画板坐标：减去 board-stage 的可视位置
      const stage = document.querySelector('.board-stage')
      const rect = stage?.getBoundingClientRect()
      const x = rect ? e.clientX - rect.left : e.clientX
      const y = rect ? e.clientY - rect.top : e.clientY
      setLinking((l) => ({ ...l, cursor: { x, y } }))
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [linking?.active])

  // 新增：按 Esc 取消连线预览
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLinking({ active: false, from: null, cursor: { x: 0, y: 0 } })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 仅为可连接模块渲染端点（connectable !== false）
  const entries = Object.entries(modules || {}).filter(([id, m]) => m.connectable !== false)
  const dots = entries.flatMap(([id, m]) => {
    const right = { left: m.x + m.w - 6, top: m.y + m.h / 2 - 6 }
    const left = { left: m.x - 6, top: m.y + m.h / 2 - 6 }
    return [
      <div
        key={`${id}-out`}
        className="connector-dot out"
        style={{ position: 'absolute', ...right }}
        onClick={() => {
          setLinking((l) => {
            // 再次点击同一输出端点：取消连线
            if (l?.active && l.from === id) {
              return { active: false, from: null, cursor: { x: 0, y: 0 } }
            }
            // 启动连线预览
            return { active: true, from: id, cursor: { x: m.x + m.w, y: m.y + m.h / 2 } }
          })
        }}
        role="button"
        aria-label={`Start link from ${id}`}
        title={linking?.active && linking.from === id ? '取消连线（Esc/再次点击）' : '从此处开始连线'}
      />, 
      <div
        key={`${id}-in`}
        className="connector-dot in"
        style={{ position: 'absolute', ...left }}
        onClick={() => {
          if (linking?.active && linking.from && linking.from !== id) {
            if (onFinishLink) onFinishLink(id)
            else setLinking((l) => ({ ...l, active: false }))
          }
        }}
        role="button"
        aria-label={`Finish link to ${id}`}
        title="连接到此处"
      />,
    ]
  })

  // 为每条已存在的连线渲染一个中点删除按钮
  const linkRemovers = (links || []).map((l, idx) => {
    const from = modules[l.from]
    const to = modules[l.to]
    if (!from || !to) return null
    const start = { x: from.x + from.w, y: from.y + from.h / 2 }
    const end = { x: to.x, y: to.y + to.h / 2 }
    const mid = { left: (start.x + end.x) / 2 - 9, top: (start.y + end.y) / 2 - 9 }
    return (
      <button
        key={`link-remove-${idx}`}
        className="link-remove"
        style={{ position: 'absolute', ...mid }}
        onClick={() => setLinks((prev) => prev.filter((_, i) => i !== idx))}
        title="删除此连线"
        aria-label={`Remove link ${idx}`}
      >×</button>
    )
  })

  return (
    <div className="connector-layer">
      {dots}
      {linkRemovers}
    </div>
  )
}