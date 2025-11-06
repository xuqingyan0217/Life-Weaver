import React, { useState } from 'react'
import { resolveDefForInstance } from '../../hooks/useBoardPersistence.js'

export default function ModuleListPanel({
  modules,
  setModules,
  isChanged,
  searchQuery,
  setSearchQuery,
  filterEnabledOnly,
  setFilterEnabledOnly,
  filterChangedOnly,
  setFilterChangedOnly,
  collapsedConnectable,
  setCollapsedConnectable,
  collapsedDecorative,
  setCollapsedDecorative,
  userModuleDefs,
  addModuleFromDef,
  canSaveFromEditing,
  saveTemplateFromEditing,
}) {
  const [collapsedMyConnectable, setCollapsedMyConnectable] = useState(false)
  const [collapsedMyDecorative, setCollapsedMyDecorative] = useState(false)
  return (
    <div className="module-list-panel">
      <h4>模块清单（导出仅包含已选）</h4>
      <div className="search-row">
        <input type="text" placeholder="搜索模块…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <button
          className="toggle-btn"
          data-active={filterEnabledOnly}
          onClick={() => setFilterEnabledOnly((v) => !v)}
          title="仅显示已启用模块"
        >仅启用</button>
        <button
          className="toggle-btn"
          data-active={filterChangedOnly}
          onClick={() => setFilterChangedOnly((v) => !v)}
          title="仅显示有改动的模块"
        >仅改动</button>
      </div>
      <div className="list">
        <div className="group">
          <div className="group-header" onClick={() => setCollapsedConnectable((v) => !v)}>
            <span>可连接模块</span>
            <span className="count">{Object.entries(modules).filter(([id,m]) => m.connectable !== false).length}</span>
            <span className="collapse">{collapsedConnectable ? '▶' : '▼'}</span>
          </div>
          {!collapsedConnectable && (
            <div className="tile-grid">
              {Object.entries(modules)
                .filter(([id, m]) => m.connectable !== false)
                .filter(([id, m]) => (filterEnabledOnly ? m.enabled !== false : true))
                .filter(([id, m]) => (filterChangedOnly ? isChanged(id, m) : true))
                .filter(([id]) => (searchQuery ? id.toLowerCase().includes(searchQuery.toLowerCase()) : true))
                .sort((a,b) => {
                  const ae = a[1].enabled !== false ? 1 : 0
                  const be = b[1].enabled !== false ? 1 : 0
                  return be - ae || a[0].localeCompare(b[0])
                })
                .map(([id, m]) => {
                  const enabled = m.enabled !== false
                  const changed = isChanged(id, m)
                  return (
                    <div
                      key={id}
                      className={`module-tile ${enabled ? 'enabled' : 'disabled'} ${changed ? 'changed' : ''}`}
                      role="button"
                      aria-pressed={enabled}
                      onClick={() => {
                        const nextEnabled = !enabled
                        setModules((prev) => ({ ...prev, [id]: { ...prev[id], enabled: nextEnabled } }))
                      }}
                      title={enabled ? '已启用，点击禁用' : '已禁用，点击启用'}
                    >
                      <span className="tile-label">{(resolveDefForInstance(id, userModuleDefs)?.name) || id}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
        <div className="group">
          <div className="group-header" onClick={() => setCollapsedDecorative((v) => !v)}>
            <span>贴纸/装饰</span>
            <span className="count">{Object.entries(modules).filter(([id,m]) => m.connectable === false).length}</span>
            <span className="collapse">{collapsedDecorative ? '▶' : '▼'}</span>
          </div>
          {!collapsedDecorative && (
            <div className="tile-grid">
              {Object.entries(modules)
                .filter(([id, m]) => m.connectable === false)
                .filter(([id, m]) => (filterEnabledOnly ? m.enabled !== false : true))
                .filter(([id, m]) => (filterChangedOnly ? isChanged(id, m) : true))
                .filter(([id]) => (searchQuery ? id.toLowerCase().includes(searchQuery.toLowerCase()) : true))
                .sort((a,b) => {
                  const ae = a[1].enabled !== false ? 1 : 0
                  const be = b[1].enabled !== false ? 1 : 0
                  return be - ae || a[0].localeCompare(b[0])
                })
                .map(([id, m]) => {
                  const enabled = m.enabled !== false
                  const changed = isChanged(id, m)
                  return (
                    <div
                      key={id}
                      className={`module-tile ${enabled ? 'enabled' : 'disabled'} ${changed ? 'changed' : ''}`}
                      role="button"
                      aria-pressed={enabled}
                      onClick={() => {
                        const nextEnabled = !enabled
                        setModules((prev) => ({ ...prev, [id]: { ...prev[id], enabled: nextEnabled } }))
                      }}
                      title={enabled ? '已启用，点击禁用' : '已禁用，点击启用'}
                    >
                      <span className="tile-label">{(resolveDefForInstance(id, userModuleDefs)?.name) || id}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
        <div className="group my-modules">
          <div className="group-header">
            <span>我的模块</span>
            <span className="count">{Object.keys(userModuleDefs).length}</span>
          </div>
          <div className="action-row" style={{ display:'flex', gap: 8, margin: '6px 0 12px' }}>
            <button className="action-btn primary" disabled title="暂不可用（与默认卡片模板重复）">新建默认卡片模板</button>
            <button className="action-btn" onClick={saveTemplateFromEditing} disabled={!canSaveFromEditing} title={!canSaveFromEditing ? '请先进入某模块的编辑模式' : '从最近编辑复制为模板'}>从当前编辑另存为模板</button>
          </div>
          <div className="group-header" onClick={() => setCollapsedMyConnectable((v) => !v)}>
            <span>可连接模板</span>
            <span className="count">{Object.entries(userModuleDefs).filter(([defId, def]) => def.connectable !== false).length}</span>
            <span className="collapse">{collapsedMyConnectable ? '▶' : '▼'}</span>
          </div>
          {!collapsedMyConnectable && (
            <div className="tile-grid">
              {Object.entries(userModuleDefs)
                .filter(([defId, def]) => def.connectable !== false)
                .map(([defId, def]) => (
                  <div
                    key={defId}
                    className="module-tile enabled"
                    role="button"
                    onClick={() => addModuleFromDef(defId)}
                    title="点击添加一个实例到画布"
                  >
                    <span className="tile-label">{def.name || defId}</span>
                  </div>
                ))}
            </div>
          )}
          <div className="group-header" onClick={() => setCollapsedMyDecorative((v) => !v)}>
            <span>贴纸/装饰模板</span>
            <span className="count">{Object.entries(userModuleDefs).filter(([defId, def]) => def.connectable === false).length}</span>
            <span className="collapse">{collapsedMyDecorative ? '▶' : '▼'}</span>
          </div>
          {!collapsedMyDecorative && (
            <div className="tile-grid">
              {Object.entries(userModuleDefs)
                .filter(([defId, def]) => def.connectable === false)
                .map(([defId, def]) => (
                  <div
                    key={defId}
                    className="module-tile enabled"
                    role="button"
                    onClick={() => addModuleFromDef(defId)}
                    title="点击添加一个实例到画布"
                  >
                    <span className="tile-label">{def.name || defId}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        <button onClick={() => {
          setModules((prev) => {
            const next = {}
            for (const [id, m] of Object.entries(prev)) next[id] = { ...m, enabled: true }
            return next
          })
        }}>全选</button>
        <button onClick={() => {
          setModules((prev) => {
            const next = {}
            for (const [id, m] of Object.entries(prev)) next[id] = { ...m, enabled: false }
            return next
          })
        }}>全不选</button>
      </div>
    </div>
  )
}