import React from 'react'

export default function MagicText({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? 'MAGIC'
  return (
    <div
      className="sticker magic"
      data-editable="true"
      contentEditable={edit?.isEditing}
      suppressContentEditableWarning
      onInput={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }) }}
      onBlur={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }); edit?.stopEditing?.() }}
      style={{ display:'inline-block' }}
    >{text}</div>
  )
}