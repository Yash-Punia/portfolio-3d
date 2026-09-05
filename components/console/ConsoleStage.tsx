'use client'

import dynamic from 'next/dynamic'
import {useEffect, useSyncExternalStore} from 'react'

import {Skeleton} from '@/components/console/Skeleton'
import {useConsole} from '@/components/console/store'

/**
 * The client boundary for the 3D scene.
 *
 * three.js is pulled in on the client only (SPEC §12) — `ssr: false` is only
 * valid inside a Client Component, so this wrapper exists to hold it. The
 * container fills the viewport before the chunk arrives, so the canvas cannot
 * shift the page in.
 */
const Scene = dynamic(() => import('@/components/console/Scene'), {
  ssr: false,
  loading: () => <Skeleton />,
})

/**
 * The tuning panel is a development tool and ships in its own chunk, pulled in
 * only when `?tune` asks for it — no visitor pays for it and none of its markup
 * reaches the page (SPEC §1).
 */
const TuningPanel = dynamic(
  () => import('@/components/console/TuningPanel').then((module) => module.TuningPanel),
  {ssr: false},
)

/**
 * Keyboard control of the console, on the DOM side so it works before the
 * three.js chunk lands. `Escape` closes (SPEC §5); `Enter` and `Space` open,
 * because a canvas that can only be opened by pointer is a dead end for
 * keyboard visitors (SPEC §11.4). Once there is a detail view to close first,
 * `Escape` gains that step (SPEC §8, Phase 4).
 */
function useConsoleKeys() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

      const {isOpen, open, close} = useConsole.getState()

      if (event.key === 'Escape') {
        if (isOpen) close()
        return
      }

      // Only while closed, and only when nothing else owns the keystroke — the
      // firmware's own Enter/Space bindings arrive with it in Phase 4.
      if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
        if (document.activeElement !== document.body) return
        event.preventDefault()
        open()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** The URL is an external source the server render cannot see. */
const subscribeToNothing = () => () => {}

function useTuningFlag() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).has('tune'),
    () => false,
  )
}

export function ConsoleStage() {
  useConsoleKeys()
  const tuning = useTuningFlag()

  return (
    <div className="fixed inset-0">
      <Scene />
      {tuning ? <TuningPanel /> : null}
    </div>
  )
}
