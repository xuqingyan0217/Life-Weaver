import React from 'react'

function pathFor(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const c1 = { x: start.x + dx * 0.35, y: start.y }
  const c2 = { x: end.x - dx * 0.35, y: end.y }
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`
}

export default function LinkLayer({ modules, links, linking, size }) {
  const paths = links.map((l, idx) => {
    const from = modules[l.from]
    const to = modules[l.to]
    const start = { x: from.x + from.w, y: from.y + from.h / 2 }
    const end = { x: to.x, y: to.y + to.h / 2 }
    return <path key={idx} d={pathFor(start, end)} className="link" style={{ stroke: l.color || '#111' }} />
  })

  let preview = null
  if (linking?.active && linking.from) {
    const from = modules[linking.from]
    const start = { x: from.x + from.w, y: from.y + from.h / 2 }
    const end = { x: linking.cursor.x, y: linking.cursor.y }
    preview = <path d={pathFor(start, end)} className="link preview" />
  }

  const viewW = size?.w || 1024
  const viewH = size?.h || 492

  return (
    <svg className="link-layer" viewBox={`0 0 ${viewW} ${viewH}`} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {paths}
      {preview}
    </svg>
  )
}