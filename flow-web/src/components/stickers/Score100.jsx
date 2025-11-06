import React from 'react'

export default function Score100({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? '100'
  return (
    <div
      className="sticker score100"
      data-editable="true"
      contentEditable={edit?.isEditing}
      suppressContentEditableWarning
      onInput={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }) }}
      onBlur={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }); edit?.stopEditing?.() }}
      style={{ display:'inline-block' }}
    >{text}</div>
  )
}