import { useRef, useState, useEffect } from 'react'

// Minimal board state hook to centralize view and board basics
export function useBoardState() {
  const boardRef = useRef(null)
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 })
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [gridBg, setGridBg] = useState('#ffffff')

  // measure board size, keep up-to-date on resize
  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return
      const rect = boardRef.current.getBoundingClientRect()
      setBoardSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return {
    boardRef,
    boardSize,
    setBoardSize,
    viewOffset,
    setViewOffset,
    isPanning,
    setIsPanning,
    gridBg,
    setGridBg,
  }
}