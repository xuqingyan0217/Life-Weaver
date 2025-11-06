import React from 'react'

export default function ActionCard({ payload, onPayloadChange, edit }) {
  const items = payload?.items ?? ['View Report', 'View Invoice', 'Medical History', 'Delete Appt']
  return (
    <div className="action-card" data-id="action-card">
      <ul>
        {items.map((text, idx) => (
          <li
            key={idx}
            data-editable="true"
            contentEditable={edit?.isEditing}
            suppressContentEditableWarning
            onInput={(e) => {
              const next = [...items]
              next[idx] = e.currentTarget.innerText
              onPayloadChange?.({ items: next })
            }}
            onBlur={(e) => {
              const next = [...items]
              next[idx] = e.currentTarget.innerText
              onPayloadChange?.({ items: next })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}