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

interface ConsoleState {
  isOpen: boolean
  /** Idempotent: opening an open console does nothing (SPEC §5). */
  open: () => void
  close: () => void
  /**
   * `null` until the power slider is touched, and the visitor's system
   * preference until then (SPEC §9). Read it through `useTheme()`.
   */
  theme: Theme | null
  setTheme: (theme: Theme) => void
}

export const useConsole = create<ConsoleState>()(
  persist(
    (set) => ({
      isOpen: false,
      open: () => set({isOpen: true}),
      close: () => set({isOpen: false}),
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
 * The screen theme in force: the slider's choice if it has been made, otherwise
 * `prefers-color-scheme`. Once the visitor touches the slider it is the source
 * of truth (SPEC §9), which is what the `null` in the store records.
 */
export function useTheme(): Theme {
  const chosen = useConsole((state) => state.theme)
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)')

  return chosen ?? (prefersLight ? 'light' : 'dark')
}
