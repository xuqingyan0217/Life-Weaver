import React from 'react'

export default function GameOverSign({ payload, onPayloadChange, edit }) {
  const text = payload?.text ?? 'GAME OVER'
  return (
    <div className="game-over" aria-label="Game Over" data-id="game-over">
      <span
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ text: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {text}
      </span>
    </div>
  )
}