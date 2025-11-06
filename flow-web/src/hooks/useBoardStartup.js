import { useEffect, useState } from 'react'

// 启动阶段：根据缓存或尺寸完成初始布局恢复/编排，并返回 isReady
export function useBoardStartup({ cache, boardSize, setViewOffset, setLinks, autoArrange }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isReady) return
    if (cache?.wasRestored) {
      if (cache.initialViewOffset) setViewOffset(cache.initialViewOffset)
      if (cache.initialLinks) setLinks(cache.initialLinks)
      setIsReady(true)
      return
    }
    if ((boardSize?.w > 0) && (boardSize?.h > 0)) {
      autoArrange()
      setIsReady(true)
    }
  }, [boardSize])

  return { isReady }
}