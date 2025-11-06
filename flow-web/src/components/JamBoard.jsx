import React, { useEffect, useMemo, useRef, useState } from 'react'
import BoardToolbar from './board/BoardToolbar.jsx'
import ModuleListPanel from './panels/ModuleListPanel.jsx'
import BoardStage from './board/BoardStage.jsx'


import { useBoardState } from './board/state/useBoardState.js'
import { useBoardModel } from './board/state/useBoardModel.js'
import { useBoardPersistence, getInitialStateFromCache, mapPersistedTemplatesToDefs, STORAGE_KEYS } from '../hooks/useBoardPersistence.js'
import { useAutoArrange } from '../hooks/useAutoArrange.js'
import { defaultUserModuleDefs } from './defs/registry.jsx'
import { useBoardActions } from '../hooks/useBoardActions.js'
import { computeInitialModules } from '../utils/board-initial.js'
import { useBoardStartup } from '../hooks/useBoardStartup.js'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape.js'
import { useMergeUserDefs } from '../hooks/useMergeUserDefs.js'



export default function JamBoard(props) {
  const API_BASE = 'http://localhost:8080'
  const {
    boardRef,
    boardSize,
    setBoardSize,
    viewOffset,
    setViewOffset,
    isPanning,
    setIsPanning,
    gridBg,
    setGridBg,
  } = useBoardState()

  // 新增：同步恢复初始状态，避免刷新时跳动
  const cache = useMemo(() => getInitialStateFromCache(), [])
  const mergedUserDefs = useMemo(() => {
    if (cache.initialUserModuleDefs) {
      // 将持久化的模板与默认模板合并，并恢复 render
      const merged = { ...defaultUserModuleDefs }
      const restoredTpls = mapPersistedTemplatesToDefs(cache.initialUserModuleDefs, merged)
      return { ...merged, ...restoredTpls }
    }
    return defaultUserModuleDefs
  }, [cache.initialUserModuleDefs])

  // default internal states (used if not provided via props)
  // 构造默认布局：已抽取到 defs/defaultLayout.js
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedConnectable, setCollapsedConnectable] = useState(false)
  const [collapsedDecorative, setCollapsedDecorative] = useState(false)
  const [filterEnabledOnly, setFilterEnabledOnly] = useState(false)
  const [filterChangedOnly, setFilterChangedOnly] = useState(false)
  // isReady 由 useBoardStartup 管理
  const [isArranging, setIsArranging] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  // 页面提示与按钮加载态
  const [notice, setNotice] = useState(null) // { type:'success'|'error', message:string }
  const [summarizeLoading, setSummarizeLoading] = useState(false)
  const [processLoading, setProcessLoading] = useState(false)
  // 每个节点的流式输出（执行时实时写入），支持刷新后恢复
  const [nodeStreams, setNodeStreams] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.nodeStreams)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  // 全局：URL 导入弹窗（主页面级）
  const [urlImportForId, setUrlImportForId] = useState(null)
  const [urlInputText, setUrlInputText] = useState('')
  const [urlImportLoading, setUrlImportLoading] = useState(false)
  const [urlImportError, setUrlImportError] = useState('')
  useCloseOnEscape(!!urlImportForId, () => setUrlImportForId(null))

  // helpers moved to useBoardModel

  // 默认内部模块状态：优先从缓存恢复，否则使用默认布局
  const [internalModules, setInternalModules] = useState(() => computeInitialModules(cache, mergedUserDefs))

  // resolve state sources: external props or internal defaults
  const modules = props.modules ?? internalModules
  const setModules = props.setModules ?? setInternalModules
  const model = useBoardModel(modules, setModules)
  const links = props.links ?? model.links
  const setLinks = props.setLinks ?? model.setLinks
  const linking = props.linking ?? model.linking
  const setLinking = props.setLinking ?? model.setLinking
  const { editingId, setEditingId, lastEditedIdRef, showModuleList, setShowModuleList, initialModulesRef, userModuleDefs, setUserModuleDefs, bringToFront, addModuleFromDef, saveTemplateFromEditing, isChanged, finishLink } = model

  // 初始化一次初始模块快照（在 model 可用后）
  useEffect(() => {
    if (!initialModulesRef.current) {
      initialModulesRef.current = JSON.parse(JSON.stringify(modules))
    }
  }, [])

  // 基于当前视图中心创建新模块：已抽取到 useBoardActions

  // 将恢复的模板合并到用户模板定义（初始合并一次）
  useMergeUserDefs(mergedUserDefs, setUserModuleDefs)

  // 本地持久化：通过 Hook 管理（仅保存，不恢复）
  useBoardPersistence({
    modules,
    links,
    viewOffset,
    userModuleDefs,
  })

  // 新增：自动编排与重置布局
  const autoArrange = useAutoArrange({
    modules,
    setModules,
    boardSize,
    setViewOffset,
    viewOffset,
    initialModulesRef,
  })

  // 启动阶段：同步恢复的视图偏移与连线，并控制可见性（抽取到 Hook）
  const { isReady } = useBoardStartup({ cache, boardSize, setViewOffset, setLinks, autoArrange })

  // 清理布局：已抽取到 useBoardActions

  // 新增：恢复默认布局并自动编排：已抽取到 useBoardActions

  // 新增：一键清空画板：已抽取到 useBoardActions

  // 支持 ESC 关闭清空弹窗（抽取到 Hook）
  useCloseOnEscape(showClearConfirm, () => setShowClearConfirm(false))

  // 背景拖拽以平移画板：已抽取到 useBoardActions

  // 导出当前编排数据：已抽取到 useBoardActions

  // 导入编排数据：已抽取到 useBoardActions

  const actions = useBoardActions({
    modules,
    links,
    boardSize,
    viewOffset,
    setModules,
    setLinks,
    linking,
    setLinking,
    setEditingId,
    addModuleFromDef,
    userModuleDefs,
    setIsArranging,
    autoArrange,
    setViewOffset,
    initialModulesRef,
    mergedUserDefs,
    setShowClearConfirm,
    setIsPanning,
    setNodeStreams,
  })
  const { addModuleAtCurrentView, clearCacheAndArrange, restoreDefaultLayout, clearBoardInstances, onBackgroundPointerDown, exportBoard, importBoard, summarizeToBackend, processGraphStreaming } = actions

  // 包装交互：按钮触发 + 页面提示
  const handleSummarize = async () => {
    try {
      setSummarizeLoading(true)
      const ok = await summarizeToBackend()
      setNotice({ type: ok ? 'success' : 'error', message: ok ? '代理图生成成功' : '代理图生成失败' })
    } catch (e) {
      setNotice({ type: 'error', message: '代理图生成失败' })
    } finally {
      setSummarizeLoading(false)
    }
  }

  const handleProcess = async () => {
    try {
      setProcessLoading(true)
      const ok = await processGraphStreaming()
      setNotice({ type: ok ? 'success' : 'error', message: ok ? '执行成功（流式完成）' : '执行失败' })
    } catch (e) {
      setNotice({ type: 'error', message: '执行失败' })
    } finally {
      setProcessLoading(false)
    }
  }

  // 自动隐藏提示
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2400)
    return () => clearTimeout(t)
  }, [notice])

  // 持久化：当流式输出变化时写入缓存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.nodeStreams, JSON.stringify(nodeStreams))
    } catch {}
  }, [nodeStreams])

  // 兜底：刷新/关闭页面前同步写入，避免最后一段丢失
  useEffect(() => {
    const handler = () => {
      try {
        localStorage.setItem(STORAGE_KEYS.nodeStreams, JSON.stringify(nodeStreams))
      } catch {}
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [nodeStreams])

  // 打开/关闭 URL 导入弹窗（由模块调用）
  const openUrlDialog = (id) => {
    setUrlImportForId(id)
    setUrlInputText('')
    setUrlImportLoading(false)
    setUrlImportError('')
  }
  const closeUrlDialog = () => {
    setUrlImportForId(null)
    setUrlInputText('')
    setUrlImportLoading(false)
    setUrlImportError('')
  }

  // 执行 URL 导入并写回指定模块 payload
  const importUrlToModule = async () => {
    const url = urlInputText.trim()
    if (!url || !urlImportForId) return
    try {
      setUrlImportLoading(true)
      setUrlImportError('')
      const prevId = extractImageIdFromPayload(modules[urlImportForId]?.payload)
      const resp = await fetch(`${API_BASE}/api/images/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prevId })
      })
      if (!resp.ok) throw new Error('url upload failed')
      const json = await resp.json()
      if (json?.url) {
        // 更新对应模块的图片数据
        setModules(prev => ({
          ...prev,
          [urlImportForId]: {
            ...prev[urlImportForId],
            payload: {
              ...(prev[urlImportForId]?.payload || {}),
              imageUrl: json.url,
              imageId: json.id,
              src: null,
            }
          }
        }))
        closeUrlDialog()
        setEditingId(null)
      } else {
        // 后端未返回：降级直接使用原始URL显示
        setModules(prev => ({
          ...prev,
          [urlImportForId]: {
            ...prev[urlImportForId],
            payload: {
              ...(prev[urlImportForId]?.payload || {}),
              imageUrl: null,
              imageId: null,
              src: url,
            }
          }
        }))
        closeUrlDialog()
        setEditingId(null)
      }
    } catch (e) {
      // 网络错误：降级直接使用原始URL显示
      setModules(prev => ({
        ...prev,
        [urlImportForId]: {
          ...prev[urlImportForId],
          payload: {
            ...(prev[urlImportForId]?.payload || {}),
            imageUrl: null,
            imageId: null,
            src: url,
          }
        }
      }))
      closeUrlDialog()
      setEditingId(null)
    } finally {
      setUrlImportLoading(false)
    }
  }

  return (
    <div ref={boardRef} className="jam-wrapper" onPointerDown={onBackgroundPointerDown} style={{ position: 'relative', visibility: 'visible', backgroundPosition: viewOffset.x + 'px ' + viewOffset.y + 'px', '--grid-bg': gridBg }}>
      <BoardToolbar
        onExport={exportBoard}
        onSummarizeBackend={handleSummarize}
        onProcessStream={handleProcess}
        summarizeLoading={summarizeLoading}
        processLoading={processLoading}
        onAutoArrange={clearCacheAndArrange}
        gridBg={gridBg}
        setGridBg={setGridBg}
        showModuleList={showModuleList}
        setShowModuleList={setShowModuleList}
        onClearBoard={() => setShowClearConfirm(true)}
        onRestoreDefault={restoreDefaultLayout}
        onImport={importBoard}
      />
      {notice && (
        <div className="toast" role="status" aria-live="polite" style={{ position:'fixed', right:8, top:50, zIndex:10020, background:'#fff', border:'2px solid #111', borderRadius:10, padding:'8px 12px', boxShadow:'0 6px 18px rgba(0,0,0,0.18)', color: notice.type==='error' ? '#b00020' : '#111', fontWeight:800 }}>
          {notice.message}
        </div>
      )}
      {showModuleList && (
        <ModuleListPanel
          modules={modules}
          setModules={setModules}
          isChanged={isChanged}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterEnabledOnly={filterEnabledOnly}
          setFilterEnabledOnly={setFilterEnabledOnly}
          filterChangedOnly={filterChangedOnly}
          setFilterChangedOnly={setFilterChangedOnly}
          collapsedConnectable={collapsedConnectable}
          setCollapsedConnectable={setCollapsedConnectable}
          collapsedDecorative={collapsedDecorative}
          setCollapsedDecorative={setCollapsedDecorative}
          userModuleDefs={userModuleDefs}
          addModuleFromDef={addModuleAtCurrentView}
          canSaveFromEditing={!!editingId || !!lastEditedIdRef.current}
          saveTemplateFromEditing={saveTemplateFromEditing}
        />
      )}
      {isReady && (
        <BoardStage
          modules={modules}
          setModules={setModules}
          links={links}
          setLinks={setLinks}
          linking={linking}
          setLinking={setLinking}
          boardSize={boardSize}
          viewOffset={viewOffset}
          isPanning={isPanning}
          editingId={editingId}
          setEditingId={setEditingId}
          bringToFront={bringToFront}
          onEnterEdit={(id) => { setEditingId(id); lastEditedIdRef.current = id; }}
          onFinishLink={finishLink}
          isArranging={isArranging}
          openUrlDialog={openUrlDialog}
          nodeStreams={nodeStreams}
          onClearNodeStream={(nid) => {
            try {
              setNodeStreams((prev) => {
                const next = { ...(prev || {}) }
                delete next[nid]
                return next
              })
            } catch {}
          }}
        />
      )}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="clear-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 id="clear-title">清空画板</h3></div>
            <div className="modal-body">确认清空画板？这将删除所有实例和连线，此操作不可撤销。</div>
            <div className="modal-actions">
              <button onClick={() => setShowClearConfirm(false)}>取消</button>
              <button className="danger" onClick={clearBoardInstances}>确认清空</button>
            </div>
          </div>
        </div>
      )}
      {(!isReady || isArranging) && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div className="loading-text">{!isReady ? '加载画板中…' : '正在整理布局…'}</div>
        </div>
      )}

      {urlImportForId && (
        <div className="modal-overlay" onClick={closeUrlDialog}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="url-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 id="url-title">通过 URL 导入图片</h3></div>
            <div className="modal-body">
              <input
                className="url-input"
                type="text"
                placeholder="粘贴图片 URL"
                value={urlInputText}
                onChange={(e) => setUrlInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') importUrlToModule() }}
                autoFocus
              />
              {urlImportError && (
                <div style={{ marginTop: 8, color: '#b00020', fontSize: 14 }}>{urlImportError}</div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={closeUrlDialog}>取消</button>
              <button onClick={importUrlToModule} disabled={urlImportLoading}>{urlImportLoading ? '导入中…' : '导入'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
  // 提取旧图片ID（用于上传时传给后端删除旧资源）
  const extractImageIdFromPayload = (pid) => {
    if (!pid) return null
    if (pid.imageId) return String(pid.imageId)
    const url = pid.imageUrl
    if (!url) return null
    try {
      const u = new URL(url, window.location.origin)
      const parts = u.pathname.split('/')
      return parts[parts.length - 1] || null
    } catch {
      const parts = String(url).split('/')
      return parts[parts.length - 1] || null
    }
  }