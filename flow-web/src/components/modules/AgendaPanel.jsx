import React from 'react'

export default function AgendaPanel({ payload, onPayloadChange, edit }) {
  const title = payload?.title ?? 'Meeting Agenda'
  const date = payload?.date ?? 'APRIL 12, 2021'
  const summaryTitle = payload?.summaryTitle ?? 'Meeting Summary'
  const summaryText = payload?.summaryText ?? 'Have as much fun as you can please.'
  const actions = payload?.actions ?? ['Dribble', 'More dribble', 'More stickers']
  const actionsTitle = payload?.actionsTitle ?? 'Action Items:'
  const notesTitle = payload?.notesTitle ?? 'Notes & Next Steps:'
  const notesText = payload?.notesText ?? 'Keep dribbling and playing around'
  const myName = payload?.myName ?? 'my name is\nMaria.'

  return (
    <section className="agenda-panel" data-id="agenda-panel">
      <div className="agenda-clip" />
      <header className="agenda-header">
        <h2
          data-editable="true"
          contentEditable={edit?.isEditing}
          suppressContentEditableWarning
          onInput={(e) => onPayloadChange?.({ title: e.currentTarget.innerText })}
          onBlur={(e) => onPayloadChange?.({ title: e.currentTarget.innerText })}
        >{title}</h2>
        <div
          className="agenda-date"
          data-editable="true"
          contentEditable={edit?.isEditing}
          suppressContentEditableWarning
          onInput={(e) => onPayloadChange?.({ date: e.currentTarget.innerText })}
          onBlur={(e) => onPayloadChange?.({ date: e.currentTarget.innerText })}
        >{date}</div>
      </header>
      <div className="agenda-body">
        <div className="agenda-summary">
          <h3
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => onPayloadChange?.({ summaryTitle: e.currentTarget.innerText })}
            onBlur={(e) => { onPayloadChange?.({ summaryTitle: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
          >{summaryTitle}</h3>
          <p
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => onPayloadChange?.({ summaryText: e.currentTarget.innerText })}
            onBlur={(e) => { onPayloadChange?.({ summaryText: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
          >{summaryText}</p>
        </div>
      <div className="agenda-actions">
          <h3
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => onPayloadChange?.({ actionsTitle: e.currentTarget.innerText })}
            onBlur={(e) => { onPayloadChange?.({ actionsTitle: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
          >{actionsTitle}</h3>
          <ol
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => {
              const lines = e.currentTarget.innerText.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)
              onPayloadChange?.({ actions: lines.length > 0 ? lines : [] })
            }}
            onBlur={(e) => {
              const lines = e.currentTarget.innerText.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)
              onPayloadChange?.({ actions: lines.length > 0 ? lines : [] })
              edit?.stopEditing?.()
            }}
          >
            {actions.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ol>
      </div>
        <div className="agenda-notes">
          <h3
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => onPayloadChange?.({ notesTitle: e.currentTarget.innerText })}
            onBlur={(e) => { onPayloadChange?.({ notesTitle: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
          >{notesTitle}</h3>
          <p
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => onPayloadChange?.({ notesText: e.currentTarget.innerText })}
            onBlur={(e) => { onPayloadChange?.({ notesText: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
          >{notesText}</p>
        </div>
      </div>
      <div
        className="sticker my-name"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ myName: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ myName: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >{myName}</div>
    </section>
  )
}