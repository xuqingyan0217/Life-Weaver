import React from 'react'

export default function CtaAddDribble({ payload, onPayloadChange, edit }) {
  const label = payload?.label ?? 'Add Dribble'
  return (
    <button className="cta-add-dribble" data-id="cta-add-dribble">
      <span
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ label: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ label: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {label}
      </span>
    </button>
  )
}