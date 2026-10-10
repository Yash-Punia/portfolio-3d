import {create} from 'zustand'
import {persist} from 'zustand/middleware'

import {play, type Cue} from '@/components/console/audio'
import {SCREENS} from '@/components/console/device'

/**
 * The one console store. It lives outside the canvas so the DOM side — the
 * keyboard, the page's hidden landmark, the screen's own taps — drives the same
 * state as the meshes inside it.
 *
 * Handheld v2 (see HANDHELD_V2.md): the console is always on. The screen is a
 * console home with two tabs — Games and About — and a project page that opens
 * over Games.
 */
export type Screen = 'games' | 'about'

/** No wrap and no bounce: with one item in a list, a move is a no-op. */
function clamp(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0))
}

/** A cue, unless the visitor has muted the console. */
function cue(name: Cue) {
  if (!useConsole.getState().muted) play(name)
}

/** A clamped move that is audible only when it actually moved. */
function moved(index: number, delta: number, count: number): number {
  const next = clamp(index + delta, count)
  if (next !== index) cue('move')
  return next
}

interface ConsoleState {
  /** The short power-on at page load. Not persisted: it is a property of a visit. */
  isBooting: boolean
  endBoot: () => void
  /** Which tab is showing. */
  screen: Screen
  /** Every way into a tab starts it from the top. */
  setScreen: (screen: Screen) => void
  /** X on the desk: the next tab along, wrapping. */
  nextScreen: () => void
  /** The selected game, in `order`. Survives a trip to About and back. */
  gameIndex: number
  moveGame: (delta: number, count: number) => void
  setGameIndex: (index: number) => void
  /** The project page, over Games. */
  isProjectOpen: boolean
  openProject: () => void
  closeProject: () => void
  /** The trailer, playing inline on the project page. */
  isTrailerPlaying: boolean
  playTrailer: () => void
  stopTrailer: () => void
  /** The open row on About's Experience index. */
  rowIndex: number
  moveRow: (delta: number, count: number) => void
  setRowIndex: (index: number) => void
  /**
   * One step out, whatever "out" currently means: a trailer stops, a project
   * page closes, About returns to Games. On Games it does nothing —
   * there is no "off" any more. The B cap, the screen's "‹ Games" and `Escape`
   * are all this one action.
   */
  back: () => void
  /** The console's sounds. Audible by default; the choice persists. */
  muted: boolean
  toggleMuted: () => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set, get) => ({
      isBooting: true,
      endBoot: () => {
        cue('boot')
        set({isBooting: false})
      },
      screen: 'games',
      setScreen: (screen) => {
        if (get().screen === screen && !get().isProjectOpen) return
        cue('section')
        set({screen, rowIndex: 0, isProjectOpen: false, isTrailerPlaying: false})
      },
      nextScreen: () => {
        const at = SCREENS.indexOf(get().screen)
        get().setScreen(SCREENS[(at + 1) % SCREENS.length] ?? 'games')
      },
      gameIndex: 0,
      moveGame: (delta, count) =>
        set({gameIndex: moved(get().gameIndex, delta, count), isTrailerPlaying: false}),
      setGameIndex: (gameIndex) => set({gameIndex, isTrailerPlaying: false}),
      isProjectOpen: false,
      openProject: () => {
        if (!get().isProjectOpen) cue('detail')
        set({screen: 'games', isProjectOpen: true})
      },
      closeProject: () => {
        if (get().isProjectOpen) cue('back')
        set({isProjectOpen: false, isTrailerPlaying: false})
      },
      isTrailerPlaying: false,
      playTrailer: () => {
        cue('detail')
        set({screen: 'games', isProjectOpen: true, isTrailerPlaying: true})
      },
      stopTrailer: () => {
        if (get().isTrailerPlaying) cue('back')
        set({isTrailerPlaying: false})
      },
      rowIndex: 0,
      moveRow: (delta, count) => set({rowIndex: moved(get().rowIndex, delta, count)}),
      setRowIndex: (rowIndex) => set({rowIndex}),
      back: () => {
        const {isTrailerPlaying, isProjectOpen, screen} = get()
        if (isTrailerPlaying) return get().stopTrailer()
        if (isProjectOpen) return get().closeProject()
        if (screen !== 'games') get().setScreen('games')
      },
      muted: false,
      toggleMuted: () => {
        const muted = !get().muted
        set({muted})
        // Unmuting says so out loud: a toggle whose only feedback is silence
        // is a guess.
        if (!muted) play('section')
      },
    }),
    {
      name: 'console',
      version: 2,
      partialize: (state) => ({muted: state.muted}),
      // v1 also kept the screen theme, which is gone; the mute carries over.
      migrate: (persisted) => ({muted: (persisted as {muted?: boolean} | null)?.muted ?? false}),
    },
  ),
)
