import {create} from 'zustand'
import {persist} from 'zustand/middleware'

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
 * The firmware's screens, stacked vertically: the menu the boot hands over to,
 * the Library under it, the Timeline under that. Up and down walk the stack
 * (SPEC §8).
 */
export type Section = 'menu' | 'library' | 'timeline'

/** No wrap and no bounce: with one item in a rail, left and right are no-ops. */
function clamp(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0))
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
  /** Which half of the menu is highlighted: 0 the top button, 1 the bottom. */
  menuIndex: number
  moveMenu: (delta: number, count: number) => void
  setMenuIndex: (index: number) => void
  /** 0 is the About tile; 1..n are the projects in `order` (SPEC §8). */
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
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set) => ({
      isOpen: false,
      // Every open starts the firmware from the top: booting, then the menu,
      // with no detail view (SPEC §7). A console reopened into someone else's
      // half-finished navigation would read as a page that never closed.
      open: () =>
        set({
          isOpen: true,
          isBooting: true,
          section: 'menu',
          menuIndex: 0,
          libraryIndex: 0,
          timelineIndex: 0,
          isDetailOpen: false,
        }),
      close: () => set({isOpen: false, isBooting: false, isDetailOpen: false}),
      isBooting: false,
      hasBooted: false,
      endBoot: () => set({isBooting: false, hasBooted: true}),
      section: 'menu',
      setSection: (section) => set({section}),
      menuIndex: 0,
      moveMenu: (delta, count) =>
        set((state) => ({menuIndex: clamp(state.menuIndex + delta, count)})),
      setMenuIndex: (menuIndex) => set({menuIndex}),
      libraryIndex: 0,
      moveLibrary: (delta, count) =>
        set((state) => ({libraryIndex: clamp(state.libraryIndex + delta, count)})),
      setLibraryIndex: (libraryIndex) => set({libraryIndex}),
      timelineIndex: 0,
      moveTimeline: (delta, count) =>
        set((state) => ({timelineIndex: clamp(state.timelineIndex + delta, count)})),
      setTimelineIndex: (timelineIndex) => set({timelineIndex}),
      isDetailOpen: false,
      openDetail: () => set({isDetailOpen: true}),
      closeDetail: () => set({isDetailOpen: false}),
      theme: null,
      setTheme: (theme) => set({theme}),
    }),
    {
      name: 'console',
      version: 1,
      // Only the theme survives a reload. Whether the console was open is a
      // property of a visit, not of the visitor.
      partialize: (state) => ({theme: state.theme}),
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
