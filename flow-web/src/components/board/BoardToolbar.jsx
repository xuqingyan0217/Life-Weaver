import React, { useRef } from 'react'

export default function BoardToolbar({ onExport, onAutoArrange, gridBg, setGridBg, showModuleList, setShowModuleList, onClearBoard, onRestoreDefault, onImport, onSummarizeBackend, onProcessStream, summarizeLoading=false, processLoading=false }) {
  const fileRef = useRef(null)
  return (
    <div className="board-toolbar">
      <button onClick={onExport}>导出编排数据</button>
      <button onClick={onSummarizeBackend} disabled={summarizeLoading}>{summarizeLoading ? '生成中…' : '生成代理图（后端）'}</button>
      <button onClick={onProcessStream} disabled={processLoading || summarizeLoading}>{processLoading ? '执行中…' : '执行代理图（流式）'}</button>
      <button onClick={onAutoArrange}>清理布局</button>
      <button onClick={onRestoreDefault}>默认布局</button>
      <button onClick={() => fileRef.current?.click()}>导入编排数据</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result)
              onImport?.(data)
            } catch {}
            e.target.value = ''
          }
          reader.readAsText(file)
        }}
      />
      <button onClick={() => setShowModuleList((v) => !v)}>{showModuleList ? '收起模块清单' : '模块清单'}</button>
      <label style={{ display:'flex', alignItems:'center', gap: 6 }}>
        <span>网格背景</span>
        <input type="color" value={gridBg} onChange={(e) => setGridBg(e.target.value)} />
      </label>
      <button onClick={() => setGridBg('#ffffff')}>重置网格背景</button>
      <button className="danger" onClick={onClearBoard}>清空画板</button>
    </div>
  )
}