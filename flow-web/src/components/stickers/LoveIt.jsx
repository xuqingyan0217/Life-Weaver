import React from 'react'

export default function LoveIt({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? 'love it.'
  return (
    <div
      className="sticker love-it"
      data-editable="true"
      contentEditable={edit?.isEditing}
      suppressContentEditableWarning
      onInput={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }) }}
      onBlur={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }); edit?.stopEditing?.() }}
      style={{ display:'inline-block' }}
    >{text}</div>
  )
}