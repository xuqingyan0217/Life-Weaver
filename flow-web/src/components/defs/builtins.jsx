import React from 'react'
import AgendaPanel from '../modules/AgendaPanel.jsx'
import StickyNote from '../modules/StickyNote.jsx'
import ActionCard from '../modules/ActionCard.jsx'
import CtaAddDribble from '../modules/CtaAddDribble.jsx'
import GameOverSign from '../modules/GameOverSign.jsx'
import FeedbackCard from '../modules/FeedbackCard.jsx'
import CommandKey from '../modules/CommandKey.jsx'
import EmojiFace from '../modules/EmojiFace.jsx'
import DogPhoto from '../modules/DogPhoto.jsx'
import ThumbsUp from '../modules/ThumbsUp.jsx'
import IndecisiveText from '../stickers/IndecisiveText.jsx'
import MagicText from '../stickers/MagicText.jsx'
import Score100 from '../stickers/Score100.jsx'
import OhDear from '../stickers/OhDear.jsx'
import LoveIt from '../stickers/LoveIt.jsx'

// 内置模块类型定义：统一默认尺寸、可连接性、默认数据与渲染器
export const builtinModuleDefs = {
  'agenda-panel': {
    name: '议程面板',
    connectable: true,
    defaultSize: { w: 320, h: 380 },
    defaultPayload: { title: 'Meeting Agenda', date: 'APRIL 12, 2021', summaryTitle: 'Meeting Summary', summaryText: 'Have as much fun as you can please.', actionsTitle: 'Action Items:', actions: ['Dribble', 'More dribble', 'More stickers'], notesTitle: 'Notes & Next Steps:', notesText: 'Keep dribbling and playing around', myName: 'my name is\nMaria.' },
    render: (m, onPayloadChange, edit) => (
      <AgendaPanel payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'sticky-note': {
    name: '便签',
    connectable: true,
    defaultSize: { w: 220, h: 150 },
    defaultPayload: { title: 'OH YES!!!!\nFigma Jam is\nhere' },
    render: (m, onPayloadChange, edit) => (
      <StickyNote payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'action-card': {
    name: '行动卡片',
    connectable: true,
    defaultSize: { w: 140, h: 110 },
    defaultPayload: { items: ['View Report', 'View Invoice', 'Medical History', 'Delete Appt'] },
    render: (m, onPayloadChange, edit) => (
      <ActionCard payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'cta-button': {
    name: 'CTA Button',
    connectable: true,
    defaultSize: { w: 150, h: 38 },
    defaultPayload: { label: 'Add Dribble' },
    render: (m, onPayloadChange, edit) => (
      <CtaAddDribble payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'banner': {
    name: 'Banner',
    connectable: true,
    defaultSize: { w: 160, h: 60 },
    defaultPayload: { text: 'GAME OVER' },
    render: (m, onPayloadChange, edit) => (
      <GameOverSign payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'feedback': {
    name: 'Feedback',
    connectable: true,
    defaultSize: { w: 90, h: 110 },
    defaultPayload: { title: 'Feedback\nWANTED' },
    render: (m, onPayloadChange, edit) => (
      <FeedbackCard payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'key-label': {
    name: 'Key Label',
    connectable: true,
    defaultSize: { w: 80, h: 80 },
    defaultPayload: { label: 'command' },
    render: (m, onPayloadChange, edit) => (
      <CommandKey payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'emoji-face': {
    name: '表情',
    connectable: false,
    editable: false,
    defaultSize: { w: 140, h: 140 },
    defaultPayload: null,
    render: () => <EmojiFace />,
  },
  'photo': {
    name: 'Photo',
    connectable: true,
    defaultSize: { w: 150, h: 130 },
    defaultPayload: { src: null },
    render: (m, onPayloadChange, edit) => (
      <DogPhoto payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'thumbs-up': {
    name: '点赞',
    connectable: false,
    editable: false,
    defaultSize: { w: 120, h: 100 },
    defaultPayload: null,
    render: () => <ThumbsUp />,
  },
  'indecisive': {
    name: '犹豫条幅',
    connectable: false,
    defaultSize: { w: 280, h: 26 },
    defaultPayload: { green: 'Indecisive', middle: ' - i like everything ', plus: '+1' },
    render: (m, onPayloadChange, edit) => (
      <IndecisiveText payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
}

export const builtinStickerDefs = {
  'magic': {
    name: 'MAGIC 贴纸',
    connectable: false,
    defaultSize: { w: 110, h: 36 },
    defaultPayload: { text: 'MAGIC' },
    render: (m, onPayloadChange, edit) => (
      <MagicText payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'score100': {
    name: '100 分贴纸',
    connectable: false,
    defaultSize: { w: 70, h: 36 },
    defaultPayload: { text: '100' },
    render: (m, onPayloadChange, edit) => (
      <Score100 payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'oh-dear': {
    name: 'OH DEAR 贴纸',
    connectable: false,
    defaultSize: { w: 130, h: 36 },
    defaultPayload: { text: 'OH DEAR' },
    render: (m, onPayloadChange, edit) => (
      <OhDear payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
  'love-it': {
    name: 'love it. 贴纸',
    connectable: false,
    defaultSize: { w: 120, h: 36 },
    defaultPayload: { text: 'love it.' },
    render: (m, onPayloadChange, edit) => (
      <LoveIt payload={m.payload} onPayloadChange={onPayloadChange} edit={edit} />
    ),
  },
}