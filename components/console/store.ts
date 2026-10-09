import {create} from 'zustand'
import {persist} from 'zustand/middleware'

import {play, type Cue} from '@/components/console/audio'
import {useMediaQuery} from '@/components/console/useMediaQuery'

/**
 * The one console store (SPEC §8). It lives outside the canvas so the DOM side
 * — the `Escape` key handler, and Phase 6's control overlay — drives the same
 * state as the meshes inside it.
 *
 * SPEC §8 sketches the full shape (`isBooting`, `section`, `libraryIndex`,
 * `timelineIndex`, `isDetailOpen`, `rotation`). Each field is added by the phase
 * that first reads it rather than stubbed now — `rotation` in particular stays
 * out, because drag-to-rotate is read by exactly one component and a spring
 * inside it is the whole implementation.
 */
export type Theme = 'dark' | 'light'
/**
 * The firmware's screens, stacked vertically: the menu that offers the other
 * two, the Library under it, the Timeline under that. Up and down walk the
 * stack (SPEC §8).
 *
 * The boot hands over to the Library, not the menu — the games are what a
 * visitor came for, so the menu is one step *out* of them rather than a screen
 * to dismiss on the way in. Back from a rail lands there, and back from there
 * closes the console.
 */
export type Section = 'menu' | 'library' | 'timeline'

/** No wrap and no bounce: with one item in a rail, left and right are no-ops. */
function clamp(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0))
}

/** A cue, unless the visitor has muted the console (SPEC §16.2). */
function cue(name: Cue) {
  if (!useConsole.getState().muted) play(name)
}

/**
 * A clamped move that is audible only when it actually moved. At the end of a
 * rail there is no wrap and no bounce (SPEC §3.2), so there is nothing to hear
 * either — a tick there would claim something happened.
 */
function moved(index: number, delta: number, count: number): number {
  const next = clamp(index + delta, count)
  if (next !== index) cue('move')
  return next
}

interface ConsoleState {
  isOpen: boolean
  /** Idempotent: opening an open console does nothing (SPEC §5). */
  open: () => void
  close: () => void
  /**
   * The boot sequence (SPEC §7). `hasBooted` survives a close, so reopening the
   * console plays the 250ms short form rather than the full ~900ms one — and it
   * does not survive a reload, which is why neither field is persisted.
   */
  isBooting: boolean
  hasBooted: boolean
  endBoot: () => void
  /** Which screen is showing. Down goes deeper into the stack, up comes back. */
  section: Section
  setSection: (section: Section) => void
  /**
   * One step out, whatever "out" currently means: a detail view closes, a rail
   * returns to the menu, and the menu closes the console. The B button, the
   * BACK control on the screen and `Escape` are all this one action, so they
   * cannot disagree about where back is.
   */
  back: () => void
  /**
   * Straight to a section from the outside — the Library and Timeline buttons
   * on the right flap. From the beginning: index 0, no detail view, and the
   * console opened first if it was shut.
   */
  jump: (section: Section) => void
  /** Which half of the menu is highlighted: 0 the top button, 1 the bottom. */
  menuIndex: number
  moveMenu: (delta: number, count: number) => void
  setMenuIndex: (index: number) => void
  /** The selected project, in `order` (SPEC §8). */
  libraryIndex: number
  /**
   * Moves the selection within the rail, clamped. No wrap and no bounce: with
   * one item in the rail, left and right are no-ops (SPEC §3.2).
   */
  moveLibrary: (delta: number, count: number) => void
  setLibraryIndex: (index: number) => void
  /** The same, for the timeline's axis of dots. */
  timelineIndex: number
  moveTimeline: (delta: number, count: number) => void
  setTimelineIndex: (index: number) => void
  isDetailOpen: boolean
  openDetail: () => void
  closeDetail: () => void
  /**
   * `null` until the theme toggle is touched, and the visitor's system
   * preference until then (SPEC §9). Read it through `useTheme()`.
   */
  theme: Theme | null
  setTheme: (theme: Theme) => void
  /**
   * The console's sounds (SPEC §16.2). Audible by default — a handheld that
   * makes no noise is a screenshot — and the choice persists like the theme's.
   */
  muted: boolean
  toggleMuted: () => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set, get) => ({
      /*
        Every cue goes through here, and every cue is fired from inside a store
        action rather than from the control that caused it. That is what makes
        the arrow keys, the joystick, the wheel, a swipe and a click on a tile
        all sound the same: they already share these actions, the way they
        share `move()` in `ConsoleStage`.
      */
      isOpen: false,
      // Every open starts the firmware from the top: booting, then the first
      // game in the Library, with no detail view (SPEC §7). A console reopened
      // into someone else's half-finished navigation would read as a page that
      // never closed.
      open: () => {
        if (get().isOpen) return
        cue('open')
        set({
          isOpen: true,
          isBooting: true,
          section: 'library',
          menuIndex: 0,
          libraryIndex: 0,
          timelineIndex: 0,
          isDetailOpen: false,
        })
      },
      close: () => {
        if (get().isOpen) cue('close')
        set({isOpen: false, isBooting: false, isDetailOpen: false})
      },
      isBooting: false,
      hasBooted: false,
      endBoot: () => {
        cue('boot')
        set({isBooting: false, hasBooted: true})
      },
      section: 'library',
      /*
        Every way into a screen starts it from the beginning — the menu, the
        arrows between screens and the Library and Timeline caps alike.
        Resetting here rather than in each caller is what makes that true of
        all of them; a caller that means a particular tile (a timeline chip, a
        project in the page's landmark) sets its index after this.
      */
      setSection: (section) => {
        if (get().section === section) return
        cue('section')
        set({section, libraryIndex: 0, timelineIndex: 0})
      },
      back: () => {
        const {isDetailOpen, section, closeDetail, close} = get()
        // Each branch delegates to an action that already sounds for itself.
        if (isDetailOpen) return closeDetail()
        if (section !== 'menu') {
          cue('back')
          // The menu opens on the half that leads back where the visitor just
          // was, so a second press of A undoes the B.
          return set({section: 'menu', menuIndex: section === 'timeline' ? 1 : 0})
        }
        close()
      },
      jump: (section) => {
        // `open()` starts the firmware from the top, so it goes first and the
        // destination is set after it — the same order `useLandmarkFocus` uses.
        // It sounds for itself, so only a jump on an already-open console is
        // a section change to be heard.
        if (get().isOpen) cue('section')
        else get().open()
        set({section, libraryIndex: 0, timelineIndex: 0, isDetailOpen: false})
      },
      menuIndex: 0,
      moveMenu: (delta, count) => set({menuIndex: moved(get().menuIndex, delta, count)}),
      setMenuIndex: (menuIndex) => set({menuIndex}),
      libraryIndex: 0,
      moveLibrary: (delta, count) => set({libraryIndex: moved(get().libraryIndex, delta, count)}),
      setLibraryIndex: (libraryIndex) => set({libraryIndex}),
      timelineIndex: 0,
      moveTimeline: (delta, count) =>
        set({timelineIndex: moved(get().timelineIndex, delta, count)}),
      setTimelineIndex: (timelineIndex) => set({timelineIndex}),
      isDetailOpen: false,
      openDetail: () => {
        cue('detail')
        set({isDetailOpen: true})
      },
      closeDetail: () => {
        if (get().isDetailOpen) cue('back')
        set({isDetailOpen: false})
      },
      theme: null,
      setTheme: (theme) => {
        if (get().theme !== theme) cue('theme')
        set({theme})
      },
      muted: false,
      toggleMuted: () => {
        const muted = !get().muted
        set({muted})
        // Unmuting says so out loud: the control is inside the firmware, and a
        // toggle whose only feedback is a struck-through glyph is a guess.
        if (!muted) play('press')
      },
    }),
    {
      name: 'console',
      version: 1,
      // The theme and the mute survive a reload; whether the console was open
      // is a property of a visit, not of the visitor.
      partialize: (state) => ({theme: state.theme, muted: state.muted}),
    },
  ),
)

/**
 * The screen theme in force: the toggle's choice if it has been made, otherwise
 * `prefers-color-scheme`. Once the visitor touches the toggle it is the source
 * of truth (SPEC §9), which is what the `null` in the store records.
 */
export function useTheme(): Theme {
  const chosen = useConsole((state) => state.theme)
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)')

  return chosen ?? (prefersLight ? 'light' : 'dark')
}
