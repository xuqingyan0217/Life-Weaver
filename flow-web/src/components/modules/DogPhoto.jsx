import React, { useEffect, useRef, useState } from 'react'

const API_BASE = 'http://localhost:8080'

export default function DogPhoto({ payload, onPayloadChange, edit }) {
  const src = payload?.src ?? null
  const imageUrl = payload?.imageUrl ?? null
  // URL 导入改为主页面弹窗，不在模块内部维护
  const [objectUrl, setObjectUrl] = useState(null)
  const objectUrlRef = useRef(null)
  const inputRef = useRef(null)

  // 删除旧图片资源（如存在）
  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  const extractImageIdFromPayload = (pid) => {
    if (!pid) return null
    if (pid.imageId && isUUID(String(pid.imageId))) return String(pid.imageId)
    const url = pid.imageUrl
    if (!url) return null
    try {
      const u = new URL(url, window.location.origin)
      const parts = u.pathname.split('/')
      const last = parts[parts.length - 1] || ''
      return isUUID(last) ? last : null
    } catch {
      const parts = String(url).split('/')
      const last = parts[parts.length - 1] || ''
      return isUUID(last) ? last : null
    }
  }
  const deleteImageAssetIfPresent = async (pid) => {
    try {
      const id = extractImageIdFromPayload(pid)
      if (!id) return
      await fetch(`${API_BASE}/api/images/${id}`, { method: 'DELETE' })
    } catch {}
  }

  useEffect(() => {
    if (imageUrl) {
      // 后端 URL 直接展示，清理临时预览
      setObjectUrl(null)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [imageUrl])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const compressImage = async (file) => {
    const maxW = 1600
    const maxH = 1600
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = url
      })
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      // 优先使用 WebP，兼容下回退到 JPEG
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => {
          if (b) return resolve(b)
          canvas.toBlob((bb) => resolve(bb), 'image/jpeg', 0.85)
        }, 'image/webp', 0.8)
      })
      return blob || file
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const uploadToServer = async (blob, prevId) => {
    try {
      const form = new FormData()
      const filename = `upload${blob.type && blob.type.includes('webp') ? '.webp' : '.jpg'}`
      form.append('file', blob, filename)
      if (prevId) form.append('prevId', prevId)
      const resp = await fetch(`${API_BASE}/api/images`, { method: 'POST', body: form })
      if (!resp.ok) throw new Error('upload failed')
      const json = await resp.json()
      return json // { id, url }
    } catch (e) {
      return null
    }
  }

  const handleFiles = (files) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type?.startsWith('image/')) return
    ;(async () => {
      try {
        const blob = await compressImage(file)
        // 优先上传后端
        const prevId = extractImageIdFromPayload(payload)
        const result = await uploadToServer(blob, prevId)
        if (result?.url) {
          onPayloadChange?.({ imageUrl: result.url, imageId: result.id, src: null })
          setObjectUrl(null)
        } else {
          const url = URL.createObjectURL(blob)
          objectUrlRef.current && URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = url
          setObjectUrl(url)
        }
        edit?.stopEditing?.()
      } catch {}
    })()
  }

  // URL 上传逻辑改到全局 JamBoard 弹窗中

  return (
    <figure className="dog-photo" data-id="dog-photo">
      {(imageUrl || objectUrl || src) ? (
        <img src={imageUrl || objectUrl || src} alt="Dog" />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#fce7f3,#ffe6a7)',
          fontSize: '42px'
        }}>🐶</div>
      )}
      {edit?.isEditing && (
        <div
          className="photo-uploader"
          data-editable="true"
          contentEditable={edit?.isEditing}
          suppressContentEditableWarning
          tabIndex={0}
          onPointerDown={(e) => { /* 阻止父级拖拽与退出编辑 */ e.stopPropagation() }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files) }}
        >
          <button
            type="button"
            className="file-trigger"
            onClick={() => inputRef.current?.click()}
            aria-label="选择本地图片"
          >点击或拖拽图片到此处</button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            className="url-mini-btn"
            type="button"
            title="通过URL导入图片"
            onClick={(e) => { e.stopPropagation(); edit?.openUrlDialog?.(edit?.id) }}
          >URL</button>
        </div>
      )}
    </figure>
  )
}