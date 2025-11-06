import React from 'react'

export default function IndecisiveText({ payload, onPayloadChange, edit }) {
  const green = payload?.green ?? 'Indecisive'
  const middle = payload?.middle ?? ' - i like everything '
  const plus = payload?.plus ?? '+1'
  return (
    <div className="indecisive" data-id="indecisive">
      <span
        className="green"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ green: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ green: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {green}
      </span>
      <span
        className="middle"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ middle: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ middle: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {middle}
      </span>
      <span
        className="plus"
        data-editable="true"
        contentEditable={edit?.isEditing}
        suppressContentEditableWarning
        onInput={(e) => { onPayloadChange?.({ plus: e.currentTarget.innerText }) }}
        onBlur={(e) => { onPayloadChange?.({ plus: e.currentTarget.innerText }); edit?.stopEditing?.(); }}
      >
        {plus}
      </span>
    </div>
  )
}