import React, { useMemo } from 'react'
import LinkLayer from '../layers/LinkLayer.jsx'
import ConnectorLayer from '../layers/ConnectorLayer.jsx'
import ModuleItem from './ModuleItem.jsx'

export default function BoardStage({
  modules,
  setModules,
  links,
  setLinks,
  linking,
  setLinking,
  boardSize,
  viewOffset,
  isPanning,
  editingId,
  setEditingId,
  bringToFront,
  onEnterEdit,
  onFinishLink,
  isArranging,
  openUrlDialog,
  nodeStreams,
  onClearNodeStream,
}) {
  const enabledModulesEntries = useMemo(() => (
    Object.entries(modules).filter(([id, m]) => m.enabled !== false)
  ), [modules])

  const enabledModulesMap = useMemo(() => (
    Object.fromEntries(enabledModulesEntries)
  ), [enabledModulesEntries])

  const filteredLinks = useMemo(() => (
    (links || []).filter((l) => {
      const from = modules[l.from]
      const to = modules[l.to]
      return !!from && !!to && (from.enabled !== false) && (to.enabled !== false)
    })
  ), [links, modules])

  return (
    <div className={`board-stage ${isPanning ? 'panning' : ''} ${isArranging ? 'arranging' : ''}`} style={{ transform: `translate(${viewOffset.x}px, ${viewOffset.y}px)`, transformOrigin: '0 0' }}>
      {enabledModulesEntries.map(([id, m]) => (
        <ModuleItem
          key={id}
          id={id}
          m={m}
          editingId={editingId}
          setEditingId={setEditingId}
          setModules={setModules}
          bringToFront={bringToFront}
          onEnterEdit={onEnterEdit}
          setLinks={setLinks}
          openUrlDialog={openUrlDialog}
          nodeStreamText={nodeStreams ? nodeStreams[id] : ''}
          onClearNodeStream={onClearNodeStream}
        />
      ))}
      <LinkLayer
        modules={enabledModulesMap}
        links={filteredLinks}
        linking={linking}
        size={boardSize}
      />
      <ConnectorLayer
        modules={enabledModulesMap}
        links={filteredLinks}
        setLinks={setLinks}
        linking={linking}
        setLinking={setLinking}
        onFinishLink={onFinishLink}
        size={boardSize}
      />
    </div>
  )
}