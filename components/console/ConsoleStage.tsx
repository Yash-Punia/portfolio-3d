'use client'

import dynamic from 'next/dynamic'
import {useEffect} from 'react'

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

export function ConsoleStage() {
  useConsoleKeys()

  return (
    <div className="fixed inset-0">
      <Scene />
    </div>
  )
}
