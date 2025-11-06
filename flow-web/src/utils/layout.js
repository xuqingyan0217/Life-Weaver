export const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export const computeVerticalCenterOffset = (modMap, boardSize) => {
  const enabled = Object.values(modMap || {}).filter((m) => m.enabled !== false)
  if (enabled.length === 0) return 0
  const minY = Math.min(...enabled.map((m) => (m.y || 0)))
  const maxBottom = Math.max(...enabled.map((m) => (m.y || 0) + (m.h || 0)))
  const contentH = Math.max(0, maxBottom - minY)
  const viewportH = boardSize?.h || window.innerHeight
  const centerOffsetY = Math.round(viewportH / 2 - (minY + contentH / 2))
  return centerOffsetY
}