// Auto arrangement algorithm for JamBoard
// Given current modules and board size, compute a new arranged layout
// and the vertical center offset to apply.

import { clamp, computeVerticalCenterOffset } from './layout.js'

export function autoArrangeModules(modules, boardSize) {
  const margin = 24
  const gap = 16
  const maxBoardW = boardSize?.w || window.innerWidth
  const maxBoardH = boardSize?.h || window.innerHeight

  const next = { ...modules }
  const enabledEntries = Object.entries(modules).filter(([id, m]) => m.enabled !== false)
  const connectable = enabledEntries.filter(([id, m]) => m.connectable !== false)
  const decorative = enabledEntries.filter(([id, m]) => m.connectable === false)

  // Column width and count based on max connectable width; center horizontally
  const maxConnW = Math.max(160, ...connectable.map(([id, m]) => m.w || 160))
  const availableW = Math.max(0, maxBoardW - margin * 2)
  const columns = Math.max(1, Math.floor((availableW + gap) / (maxConnW + gap)))
  const colWidth = Math.min(maxConnW, Math.floor((availableW - (columns - 1) * gap) / columns))
  const leftStart = margin + Math.max(0, Math.floor((availableW - (columns * colWidth + (columns - 1) * gap)) / 2))
  const colY = new Array(columns).fill(margin)

  // Connectable modules: place into shortest columns, sort by height desc
  connectable
    .sort((a, b) => (b[1].h || 0) - (a[1].h || 0))
    .forEach(([id, m]) => {
      const minY = Math.min(...colY)
      const col = colY.indexOf(minY)
      const x = leftStart + col * (colWidth + gap)
      const y = colY[col]
      colY[col] = y + (m.h || 120) + gap
      next[id] = {
        ...m,
        x: clamp(x, 0, Math.max(0, maxBoardW - (m.w || 0))),
        y: clamp(y, 0, Math.max(0, maxBoardH - (m.h || 0))),
        // Mark as arranged so export can filter only arranged nodes/edges
        arranged: true,
      }
    })

  // Decorative area: prefer right-side grid; fallback to below main columns
  const rightStartX = leftStart + columns * (colWidth + gap)
  const rightLimit = maxBoardW - margin
  const hasRightSpace = rightStartX + 120 <= rightLimit
  let decoX = hasRightSpace ? rightStartX : leftStart
  let decoY = hasRightSpace ? margin : Math.max(...colY) + gap
  const decoColGap = 12
  const decoRowGap = 12

  decorative.forEach(([id, m]) => {
    const itemW = m.w || 120
    const itemH = m.h || 100
    if (decoX + itemW > rightLimit) {
      decoX = hasRightSpace ? rightStartX : leftStart
      decoY += itemH + decoRowGap
    }
    const x = decoX
    const y = decoY
    decoX += itemW + decoColGap
    next[id] = {
      ...m,
      x: clamp(x, 0, Math.max(0, maxBoardW - itemW)),
      y: clamp(y, 0, Math.max(0, maxBoardH - itemH)),
      // Decorative modules are also considered arranged by the algorithm
      arranged: true,
    }
  })

  // After arranging, vertically center by content height
  const offsetY = computeVerticalCenterOffset(next)

  return { nextModules: next, offsetY }
}