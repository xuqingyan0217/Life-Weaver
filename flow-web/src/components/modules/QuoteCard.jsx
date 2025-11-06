import React from 'react'

export default function QuoteCard({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? 'A good quote goes here.'
  return (
    <figure className="quote-card" style={{
      position: 'absolute', left: 0, top: 0,
      width: '100%', height: '100%',
      margin: 0,
      boxSizing: 'border-box',
      border: '1px solid #222', borderRadius: 8,
      background: '#fff', color: '#111',
      padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
    }}>
      <blockquote
        data-editable="true"
        contentEditable={!!edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => {
          const newText = e.currentTarget.innerText
          onPayloadChange?.({ text: newText })
        }}
        onBlur={(e) => {
          const newText = e.currentTarget.innerText
          onPayloadChange?.({ text: newText })
          edit?.stopEditing?.()
        }}
        style={{
          fontSize: 16, lineHeight: 1.4, margin: 0, fontStyle: 'italic',
          maxHeight: '100%', overflowY: 'auto', whiteSpace: 'pre-line', wordBreak: 'break-word',
        }}
      >
        {text}
      </blockquote>
    </figure>
  )
}