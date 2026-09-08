import {create} from 'zustand'

import {play} from '@/components/console/audio'
import type {ButtonSlot} from '@/components/console/content'
import {useConsole} from '@/components/console/store'

/**
 * The console's directional input, from either the joystick or the arrow keys.
 *
 * SPEC §5 makes these one input, mirrored both ways: an arrow key tilts the
 * stick, and dragging the stick emits what the arrow keys emit. So both write
 * `held` here, the joystick renders its tilt from it, and the repeat timer that
 * turns a hold into a stream of moves lives in one place.
 *
 * `tick` is that stream: it advances once when a direction is taken and every
 * 180ms it is held after — standard key-repeat feel. Phase 4's rails subscribe
 * to it; this phase only needs the stick to move.
 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * Every control on the object that has a hidden twin in the page, and so can
 * take DOM focus. The four face buttons open social links; `close` and `theme`
 * are the two caps that had no keyboard path at all before Phase 8.
 */
export type FocusTarget = ButtonSlot | 'close' | 'theme'

const REPEAT_MS = 180

interface InputState {
  /** The direction currently held, or null. Drives the joystick's tilt. */
  held: Direction | null
  /** Advances once per emitted move. */
  tick: number
  hold: (direction: Direction | null) => void
  /**
   * The control whose (visually hidden) twin currently has DOM focus — an ABXY
   * slot, the close button or the theme cap. Each renders its focus ring from
   * this, so tabbing through the page lights the physical control (SPEC §11.4).
   */
  focusedSlot: FocusTarget | null
  focusSlot: (slot: FocusTarget | null) => void
  /**
   * The face button being pressed right now, whichever input pressed it — a
   * click on the cap or the matching letter key. The cap's depression and its
   * rim flash both render from this, so a keystroke moves the physical button.
   */
  pressedSlot: ButtonSlot | null
  pressSlot: (slot: ButtonSlot) => void
}

/** How long a press reads as pressed before it springs back (SPEC §5). */
const PRESS_MS = 140

let release: ReturnType<typeof setTimeout> | null = null

// ponytail: one console, one stick, so one module-level timer. If a second
// directional control ever exists, this moves into the store's own state.
let repeat: ReturnType<typeof setInterval> | null = null

function stop() {
  if (repeat === null) return
  clearInterval(repeat)
  repeat = null
}

export const useInput = create<InputState>()((set, get) => ({
  held: null,
  tick: 0,
  focusedSlot: null,
  focusSlot: (focusedSlot) => set({focusedSlot}),
  pressedSlot: null,
  pressSlot: (slot) => {
    if (release !== null) clearTimeout(release)
    // The cap's click, wherever the press came from — the mesh or the key.
    if (!useConsole.getState().muted) play('press')
    set({pressedSlot: slot})
    release = setTimeout(() => set({pressedSlot: null}), PRESS_MS)
  },
  hold: (direction) => {
    // Re-entering the same direction must not restart the repeat, or holding a
    // key that autorepeats at the OS level would fire far faster than 180ms.
    if (get().held === direction) return

    stop()
    set({held: direction})
    if (direction === null) return

    set((state) => ({tick: state.tick + 1}))
    repeat = setInterval(() => set((state) => ({tick: state.tick + 1})), REPEAT_MS)
  },
}))
