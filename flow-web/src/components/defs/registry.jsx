// User module registry for JamBoard
// Define default user module templates and expose helpers to register/unregister.

import React from 'react'
import QuoteCard from '../modules/QuoteCard.jsx'
import { builtinModuleDefs, builtinStickerDefs } from './builtins.jsx'

export const defaultUserModuleDefs = {
  ...builtinModuleDefs,
  ...builtinStickerDefs,
  'quote-card': {
    name: '默认卡片模板',
    connectable: true,
    defaultSize: { w: 220, h: 120 },
    defaultPayload: { text: 'Stay hungry, stay foolish.' },
    render: (m, onPayloadChange, edit) => (
      <QuoteCard payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
}

// In-memory registry. You can build on this later.
const registry = { ...defaultUserModuleDefs }

export function getUserModuleDefs() {
  return registry
}

export function registerUserModule(defId, def) {
  registry[defId] = def
}

export function unregisterUserModule(defId) {
  delete registry[defId]
}