/**
 * The design's values, copied out of `design/Portfolio Handheld v2.dc.html`
 * rather than derived. Plain constants: the old `?tune` panel is gone, and a
 * value that never changes at runtime does not need a store.
 *
 * No three.js here — the screen's DOM reads these too.
 */

/** The screen UI and the desk shell (design 4a/4b). */
export const C = {
  ink: '#edece8',
  inkStrong: '#d4d2cc',
  soft: '#c9c7c1',
  muted: '#a3a19b',
  label: '#8f8d87',
  hint: '#7a7873',
  dim: '#5f5d58',
  off: '#4a4946',
  screen: '#0b0b0a',
  scrim: '8, 8, 7',
  footer: '#080807',
  rule: '#222220',
  ruleSoft: '#1c1c1b',
  outline: '#33332f',
  accent: '#5fd35a',
  accentInk: '#0d1a0c',
  well: '#050505',
  /** The desk shell's top-to-bottom gradient. */
  shellTop: '#262625',
  shellMid: '#1c1c1b',
  shellBottom: '#181817',
  shellEdge: '#2e2e2c',
  cap: '#2d2d2b',
  capCentre: '#252523',
  capLight: '#e7e5df',
  capLightInk: '#141413',
  capInk: '#8f8d87',
  capInkStrong: '#c9c7c1',
  print: '#6a6863',
  printStrong: '#a3a19b',
  serial: '#3e3e3b',
  stageGlow: '#1d1d1c',
  stage: '#0d0d0c',
} as const

/**
 * The handheld's shell, in the original Game Boy's colours (the user's call:
 * the shell only — the screen keeps the design's dark UI).
 */
export const GB = {
  shell: '#c4bfb6',
  shellShade: '#b3ada3',
  bezel: '#5c5e6c',
  stripeMagenta: '#8e2a5c',
  stripeNavy: '#2b2f73',
  print: '#2b2f73',
  bezelPrint: '#b9b7c4',
  dpad: '#232325',
  ab: '#9a2a5a',
  pill: '#8d8b93',
  pillInk: '#3a3a40',
  led: '#e0303a',
  slot: '#8f8a82',
} as const

export const FONT = {
  ui: 'var(--font-schibsted), system-ui, sans-serif',
  display: 'var(--font-archivo), system-ui, sans-serif',
  mono: 'var(--font-jetbrains), ui-monospace, monospace',
} as const

/**
 * The screens' authored sizes in CSS px — the design's own — and so the size
 * every font and gap on them is written at. `ScreenHtml` scales the panel onto
 * the glass.
 *
 * The desk screen is the 4a device's: a 1240-wide body less two 150px control
 * columns, two 22px gaps and 22px of padding each side leaves a 852×570 well,
 * and 10px of bezel inside it leaves 832×550 of glass. (The standalone project
 * mock beside it is drawn 932 wide; the device is the source of truth.)
 */
export const PANEL = {
  desk: {width: 832, height: 550, radius: 10},
  handheld: {width: 344, height: 490, radius: 16},
} as const

/** How long the selection rests on a game before its preview clip plays. */
export const PREVIEW_DELAY_MS = 1500
