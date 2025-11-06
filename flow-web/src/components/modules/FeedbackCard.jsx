import React from 'react'

export default function FeedbackCard({ payload, onPayloadChange, edit }) {
  const title = payload?.title ?? 'Feedback\nWANTED'
  return (
    <div className="feedback-card" data-id="feedback-card">
      <div
        className="feedback-title"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ title: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ title: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {title}
      </div>
    </div>
  )
}