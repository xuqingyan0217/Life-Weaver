import { builtinModuleDefs, builtinStickerDefs } from './builtins.jsx'

// 构造默认布局（与初始内部默认一致）
export const buildDefaultModules = () => ({
  'agenda-panel': { x: 32, y: 36, w: 320, h: 380, z: 1, payload: { title: 'Meeting Agenda', date: 'APRIL 12, 2021', summaryTitle: 'Meeting Summary', summaryText: 'Have as much fun as you can please.', actionsTitle: 'Action Items:', actions: ['Dribble', 'More dribble', 'More stickers'], notesTitle: 'Notes & Next Steps:', notesText: 'Make sure you tell Wolff, thanks for the coffee!', myName: 'my name is\nMaria.' }, render: builtinModuleDefs['agenda-panel'].render },
  'sticky-note': { x: 360, y: 120, w: 220, h: 150, z: 2, payload: { title: 'OH YES!!!!\nFigma Jam is\nhere' }, render: builtinModuleDefs['sticky-note'].render },
  'action-card': { x: 650, y: 300, w: 140, h: 110, z: 2, payload: { items: ['View Report', 'View Invoice', 'Medical History', 'Delete Appt'] }, render: builtinModuleDefs['action-card'].render },
  'cta-button': { x: 820, y: 160, w: 150, h: 38, z: 2, payload: { label: 'Add Dribble' }, render: builtinModuleDefs['cta-button'].render },
  'banner': { x: 620, y: 40, w: 160, h: 60, z: 1, payload: { text: 'GAME OVER' }, render: builtinModuleDefs['banner'].render },
  'feedback': { x: 720, y: 120, w: 90, h: 110, z: 1, payload: { title: 'Feedback\nWANTED' }, render: builtinModuleDefs['feedback'].render },
  'key-label': { x: 860, y: 60, w: 80, h: 80, z: 1, payload: { label: 'command' }, render: builtinModuleDefs['key-label'].render },
  'emoji-face': { x: 820, y: 280, w: 140, h: 140, z: 1, connectable: false, editable: false, render: builtinModuleDefs['emoji-face'].render },
  'photo': { x: 470, y: 290, w: 150, h: 130, z: 1, payload: { src: null }, render: builtinModuleDefs['photo'].render },
  'thumbs-up': { x: 700, y: 250, w: 120, h: 100, z: 1, connectable: false, editable: false, render: builtinModuleDefs['thumbs-up'].render },
  'score100': { x: 420, y: 60, w: 70, h: 36, z: 3, connectable: false, payload: { text: '100' }, render: builtinStickerDefs['score100'].render },
  'oh-dear': { x: 350, y: 280, w: 130, h: 36, z: 3, connectable: false, payload: { text: 'OH DEAR' }, render: builtinStickerDefs['oh-dear'].render },
  'love-it': { x: 915, y: 210, w: 120, h: 36, z: 3, connectable: false, payload: { text: 'love it.' }, render: builtinStickerDefs['love-it'].render },
  'magic': { x: 520, y: 100, w: 110, h: 36, z: 3, connectable: false, payload: { text: 'MAGIC' }, render: builtinStickerDefs['magic'].render },
  'indecisive': { x: 760, y: 430, w: 280, h: 26, z: 1, connectable: false, payload: { green: 'Indecisive', middle: ' - i like everything ', plus: '+1' }, render: builtinModuleDefs['indecisive'].render },
})