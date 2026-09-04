import {create} from 'zustand'

/**
 * The one console store (SPEC §8). It lives outside the canvas so the DOM side
 * — the `Escape` key handler, and Phase 6's control overlay — drives the same
 * state as the meshes inside it.
 *
 * SPEC §8 sketches the full shape (`isBooting`, `theme`, `section`,
 * `libraryIndex`, `timelineIndex`, `isDetailOpen`, `rotation`). Each field is
 * added by the phase that first reads it rather than stubbed now.
 */
interface ConsoleState {
  isOpen: boolean
  /** Idempotent: opening an open console does nothing (SPEC §5). */
  open: () => void
  close: () => void
}

export const useConsole = create<ConsoleState>()((set) => ({
  isOpen: false,
  open: () => set({isOpen: true}),
  close: () => set({isOpen: false}),
}))
