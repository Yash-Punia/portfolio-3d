import {useMemo} from 'react'
import {create} from 'zustand'
import {persist} from 'zustand/middleware'

/**
 * Every value the two handhelds and their screens are drawn from, in one flat,
 * editable record — the Handheld v2 tune. Open the page with `?tune` and
 * `TunePanel` drives these live; "Save as default" writes them back into
 * `DEFAULT_TUNE` below through `app/api/tune` (in `next dev` only).
 *
 * Units, by prefix:
 *
 * - `desk*` — the desk console. Sizes and positions are world units (1 = 100
 *   design px); the glass is in CSS px.
 * - `hh*` — the handheld. Positions (`*X`, `*Y`, `hhGlassTop`) are design px
 *   from the shell's top-left corner, as the design measures them; cap sizes
 *   are world units.
 * - `scr*` — the screen UI, in the panel's own CSS px. Colours are hex.
 * - `motion*`, `boot*` — the screen's motion, in ms and px.
 *
 * `DEFAULT_TUNE` is rewritten by the save route, so it holds values only — the
 * notes live here, on the interface.
 */
export interface Tune {
  /** Shared by every control on both shells: the tint a cap takes while pressed. */
  pressColor: string
  pressInk: string
  /** The ring a cap lights when its hidden twin in the page has keyboard focus. */
  focusColor: string

  deskWidth: number
  deskHeight: number
  deskDepth: number
  deskRadius: number
  deskShellTop: string
  deskShellBottom: string
  /** The glass, in CSS px — the size the desk screen is authored at. */
  deskGlassWidth: number
  deskGlassHeight: number
  deskGlassRadius: number
  /** Black edge between the glass and the shell, world units per side. */
  deskBezel: number
  deskWellRadius: number
  deskWellColor: string
  deskSeamOn: boolean
  deskSeamX: number
  deskSeamColor: string
  deskLedX: number
  deskLedY: number
  deskLedColor: string
  deskSerialY: number
  deskSerialSize: number
  deskSerialSpacing: number
  deskSerialColor: string
  deskDpadX: number
  deskDpadY: number
  deskDpadSpan: number
  deskDpadArm: number
  deskDpadDepth: number
  deskDpadColor: string
  deskDpadInk: string
  deskDpadDimple: string
  deskAX: number
  deskAY: number
  deskARadius: number
  deskBX: number
  deskBY: number
  deskBRadius: number
  deskCapHeight: number
  deskCapColor: string
  deskCapInk: string
  deskCapLetterSize: number
  /** How far past its cap a button answers a pointer, × the cap's radius. */
  deskHitScale: number
  /** "Open" and "Back", printed under A and B. Size and spacing in design px; gap in world units. */
  deskLabelColor: string
  deskLabelSize: number
  deskLabelSpacing: number
  deskLabelGap: number
  /** Camera: the share of the viewport's width and height the desk may take, and px held back vertically. */
  deskZoomWidth: number
  deskZoomHeight: number
  deskZoomMarginY: number

  hhWidth: number
  hhHeight: number
  hhDepth: number
  hhRadius: number
  hhShellTop: string
  hhShellBottom: string
  hhGlassWidth: number
  hhGlassHeight: number
  hhGlassTop: number
  hhGlassRadius: number
  hhBezel: number
  hhWellRadius: number
  hhWellColor: string
  hhLedX: number
  hhLedY: number
  hhLedColor: string
  hhSerialY: number
  hhSerialSize: number
  hhSerialSpacing: number
  hhSerialColor: string
  hhDpadX: number
  hhDpadY: number
  hhDpadSpan: number
  hhDpadArm: number
  hhDpadDepth: number
  hhDpadColor: string
  hhDpadInk: string
  hhDpadDimple: string
  hhAX: number
  hhAY: number
  hhARadius: number
  hhBX: number
  hhBY: number
  hhBRadius: number
  hhCapHeight: number
  hhCapColor: string
  hhCapInk: string
  hhCapLetterSize: number
  hhHitScale: number
  hhLabelColor: string
  hhLabelSize: number
  hhLabelSpacing: number
  hhLabelGap: number
  hhSpeakerOn: boolean
  hhSpeakerX: number
  hhSpeakerY: number
  hhSpeakerAngle: number
  hhSpeakerColor: string
  hhZoom: number

  /** The screen palette. `scrScrim` is the shade the key-art gradients fade from. */
  scrInk: string
  scrInkStrong: string
  scrSoft: string
  scrMuted: string
  scrLabel: string
  scrHint: string
  scrDim: string
  scrOff: string
  scrBg: string
  scrScrim: string
  scrFooter: string
  scrRule: string
  scrRuleSoft: string
  scrOutline: string
  scrAccent: string
  scrAccentInk: string
  /** The flat wash over the key art behind the Games text. */
  scrOverlayColor: string
  scrOverlayOpacity: number
  scrPreviewDelayMs: number

  /** Desk screen: type (title tracking in em) and the Games layout. */
  scrDeskTitleSize: number
  scrDeskTitleLeading: number
  scrDeskTitleTracking: number
  scrDeskKickerSize: number
  scrDeskBlurbSize: number
  scrDeskBlurbLeading: number
  scrDeskFactSize: number
  scrDeskFactLabelSize: number
  scrDeskFactGap: number
  scrDeskTabSize: number
  scrDeskHintSize: number
  scrDeskHintGap: number
  scrDeskInfoLeft: number
  scrDeskInfoBottom: number
  scrDeskInfoWidth: number
  scrDeskInfoGap: number
  scrDeskShelfBottom: number
  scrDeskTileWidth: number
  scrDeskTileHeight: number
  scrDeskTileSelectedWidth: number
  scrDeskTileSelectedHeight: number
  scrDeskTileGap: number
  scrDeskTileLabelSize: number

  /** Handheld screen: type and the Library layout. */
  scrHhTitleSize: number
  scrHhTitleLeading: number
  scrHhTitleTracking: number
  scrHhMetaSize: number
  scrHhTabSize: number
  scrHhHintSize: number
  scrHhHintGap: number
  scrHhArtHeight: number
  scrHhInfoLeft: number
  scrHhInfoGap: number
  /** How far below the art the title block's foot sits. */
  scrHhInfoOffset: number
  /** The shelf's foot, above the hint strip. */
  scrHhShelfBottom: number
  scrHhTileWidth: number
  scrHhTileHeight: number
  scrHhTileGap: number
  scrHhTileLabelSize: number

  /** Motion on the glass. Off under `prefers-reduced-motion` whatever these say. */
  motionOn: boolean
  motionMs: number
  motionRise: number
  motionStagger: number
  motionFadeMs: number
  motionHoverMs: number
  motionHoverLift: number
  motionHoverBright: number
  motionTileScale: number

  /** The power-on: the line, then the name and title, then the fade to Games. Times from page load. */
  bootOn: boolean
  bootLineMs: number
  bootNameDelayMs: number
  bootTitleDelayMs: number
  bootRevealMs: number
  bootHoldMs: number
  bootFadeMs: number
  bootDeskNameSize: number
  bootDeskTitleSize: number
  bootHhNameSize: number
  bootHhTitleSize: number
  bootTrackingFrom: number
  bootTracking: number
  bootNameColor: string
  bootTitleColor: string
  bootBarColor: string
  bootBarWidth: number
}

export const DEFAULT_TUNE: Tune = {
  pressColor: '#2f7a2c',
  pressInk: '#e6f2e4',
  focusColor: '#5fd35a',
  deskWidth: 12.4,
  deskHeight: 6.4,
  deskDepth: 0.72,
  deskRadius: 1.6,
  deskShellTop: '#262625',
  deskShellBottom: '#181817',
  deskGlassWidth: 832,
  deskGlassHeight: 550,
  deskGlassRadius: 10,
  deskBezel: 0.1,
  deskWellRadius: 0.18,
  deskWellColor: '#050505',
  deskSeamOn: true,
  deskSeamX: 4.46,
  deskSeamColor: '#111110',
  deskLedX: -4.37,
  deskLedY: 2.57,
  deskLedColor: '#5fd35a',
  deskSerialY: -3.04,
  deskSerialSize: 10,
  deskSerialSpacing: 3,
  deskSerialColor: '#8f8f8f',
  deskDpadX: -5.23,
  deskDpadY: 0.49,
  deskDpadSpan: 1.44,
  deskDpadArm: 0.48,
  deskDpadDepth: 0.08,
  deskDpadColor: '#2d2d2b',
  deskDpadInk: '#7a7873',
  deskDpadDimple: '#252523',
  deskAX: 5.55,
  deskAY: 0.82,
  deskARadius: 0.3,
  deskBX: 4.91,
  deskBY: 0.3,
  deskBRadius: 0.3,
  deskCapHeight: 0.07,
  deskCapColor: '#2d2d2b',
  deskCapInk: '#c9c7c1',
  deskCapLetterSize: 15,
  deskHitScale: 1.25,
  deskLabelColor: '#8f8d87',
  deskLabelSize: 11,
  deskLabelSpacing: 0.4,
  deskLabelGap: 0.14,
  deskZoomWidth: 0.86,
  deskZoomHeight: 0.94,
  deskZoomMarginY: 60,
  hhWidth: 3.9,
  hhHeight: 8.44,
  hhDepth: 0.5,
  hhRadius: 0.4,
  hhShellTop: '#454545',
  hhShellBottom: '#484847',
  hhGlassWidth: 344,
  hhGlassHeight: 600,
  hhGlassTop: 46,
  hhGlassRadius: 14,
  hhBezel: 0.08,
  hhWellRadius: 0.2,
  hhWellColor: '#050505',
  hhLedX: 30,
  hhLedY: 22,
  hhLedColor: '#5fd35a',
  hhSerialY: 22,
  hhSerialSize: 8,
  hhSerialSpacing: 2.5,
  hhSerialColor: '#3e3e3b',
  hhDpadX: 93,
  hhDpadY: 742,
  hhDpadSpan: 1.38,
  hhDpadArm: 0.46,
  hhDpadDepth: 0.09,
  hhDpadColor: '#2d2d2b',
  hhDpadInk: '#7a7873',
  hhDpadDimple: '#252523',
  hhAX: 334,
  hhAY: 716,
  hhARadius: 0.32,
  hhBX: 259,
  hhBY: 752,
  hhBRadius: 0.29,
  hhCapHeight: 0.08,
  hhCapColor: '#2d2d2b',
  hhCapInk: '#c9c7c1',
  hhCapLetterSize: 16,
  hhHitScale: 1.2,
  hhLabelColor: '#8f8d87',
  hhLabelSize: 11,
  hhLabelSpacing: 0.4,
  hhLabelGap: 0.12,
  hhSpeakerOn: false,
  hhSpeakerX: 334,
  hhSpeakerY: 812,
  hhSpeakerAngle: -30,
  hhSpeakerColor: '#111110',
  hhZoom: 0.96,
  scrInk: '#edece8',
  scrInkStrong: '#d4d2cc',
  scrSoft: '#c9c7c1',
  scrMuted: '#a3a19b',
  scrLabel: '#8f8d87',
  scrHint: '#7a7873',
  scrDim: '#5f5d58',
  scrOff: '#4a4946',
  scrBg: '#0b0b0a',
  scrScrim: '#080807',
  scrFooter: '#080807',
  scrRule: '#222220',
  scrRuleSoft: '#1c1c1b',
  scrOutline: '#33332f',
  scrAccent: '#5fd35a',
  scrAccentInk: '#0d1a0c',
  scrOverlayColor: '#000000',
  scrOverlayOpacity: 0.5,
  scrPreviewDelayMs: 1500,
  scrDeskTitleSize: 48,
  scrDeskTitleLeading: 1.05,
  scrDeskTitleTracking: 0,
  scrDeskKickerSize: 12,
  scrDeskBlurbSize: 12,
  scrDeskBlurbLeading: 1.45,
  scrDeskFactSize: 9,
  scrDeskFactLabelSize: 12.5,
  scrDeskFactGap: 36,
  scrDeskTabSize: 13.5,
  scrDeskHintSize: 11.5,
  scrDeskHintGap: 22,
  scrDeskInfoLeft: 28,
  scrDeskInfoBottom: 186,
  scrDeskInfoWidth: 500,
  scrDeskInfoGap: 14,
  scrDeskShelfBottom: 44,
  scrDeskTileWidth: 126,
  scrDeskTileHeight: 71,
  scrDeskTileSelectedWidth: 140,
  scrDeskTileSelectedHeight: 79,
  scrDeskTileGap: 22,
  scrDeskTileLabelSize: 8.5,
  scrHhTitleSize: 38,
  scrHhTitleLeading: 0.86,
  scrHhTitleTracking: 0,
  scrHhMetaSize: 12.5,
  scrHhTabSize: 13,
  scrHhHintSize: 11,
  scrHhHintGap: 16,
  scrHhArtHeight: 330,
  scrHhInfoLeft: 16,
  scrHhInfoGap: 8,
  scrHhInfoOffset: 30,
  scrHhShelfBottom: 48,
  scrHhTileWidth: 112,
  scrHhTileHeight: 63,
  scrHhTileGap: 10,
  scrHhTileLabelSize: 11.5,
  motionOn: true,
  motionMs: 620,
  motionRise: 12,
  motionStagger: 85,
  motionFadeMs: 200,
  motionHoverMs: 160,
  motionHoverLift: 2,
  motionHoverBright: 1.1,
  motionTileScale: 1.03,
  bootOn: true,
  bootLineMs: 480,
  bootNameDelayMs: 380,
  bootTitleDelayMs: 640,
  bootRevealMs: 520,
  bootHoldMs: 1700,
  bootFadeMs: 480,
  bootDeskNameSize: 44,
  bootDeskTitleSize: 14,
  bootHhNameSize: 30,
  bootHhTitleSize: 12,
  bootTrackingFrom: 0.14,
  bootTracking: 0.02,
  bootNameColor: '#edece8',
  bootTitleColor: '#8f8d87',
  bootBarColor: '#5fd35a',
  bootBarWidth: 96,
}

/** One undoable change: the value a key had before it. A reset's entries share a `group`. */
export interface Change {
  key: keyof Tune
  prev: Tune[keyof Tune]
  at: number
  group?: number
}

/**
 * Edits to the same key closer together than this are one change, so a slider
 * drag or a typed number undoes in one step rather than one per input event.
 */
const MERGE_MS = 600

interface TuneState {
  values: Tune
  /** The panel's undo stack, oldest first. Not persisted: it belongs to the session. */
  history: Change[]
  set: <K extends keyof Tune>(key: K, value: Tune[K]) => void
  reset: () => void
  /**
   * Undo the latest change — to `key` only, when given (a row's own undo
   * button), or the latest of all (Ctrl+Z, which takes a whole reset back at
   * once). Returns what was undone, or null when there was nothing.
   */
  undo: (key?: keyof Tune) => Change[] | null
}

/**
 * Persisted, but hydrated only by the panel (`skipHydration`): a visitor who
 * never opens `?tune` always gets `DEFAULT_TUNE`, so a saved default reaches
 * everyone without a persist-version bump. Saved values merge over the
 * defaults, so a key added later never arrives `undefined`.
 */
export const useTune = create<TuneState>()(
  persist(
    (set, get) => ({
      values: DEFAULT_TUNE,
      history: [],
      set: (key, value) => {
        const {values, history} = get()
        if (values[key] === value) return
        const now = Date.now()
        const last = history.at(-1)
        const merge = last && last.key === key && !last.group && now - last.at < MERGE_MS
        set({
          values: {...values, [key]: value},
          history: merge
            ? [...history.slice(0, -1), {...last, at: now}]
            : [...history, {key, prev: values[key], at: now}],
        })
      },
      reset: () => {
        const {values, history} = get()
        const at = Date.now()
        const changes = (Object.keys(values) as (keyof Tune)[])
          .filter((key) => values[key] !== DEFAULT_TUNE[key])
          .map((key) => ({key, prev: values[key], at, group: at}))
        set({values: DEFAULT_TUNE, history: [...history, ...changes]})
      },
      undo: (key) => {
        const {values, history} = get()
        const index = history.findLastIndex((change) => key === undefined || change.key === key)
        const target = history[index]
        if (!target) return null
        // Ctrl+Z on a reset takes back every key it touched; a row's button only its own.
        const undone =
          key === undefined && target.group
            ? history.filter((change) => change.group === target.group)
            : [target]
        const next = {...values}
        for (const change of undone) Object.assign(next, {[change.key]: change.prev})
        set({values: next, history: history.filter((change) => !undone.includes(change))})
        return undone
      },
    }),
    {
      name: 'handheld-tune',
      version: 1,
      skipHydration: true,
      partialize: (state) => ({values: state.values}),
      merge: (persisted, current) => {
        const saved = (persisted as {values?: Partial<Tune>} | undefined)?.values
        return {...current, values: {...DEFAULT_TUNE, ...saved}, history: []}
      },
    },
  ),
)

export function useT(): Tune {
  return useTune((state) => state.values)
}

/** `#rrggbb` → `r, g, b`, for an `rgba()` with its own alpha. */
export function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/** The screen palette under the names the screen code reads. */
export function usePalette() {
  const t = useT()
  return useMemo(
    () => ({
      ink: t.scrInk,
      inkStrong: t.scrInkStrong,
      soft: t.scrSoft,
      muted: t.scrMuted,
      label: t.scrLabel,
      hint: t.scrHint,
      dim: t.scrDim,
      off: t.scrOff,
      screen: t.scrBg,
      screenRgb: rgb(t.scrBg),
      scrim: rgb(t.scrScrim),
      footer: t.scrFooter,
      rule: t.scrRule,
      ruleSoft: t.scrRuleSoft,
      outline: t.scrOutline,
      accent: t.scrAccent,
      accentInk: t.scrAccentInk,
      inkRgb: rgb(t.scrInk),
    }),
    [t],
  )
}

export type Palette = ReturnType<typeof usePalette>
