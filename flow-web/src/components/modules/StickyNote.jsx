import React from 'react'

export default function StickyNote({ payload, onPayloadChange, edit }) {
  const title = payload?.title ?? 'OH YES!!!!\nFigma Jam is\nhere'
  return (
    <article className="sticky-note" data-id="sticky-note">
      <div className="sticky-content">
      <div
        className="sticky-title"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ title: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ title: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {title}
      </div>
        <div className="sticky-footer">
          <div className="heart" aria-label="heart" />
        </div>
      </div>
    </article>
  )
}