import {create} from 'zustand'
import {persist} from 'zustand/middleware'

/**
 * Every value the console's form and its firmware UI are built from, in one
 * flat, editable record.
 *
 * SPEC §4 forbids authoring the console as a GLTF precisely so the form stays
 * tweakable in code. This takes that one step further: the values are state, so
 * `<TuningPanel>` can drive them live in the browser and the numbers that feel
 * right can be pasted back into `DEFAULT_TUNING` below.
 *
 * One world unit is arbitrary — the camera derives its zoom from the footprint,
 * so scaling every dimension here rescales nothing on screen. Ratios are what
 * matter.
 */
export interface Tuning {
  bodyWidth: number
  bodyHeight: number
  bodyDepth: number
  bodyRadius: number
  /** Screen glass. 4:3 by default — the console is a square-ish object. */
  screenWidth: number
  screenHeight: number
  /** Bezel floor visible around the screen glass, per edge. */
  bezelPadding: number
  faceDepth: number
  /** How far the flaps sit inside the body outline, leaving a rim. */
  flapInset: number
  flapDepth: number
  flapRadius: number
  /** Border of the moulded panel on each flap face. */
  panelMargin: number
  seamGap: number
  seamBandWidth: number
  openAngleDeg: number
  /** Info monitor on the left flap: its height, and its centre in flap space. */
  monitorY: number
  monitorHeight: number
  /** Joystick, in the lower half of the left flap. */
  joystickY: number
  joystickRadius: number
  /** ABXY diamond: centre of the cluster, cap distance from it, cap size. */
  abxyY: number
  abxySpacing: number
  abxyRadius: number
  /** Theme toggle, at the top of the right flap. */
  toggleY: number
  toggleRadius: number
  /** Multipliers on the computed camera zoom, for nudging the framing. */
  zoomScaleClosed: number
  zoomScaleOpen: number
  shellColor: string
  bezelColor: string
  accentColor: string
  buttonColor: string
  /** Screen background when powered — SPEC §9's dark theme background. */
  screenColor: string
  /** Screen background in the light theme — SPEC §9's warm paper-white. */
  screenLightColor: string
  /**
   * How hard the glass is driven, per theme. The dark screen's background is a
   * near-black that tone mapping eats, so it needs a lot; the light theme's
   * warm paper-white already reads as lit, and the same value on it renders as
   * flat white rather than a backlit LCD.
   */
  screenEmissiveIntensity: number
  screenEmissiveIntensityLight: number

  /*
    The firmware UI on the screen (SPEC §7, §8). These are CSS pixels in the
    panel's own authored space, not world units: the panel is laid out at
    `fwPanelWidth` pixels wide and then scaled onto the glass, so every size
    below is a fixed ratio of the screen however the console is proportioned.
    Lowering `fwPanelWidth` alone magnifies the whole UI.
  */
  fwPanelWidth: number
  /** Status bar: its height and the size of the mono chrome in it. */
  fwStatusHeight: number
  fwStatusFont: number
  /** Rail: its inset from the left edge and the space above the tiles. */
  fwRailX: number
  fwRailTop: number
  fwTileWidth: number
  fwTileHeight: number
  fwTileGap: number
  /** SPEC §8: the selected tile scales up, the rest go quiet. */
  fwSelectedScale: number
  fwUnselectedOpacity: number
  /** Space between the rail and the title block under it. */
  fwBlockGap: number
  /** Space between the title, the meta line and the blurb. */
  fwTextGap: number
  fwTitleFont: number
  fwMetaFont: number
  fwBodyFont: number
  /** Height of the cover image at the top of the detail view. */
  fwDetailCoverHeight: number
  /** Timeline: space above the axis, spacing along it, and the dot size. */
  fwAxisTop: number
  fwDotGap: number
  fwDotSize: number
  /** Space between the axis and the selected entry's panel below it. */
  fwEntryGap: number
}

export const DEFAULT_TUNING: Tuning = {
  bodyWidth: 4.2,
  bodyHeight: 4,
  bodyDepth: 0.36,
  bodyRadius: 0.16,
  screenWidth: 3.6,
  screenHeight: 3.5,
  bezelPadding: 0.05,
  faceDepth: 0.06,
  flapInset: 0.09,
  flapDepth: 0.17,
  flapRadius: 0.1,
  panelMargin: 0.2,
  seamGap: 0.014,
  seamBandWidth: 0.017,
  openAngleDeg: 172,
  monitorY: 0.94,
  monitorHeight: 1.35,
  joystickY: -0.95,
  joystickRadius: 0.25,
  abxyY: -0.95,
  abxySpacing: 0.36,
  abxyRadius: 0.14,
  toggleY: 0.34,
  toggleRadius: 0.14,
  zoomScaleClosed: 0.8,
  zoomScaleOpen: 1,
  shellColor: '#2e2e2e',
  bezelColor: '#0a0a0c',
  accentColor: '#4be12d',
  buttonColor: '#f2f2f0',
  screenColor: '#0a0f12',
  screenLightColor: '#edeae2',
  screenEmissiveIntensity: 2.6,
  screenEmissiveIntensityLight: 1,
  fwPanelWidth: 900,
  fwStatusHeight: 60,
  fwStatusFont: 16,
  fwRailX: 52,
  fwRailTop: 80,
  fwTileWidth: 250,
  fwTileHeight: 140,
  fwTileGap: 54,
  fwSelectedScale: 1.12,
  fwUnselectedOpacity: 0.5,
  fwBlockGap: 60,
  fwTextGap: 17,
  fwTitleFont: 50,
  fwMetaFont: 12,
  fwBodyFont: 16,
  fwDetailCoverHeight: 270,
  fwAxisTop: 150,
  fwDotGap: 190,
  fwDotSize: 14,
  fwEntryGap: 64,
}

interface TuningState {
  values: Tuning
  set: <K extends keyof Tuning>(key: K, value: Tuning[K]) => void
  reset: () => void
}

/**
 * Tuned values survive a reload so a session of fiddling is not lost, and any
 * key added to `Tuning` later falls back to its default rather than arriving
 * as `undefined` from an older saved record.
 */
export const useTuning = create<TuningState>()(
  persist(
    (set) => ({
      values: DEFAULT_TUNING,
      set: (key, value) => set((state) => ({values: {...state.values, [key]: value}})),
      reset: () => set({values: DEFAULT_TUNING}),
    }),
    {
      name: 'console-tuning',
      // Every visit writes this record, not just a session behind `?tune` — so
      // a change to `DEFAULT_TUNING` reaches nobody who has been here before
      // unless the version moves and the old record is thrown away. Bump it
      // whenever a default changes, or the new form ships to new visitors only.
      version: 2,
      migrate: () => ({values: DEFAULT_TUNING}),
      partialize: (state) => ({values: state.values}),
      merge: (persisted, current) => {
        const saved = (persisted as {values?: Partial<Tuning>} | undefined)?.values
        return {...current, values: {...DEFAULT_TUNING, ...saved}}
      },
    },
  ),
)
