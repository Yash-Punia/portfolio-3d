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
 * Every pressable cap on either console: the four face buttons, the MENU pill,
 * and the Game Boy's second pill, About. Each has a hidden twin in the page, so
 * each can take DOM focus and light its ring.
 */
export type FocusTarget = ButtonSlot | 'menu' | 'about'

const REPEAT_MS = 180

/** How long a pushed stick reads as pushed before it springs back to centre. */
const LEAN_MS = 200

interface InputState {
  /** The direction currently held, or null. Drives the joystick's tilt. */
  held: Direction | null
  /** Advances once per emitted move. */
  tick: number
  hold: (direction: Direction | null) => void
  /**
   * One move, and only one — the joystick's push.
   *
   * A thumbstick is not a key: a visitor pushes it, reads the screen and pushes
   * again, and a stream of repeats out of a finger that simply has not lifted
   * yet is the bug this replaces. So no interval is started, and the lean
   * clears itself after `LEAN_MS` whether or not a `pointerup` ever arrives —
   * which is what makes a stuck stick impossible rather than merely unlikely.
   */
  nudge: (direction: Direction) => void
  /**
   * The control whose (visually hidden) twin currently has DOM focus — an ABXY
   * slot or a pill. Each renders its focus ring from
   * this, so tabbing through the page lights the physical control (SPEC §11.4).
   */
  focusedSlot: FocusTarget | null
  focusSlot: (slot: FocusTarget | null) => void
  /**
   * The face button being pressed right now, whichever input pressed it — a
   * click on the cap or the matching letter key. The cap's depression and its
   * rim flash both render from this, so a keystroke moves the physical button.
   */
  pressedSlot: FocusTarget | null
  pressSlot: (slot: FocusTarget) => void
}

/** How long a press reads as pressed before it springs back (SPEC §5). */
const PRESS_MS = 140

let release: ReturnType<typeof setTimeout> | null = null

// ponytail: one console, one stick, so one module-level timer. If a second
// directional control ever exists, this moves into the store's own state.
let repeat: ReturnType<typeof setInterval> | null = null
let settle: ReturnType<typeof setTimeout> | null = null

function stop() {
  if (settle !== null) {
    clearTimeout(settle)
    settle = null
  }
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
    // A lean left over from a stick push is not a hold, though: it is about to
    // clear itself, and taking it as one would leave the key doing nothing.
    if (get().held === direction && settle === null) return

    stop()
    set({held: direction})
    if (direction === null) return

    set((state) => ({tick: state.tick + 1}))
    repeat = setInterval(() => set((state) => ({tick: state.tick + 1})), REPEAT_MS)
  },
  nudge: (direction) => {
    stop()
    // Both in one write: `useRailInput` reads `held` on the tick it sees.
    set((state) => ({held: direction, tick: state.tick + 1}))
    settle = setTimeout(() => {
      settle = null
      set({held: null})
    }, LEAN_MS)
  },
}))
