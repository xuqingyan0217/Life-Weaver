import { useEffect } from 'react'

// 当 enabled 为 true 时，按下 ESC 调用 onClose
export function useCloseOnEscape(enabled, onClose) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, onClose])
}