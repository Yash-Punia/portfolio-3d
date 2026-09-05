'use client'

import dynamic from 'next/dynamic'
import {useEffect, useSyncExternalStore} from 'react'

import {linkForSlot, type ButtonSlot, type ConsoleContent} from '@/components/console/content'
import {useInput, type Direction} from '@/components/console/input'
import {openSocial} from '@/components/console/parts/FaceButtons'
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

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

const SLOT_KEYS: Record<string, ButtonSlot> = {a: 'A', b: 'B', x: 'X', y: 'Y'}

/** Keystrokes belong to whatever the visitor is typing in, if anything. */
function isTyping() {
  const active = document.activeElement
  return (
    active instanceof HTMLElement &&
    (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))
  )
}

/**
 * Keyboard control of the console, on the DOM side so it works before the
 * three.js chunk lands.
 *
 * `Escape` closes (SPEC §5); `Enter` and `Space` open, because a canvas that
 * can only be opened by pointer is a dead end for keyboard visitors (§11.4).
 * The arrow keys are the joystick (§5) — they write the same held direction the
 * stick writes, which is what makes the stick lean when they are pressed — and
 * `A`/`B`/`X`/`Y` fire the social link bound to that slot (§8).
 */
function useConsoleKeys(content: ConsoleContent) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping()) return

      const {isOpen, open, close} = useConsole.getState()

      if (event.key === 'Escape') {
        if (isOpen) close()
        return
      }

      if (isOpen) {
        const direction = ARROWS[event.key]
        if (direction) {
          event.preventDefault()
          useInput.getState().hold(direction)
          return
        }

        const slot = SLOT_KEYS[event.key.toLowerCase()]
        if (slot) {
          const link = linkForSlot(content.socialLinks, slot)
          if (!link?.url) return
          event.preventDefault()
          useInput.getState().pressSlot(slot)
          openSocial(link.url)
        }
        return
      }

      // Only while closed, and only when nothing else owns the keystroke — the
      // firmware's own Enter/Space bindings arrive with it in Phase 4.
      if (event.key === 'Enter' || event.key === ' ') {
        if (document.activeElement !== document.body) return
        event.preventDefault()
        open()
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (ARROWS[event.key]) useInput.getState().hold(null)
    }

    // A tab away mid-hold would otherwise leave the stick leaning forever.
    function onBlur() {
      useInput.getState().hold(null)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [content])
}

/**
 * The face buttons' focus ring, driven by real DOM focus.
 *
 * The page's visually-hidden landmark already renders one anchor per social
 * link — they are server-rendered, they carry the accessible names, and they
 * are where `Tab` naturally lands. Mirroring their focus onto the 3D caps gives
 * SPEC §11.4's visible focus indicator without a second, duplicate set of links
 * for a screen reader to read through.
 */
function useSocialFocus() {
  useEffect(() => {
    function slotOf(target: EventTarget | null): ButtonSlot | null {
      if (!(target instanceof HTMLElement)) return null
      const slot = target.closest('[data-social-slot]')?.getAttribute('data-social-slot')
      return slot === 'A' || slot === 'B' || slot === 'X' || slot === 'Y' ? slot : null
    }

    const onFocus = (event: FocusEvent) => useInput.getState().focusSlot(slotOf(event.target))
    const onBlur = () => useInput.getState().focusSlot(null)

    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)

    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
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

export function ConsoleStage({content}: {content: ConsoleContent}) {
  useConsoleKeys(content)
  useSocialFocus()
  const tuning = useTuningFlag()

  return (
    <div className="fixed inset-0">
      <Scene content={content} />
      {tuning ? <TuningPanel /> : null}
    </div>
  )
}
