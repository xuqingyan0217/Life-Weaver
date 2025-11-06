import React from 'react'

export default function OhDear({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? 'OH DEAR'
  return (
    <div
      className="sticker oh-dear"
      data-editable="true"
      contentEditable={edit?.isEditing}
      suppressContentEditableWarning
      onInput={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }) }}
      onBlur={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }); edit?.stopEditing?.() }}
      style={{ display:'inline-block' }}
    >{text}</div>
  )
}