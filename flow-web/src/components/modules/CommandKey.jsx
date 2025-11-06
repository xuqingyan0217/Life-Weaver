import React from 'react'

export default function CommandKey({ payload, onPayloadChange, edit }) {
  const label = payload?.label ?? 'command'
  return (
    <div className="command-key" data-id="command-key">
      <div
        className="cmd-label"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ label: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ label: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {label}
      </div>
    </div>
  )
}