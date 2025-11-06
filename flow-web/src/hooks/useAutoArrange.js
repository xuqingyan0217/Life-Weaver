import { useCallback } from 'react'
import { autoArrangeModules } from '../utils/layout-arrange.js'

function lerp(a, b, t) {
  return a + (b - a) * t
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useAutoArrange({ modules, setModules, boardSize, setViewOffset, viewOffset, initialModulesRef }) {
  const autoArrange = useCallback((opts = {}) => {
    const { nextModules, offsetY } = autoArrangeModules(modules, boardSize)
    const animated = !!opts.animated
    const duration = Math.max(0, Number(opts.duration) || 240)
    if (!animated || duration === 0) {
      setModules(() => nextModules)
      setViewOffset((prevOff) => ({ ...prevOff, y: offsetY }))
      if (initialModulesRef && !initialModulesRef.current) {
        initialModulesRef.current = JSON.parse(JSON.stringify(nextModules))
      }
      if (typeof opts.onDone === 'function') opts.onDone()
      return
    }

    const start = performance.now()
    const ids = Object.keys(nextModules)
    const fromMap = modules
    const startOffsetY = (viewOffset?.y) || 0

    const posMap = {}
    ids.forEach((id) => {
      const from = fromMap[id] || nextModules[id]
      const to = nextModules[id]
      posMap[id] = {
        fromX: from?.x || 0,
        fromY: from?.y || 0,
        toX: to?.x || 0,
        toY: to?.y || 0,
        data: to,
      }
    })

    const step = (now) => {
      const elapsed = Math.max(0, now - start)
      const t = Math.min(1, elapsed / duration)
      const e = easeOutCubic(t)

      const frame = {}
      ids.forEach((id) => {
        const p = posMap[id]
        const x = lerp(p.fromX, p.toX, e)
        const y = lerp(p.fromY, p.toY, e)
        frame[id] = { ...p.data, x, y }
      })

      setModules(() => frame)
      setViewOffset((prev) => ({ ...prev, y: lerp(startOffsetY, offsetY, e) }))

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        // ensure final state
        setModules(() => nextModules)
        setViewOffset((prevOff) => ({ ...prevOff, y: offsetY }))
        if (initialModulesRef && !initialModulesRef.current) {
          initialModulesRef.current = JSON.parse(JSON.stringify(nextModules))
        }
        if (typeof opts.onDone === 'function') opts.onDone()
      }
    }

    requestAnimationFrame(step)
  }, [modules, boardSize, setModules, setViewOffset, viewOffset, initialModulesRef])

  return autoArrange
}