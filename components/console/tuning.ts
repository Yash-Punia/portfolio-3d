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
/**
 * The oscillator shapes a cue may use. `OscillatorType`'s fifth member,
 * `custom`, needs a PeriodicWave that nothing here builds, so it is not offered.
 */
export const WAVES = ['sine', 'square', 'sawtooth', 'triangle'] as const
export type Wave = (typeof WAVES)[number]

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
  /**
   * The mark on a cap while a finger is on it (SPEC §5).
   *
   * A colour of its own rather than a shade of the accent: the tint has to read
   * as pressed against both a white cap and a black one, and the depth that
   * works on one is not the depth that works on the other.
   */
  heldTintColor: string
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

  /*
    The console's sounds (SPEC §16.2). Every cue has the same six knobs, so a
    row of them reads as one table: whether it sounds at all, its waveform, the
    pitch it starts at, the pitch it glides to (equal values hold a note), how
    long it lasts, and how loud it is.

    `sfxOn` silences the lot without clearing anyone's `muted` — that one is the
    visitor's, this one is the author's — and `sfxVolume` multiplies every gain
    below, so the console can be turned down without re-dialling nine cues.
    `sfxAttackMs` is the ramp up to that gain, shared: it is the difference
    between a blip and a click, and it wants to be the same on all of them.
  */
  sfxOn: boolean
  sfxVolume: number
  sfxAttackMs: number
  /** The flaps swinging open and shut: low and short, a hinge not a chime. */
  sfxOpenOn: boolean
  sfxOpenWave: Wave
  sfxOpenFrom: number
  sfxOpenTo: number
  sfxOpenMs: number
  sfxOpenGain: number
  sfxCloseOn: boolean
  sfxCloseWave: Wave
  sfxCloseFrom: number
  sfxCloseTo: number
  sfxCloseMs: number
  sfxCloseGain: number
  /** The boot chord: three notes climbing from `From` to `To`. */
  sfxBootOn: boolean
  sfxBootWave: Wave
  sfxBootFrom: number
  sfxBootTo: number
  sfxBootMs: number
  sfxBootGain: number
  /**
   * The rail's tick. Quietest of the lot by some way: it fires every 180ms
   * while an arrow key is held, and anything louder is unbearable held for a
   * second.
   */
  sfxMoveOn: boolean
  sfxMoveWave: Wave
  sfxMoveFrom: number
  sfxMoveTo: number
  sfxMoveMs: number
  sfxMoveGain: number
  /** A face button going down. */
  sfxPressOn: boolean
  sfxPressWave: Wave
  sfxPressFrom: number
  sfxPressTo: number
  sfxPressMs: number
  sfxPressGain: number
  /** Changing screen — the menu, the Library, the Timeline. */
  sfxSectionOn: boolean
  sfxSectionWave: Wave
  sfxSectionFrom: number
  sfxSectionTo: number
  sfxSectionMs: number
  sfxSectionGain: number
  /** Opening a project's detail view: the one cue that goes up. */
  sfxDetailOn: boolean
  sfxDetailWave: Wave
  sfxDetailFrom: number
  sfxDetailTo: number
  sfxDetailMs: number
  sfxDetailGain: number
  /** Stepping back out of one. Its mirror, so the pair reads as in and out. */
  sfxBackOn: boolean
  sfxBackWave: Wave
  sfxBackFrom: number
  sfxBackTo: number
  sfxBackMs: number
  sfxBackGain: number
  /** The theme cap turning over. */
  sfxThemeOn: boolean
  sfxThemeWave: Wave
  sfxThemeFrom: number
  sfxThemeTo: number
  sfxThemeMs: number
  sfxThemeGain: number
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
  heldTintColor: '#298717',
  screenColor: '#0a0f12',
  screenLightColor: '#edeae2',
  screenEmissiveIntensity: 2.6,
  screenEmissiveIntensityLight: 1,
  fwPanelWidth: 900,
  fwStatusHeight: 60,
  fwStatusFont: 16,
  fwRailX: 52,
  fwRailTop: 80,
  fwTileWidth: 375,
  fwTileHeight: 210,
  fwTileGap: 54,
  fwSelectedScale: 1.12,
  fwUnselectedOpacity: 0.5,
  fwBlockGap: 60,
  fwTextGap: 17,
  fwTitleFont: 50,
  fwMetaFont: 18,
  fwBodyFont: 24,
  fwDetailCoverHeight: 270,
  fwAxisTop: 150,
  fwDotGap: 300,
  fwDotSize: 14,
  fwEntryGap: 64,
  sfxOn: true,
  sfxVolume: 1,
  sfxAttackMs: 8,
  sfxOpenOn: true,
  sfxOpenWave: 'triangle',
  sfxOpenFrom: 180,
  sfxOpenTo: 90,
  sfxOpenMs: 170,
  sfxOpenGain: 0.09,
  sfxCloseOn: true,
  sfxCloseWave: 'triangle',
  sfxCloseFrom: 140,
  sfxCloseTo: 70,
  sfxCloseMs: 150,
  sfxCloseGain: 0.08,
  sfxBootOn: false,
  sfxBootWave: 'triangle',
  sfxBootFrom: 523.25,
  sfxBootTo: 783.99,
  sfxBootMs: 90,
  sfxBootGain: 0.05,
  sfxMoveOn: true,
  sfxMoveWave: 'sawtooth',
  sfxMoveFrom: 295,
  sfxMoveTo: 385,
  sfxMoveMs: 26,
  sfxMoveGain: 0.028,
  sfxPressOn: false,
  sfxPressWave: 'square',
  sfxPressFrom: 1180,
  sfxPressTo: 760,
  sfxPressMs: 44,
  sfxPressGain: 0.035,
  sfxSectionOn: true,
  sfxSectionWave: 'triangle',
  sfxSectionFrom: 660,
  sfxSectionTo: 990,
  sfxSectionMs: 90,
  sfxSectionGain: 0.04,
  sfxDetailOn: true,
  sfxDetailWave: 'triangle',
  sfxDetailFrom: 660,
  sfxDetailTo: 990,
  sfxDetailMs: 90,
  sfxDetailGain: 0.04,
  sfxBackOn: true,
  sfxBackWave: 'triangle',
  sfxBackFrom: 990,
  sfxBackTo: 660,
  sfxBackMs: 90,
  sfxBackGain: 0.035,
  sfxThemeOn: true,
  sfxThemeWave: 'triangle',
  sfxThemeFrom: 420,
  sfxThemeTo: 40,
  sfxThemeMs: 316,
  sfxThemeGain: 0.04,
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
      version: 6,
      migrate: () => ({values: DEFAULT_TUNING}),
      partialize: (state) => ({values: state.values}),
      merge: (persisted, current) => {
        const saved = (persisted as {values?: Partial<Tuning>} | undefined)?.values
        return {...current, values: {...DEFAULT_TUNING, ...saved}}
      },
    },
  ),
)
