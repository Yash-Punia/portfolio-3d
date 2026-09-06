'use client'

import dynamic from 'next/dynamic'
import {useEffect, useSyncExternalStore} from 'react'

import {
  linkForSlot,
  menuOptions,
  neighbours,
  openLink,
  SECTION_LABELS,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {useInput, type Direction} from '@/components/console/input'
import {Skeleton} from '@/components/console/Skeleton'
import {useConsole, useTheme} from '@/components/console/store'

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

      const {isOpen, open, close, isDetailOpen, openDetail, closeDetail, libraryIndex, section} =
        useConsole.getState()

      // SPEC §8: Escape closes the detail view; with none open, it closes the
      // console.
      if (event.key === 'Escape') {
        if (!isOpen) return
        if (isDetailOpen) closeDetail()
        else close()
        return
      }

      if (isOpen) {
        const direction = ARROWS[event.key]
        if (direction) {
          event.preventDefault()
          useInput.getState().hold(direction)
          return
        }

        // Enter takes the highlighted menu half, or opens the selected
        // project. A timeline entry has nothing to drill into — its detail is
        // already on screen — so it stays a no-op there.
        if (event.key === 'Enter' || event.key === ' ') {
          if (document.activeElement !== document.body) return
          event.preventDefault()
          if (isDetailOpen) return
          if (section === 'menu') {
            const target = menuOptions(content)[useConsole.getState().menuIndex]
            if (target) useConsole.getState().setSection(target)
          } else if (section === 'library' && content.projects[libraryIndex]) {
            openDetail()
          }
          return
        }

        const slot = SLOT_KEYS[event.key.toLowerCase()]
        if (slot) {
          const link = linkForSlot(content.socialLinks, slot)
          if (!link?.url) return
          event.preventDefault()
          useInput.getState().pressSlot(slot)
          openLink(link.url)
        }
        return
      }

      // Only while closed, and only when nothing else owns the keystroke.
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

/**
 * The rail's consumer of the directional stream Phase 3 built.
 *
 * `input.tick` advances once when a direction is taken and every 180ms it is
 * held after, from either the joystick or the arrow keys — so subscribing here
 * is what makes both of them move the selection, at one tile per notch rather
 * than one per frame (SPEC §5, §8).
 */
function useRailInput(content: ConsoleContent) {
  useEffect(
    () =>
      useInput.subscribe((state, previous) => {
        if (state.tick === previous.tick) return
        const direction = state.held
        if (direction === null) return

        // A detail view is not a rail.
        if (!useConsole.getState().isOpen || useConsole.getState().isDetailOpen) return
        move(direction, content)
      }),
    [content],
  )
}

/**
 * One directional move, from whichever input made it.
 *
 * Up and down walk the stack of screens — menu, Library, Timeline — through the
 * one `neighbours()` definition the arrows on screen also draw themselves from.
 * Left and right move within the rail showing, except on the menu, where the
 * two halves are stacked and every direction moves the highlight: a menu that
 * ignored a sideways nudge would feel broken (SPEC §8).
 */
function move(direction: Direction, content: ConsoleContent) {
  const {section, setSection, moveMenu, moveLibrary, moveTimeline} = useConsole.getState()
  const delta = direction === 'up' || direction === 'left' ? -1 : 1

  if (section === 'menu') {
    moveMenu(delta, menuOptions(content).length)
    return
  }

  if (direction === 'up' || direction === 'down') {
    const target = neighbours(section, content)[direction]
    if (target) setSection(target)
    return
  }

  if (section === 'timeline') moveTimeline(delta, content.timeline.length)
  else moveLibrary(delta, content.projects.length)
}

/** SPEC §8: accumulate, fire on a threshold, then lock so a flick cannot skip. */
const WHEEL_THRESHOLD = 40
const WHEEL_LOCK_MS = 120

/**
 * Vertical scroll moves the selection horizontally — the "scroll down to move
 * across" behaviour of SPEC §8 — and a trackpad's horizontal axis does the same.
 * Delta accumulates to a threshold, fires one move, then the stream is locked
 * for 120ms and whatever inertia arrives during it is discarded, which is what
 * keeps an inertial flick from skipping eight projects.
 */
function useWheelRail(content: ConsoleContent) {
  useEffect(() => {
    let accumulated = 0
    let lockedUntil = 0

    function onWheel(event: WheelEvent) {
      const {isOpen, isDetailOpen} = useConsole.getState()
      if (!isOpen || isDetailOpen) return

      const now = performance.now()
      if (now < lockedUntil) {
        accumulated = 0
        return
      }

      accumulated += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return

      move(accumulated > 0 ? 'right' : 'left', content)
      accumulated = 0
      lockedUntil = now + WHEEL_LOCK_MS
    }

    window.addEventListener('wheel', onWheel, {passive: true})
    return () => window.removeEventListener('wheel', onWheel)
  }, [content])
}

/**
 * The stage behind the console follows the screen's theme.
 *
 * The chassis materials still do not (SPEC §5) — this is the page the object
 * stands on, and a light screen on a near-black page reads as a lamp in a dark
 * room. The two stage colours and the cross-fade between them live in
 * `globals.css`; all this does is say which pair is in force.
 */
function useStageTheme() {
  const theme = useTheme()

  useEffect(() => {
    document.documentElement.dataset.stage = theme
  }, [theme])
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

/**
 * What the rail has selected, in words (SPEC §11.6).
 *
 * The firmware itself is `aria-hidden` — the page's `.sr-only` landmark is the
 * accessible copy of its content — so the one thing a screen reader cannot
 * otherwise learn is that moving the joystick changed the selection. This
 * announces exactly that, and nothing that is already in the landmark.
 */
function useAnnouncement(content: ConsoleContent): string {
  const isOpen = useConsole((state) => state.isOpen)
  const section = useConsole((state) => state.section)
  const menuIndex = useConsole((state) => state.menuIndex)
  const index = useConsole((state) => state.libraryIndex)
  const timelineIndex = useConsole((state) => state.timelineIndex)
  const isDetailOpen = useConsole((state) => state.isDetailOpen)

  if (!isOpen) return ''

  if (section === 'menu') {
    const option = menuOptions(content)[menuIndex]
    return option ? `Menu, ${SECTION_LABELS[option]}` : 'Menu'
  }

  if (section === 'timeline') {
    const entry = content.timeline[timelineIndex]
    if (!entry) return 'Timeline'
    return `Timeline, ${entry.role} at ${entry.organisation}`
  }

  const name = content.projects[index]?.title ?? ''

  return isDetailOpen ? `${name}, details` : `Library, ${name}`
}

export function ConsoleStage({content}: {content: ConsoleContent}) {
  useConsoleKeys(content)
  useSocialFocus()
  useStageTheme()
  useRailInput(content)
  useWheelRail(content)
  const tuning = useTuningFlag()
  const announcement = useAnnouncement(content)

  return (
    <div className="fixed inset-0">
      <Scene content={content} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {tuning ? <TuningPanel /> : null}
    </div>
  )
}
