'use client'

import dynamic from 'next/dynamic'
import {useEffect, useState, useSyncExternalStore} from 'react'

import {accept} from '@/components/console/actions'
import type {ConsoleContent} from '@/components/console/content'
import {SCREEN_LABELS, useDevice} from '@/components/console/device'
import {useInput, type Direction, type FocusTarget} from '@/components/console/input'
import {Skeleton} from '@/components/console/Skeleton'
import {useConsole} from '@/components/console/store'
import {failWebgl, useWebgl, WebglBoundary} from '@/components/console/webgl'

/**
 * The client boundary for the 3D scene. three.js is pulled in on the client
 * only — `ssr: false` is only valid inside a Client Component, so this wrapper
 * exists to hold it.
 */
const Scene = dynamic(() => import('@/components/console/Scene'), {
  ssr: false,
  loading: () => <Skeleton />,
})

/**
 * The screen without a console, for a browser that cannot run WebGL. Its own
 * chunk: a visitor whose browser does run WebGL never downloads it.
 */
const FlatScreen = dynamic(() => import('@/components/console/FlatScreen'), {ssr: false})

/** The `?tune` panel. Its own chunk, fetched only when the URL asks for it. */
const TunePanel = dynamic(() => import('@/components/console/TunePanel'), {ssr: false})

/** Whether the page was opened with `?tune`. Read after mount: the server never sees it. */
function useTuneParam() {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).has('tune'),
    () => false,
  )
}

const noSubscribe = () => () => {}

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/** The letters a keyboard presses the caps with. */
const KEYS: Record<string, FocusTarget> = {a: 'A', b: 'B'}

/** What each cap does, wherever it is pressed from — the cap, its key, or its twin in the page. */
function pressAction(cap: FocusTarget, content: ConsoleContent) {
  useInput.getState().pressSlot(cap)
  if (cap === 'A') return accept(content)
  useConsole.getState().back()
}

/** Keystrokes belong to whatever the visitor is typing in, if anything. */
function isTyping() {
  const active = document.activeElement
  return (
    active instanceof HTMLElement &&
    (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))
  )
}

/**
 * Keyboard control, on the DOM side so it works before the three.js chunk
 * lands. The arrow keys are the D-pad — they write the same held direction it
 * does, which is what makes it rock under a keystroke. `Escape` is B, `Enter`
 * and `Space` are A, and the letters press their caps. `X` walks the tabs: it
 * has no cap any more, but a keyboard still needs a way to About.
 */
function useConsoleKeys(content: ConsoleContent) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping()) return

      if (event.key === 'Escape') {
        useInput.getState().pressSlot('B')
        useConsole.getState().back()
        return
      }

      const direction = ARROWS[event.key]
      if (direction) {
        event.preventDefault()
        useInput.getState().hold(direction)
        return
      }

      // Enter on a focused link or button is that control's own; only a bare
      // page hands it to the console.
      if (event.key === 'Enter' || event.key === ' ') {
        if (document.activeElement !== document.body) return
        event.preventDefault()
        pressAction('A', content)
        return
      }

      if (event.key.toLowerCase() === 'x') {
        event.preventDefault()
        useConsole.getState().nextScreen()
        return
      }

      const cap = KEYS[event.key.toLowerCase()]
      if (cap) {
        event.preventDefault()
        pressAction(cap, content)
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (ARROWS[event.key]) useInput.getState().hold(null)
    }

    // A tab away mid-hold would otherwise leave the D-pad rocked forever.
    const onBlur = () => useInput.getState().hold(null)

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

const FOCUS_TARGETS: FocusTarget[] = ['A', 'B']

/**
 * The caps' focus rings, and the shelf's selection, driven by real DOM focus
 * in the page.
 *
 * The visually-hidden landmark renders a button per project; `ConsoleControls`
 * renders one per cap. Focusing a project's button selects it on the shelf and
 * activating it opens its page; focusing a cap's twin lights the cap. Delegated
 * from `document`, so `app/page.tsx` stays a Server Component.
 */
function useLandmarkFocus() {
  useEffect(() => {
    function controlOf(target: EventTarget | null): FocusTarget | null {
      if (!(target instanceof HTMLElement)) return null
      const value = target.closest('[data-console-focus]')?.getAttribute('data-console-focus')
      return FOCUS_TARGETS.find((slot) => slot === value) ?? null
    }

    function indexOf(target: EventTarget | null): number | null {
      if (!(target instanceof HTMLElement)) return null
      const value = target.closest('[data-project-index]')?.getAttribute('data-project-index')
      if (value === null || value === undefined) return null
      const index = Number(value)
      return Number.isInteger(index) ? index : null
    }

    function onFocus(event: FocusEvent) {
      useInput.getState().focusSlot(controlOf(event.target))
      const index = indexOf(event.target)
      if (index === null) return
      const state = useConsole.getState()
      if (state.screen !== 'games') state.setScreen('games')
      state.setGameIndex(index)
    }

    function onClick(event: MouseEvent) {
      const index = indexOf(event.target)
      if (index === null) return
      const state = useConsole.getState()
      state.setGameIndex(index)
      state.openProject()
    }

    const onBlur = () => useInput.getState().focusSlot(null)

    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
      document.removeEventListener('click', onClick)
    }
  }, [])
}

/** The one scrolling box on the glass, nudged by the D-pad's up and down. */
function scrollBox(direction: 'up' | 'down') {
  const box = document.querySelector('[data-glass] [data-scroll]')
  if (!(box instanceof HTMLElement)) return
  const step = box.clientHeight * 0.4
  box.scrollBy({top: direction === 'up' ? -step : step, behavior: 'smooth'})
}

/**
 * One directional move, from whichever input made it.
 *
 * - Games: left and right walk the shelf.
 * - A project page: left and right step to the neighbouring game, up and down
 *   scroll the write-up.
 * - About: up and down walk the Experience index, and scroll on past the ends.
 */
function move(direction: Direction, content: ConsoleContent) {
  const state = useConsole.getState()
  const vertical = direction === 'up' || direction === 'down'
  const delta = direction === 'up' || direction === 'left' ? -1 : 1

  if (state.screen === 'games') {
    if (!vertical) return state.moveGame(delta, content.projects.length)
    if (state.isProjectOpen) scrollBox(direction)
    return
  }

  if (!vertical) return
  const before = state.rowIndex
  state.moveRow(delta, content.timeline.length)
  if (useConsole.getState().rowIndex === before) scrollBox(direction)
}

/**
 * The D-pad's and the arrow keys' consumer: `input.tick` advances once per
 * move, so subscribing here moves the selection one step per press or repeat.
 */
function useDirectionalInput(content: ConsoleContent) {
  useEffect(
    () =>
      useInput.subscribe((state, previous) => {
        if (state.tick === previous.tick || state.held === null) return
        move(state.held, content)
      }),
    [content],
  )
}

/** Accumulate, fire on a threshold, then lock so an inertial flick cannot skip. */
const WHEEL_THRESHOLD = 40
const WHEEL_LOCK_MS = 120

/**
 * The wheel, over the home screen, walks the shelf: vertical scroll moves the
 * selection across. Anywhere that scrolls natively keeps its wheel.
 */
function useWheelShelf(content: ConsoleContent) {
  useEffect(() => {
    let accumulated = 0
    let lockedUntil = 0

    function onWheel(event: WheelEvent) {
      const {screen, isProjectOpen, moveGame} = useConsole.getState()
      if (screen !== 'games' || isProjectOpen) return
      if (event.target instanceof Element && event.target.closest('[data-scroll]')) return

      const now = performance.now()
      if (now < lockedUntil) {
        accumulated = 0
        return
      }

      accumulated += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return

      moveGame(accumulated > 0 ? 1 : -1, content.projects.length)
      accumulated = 0
      lockedUntil = now + WHEEL_LOCK_MS
    }

    window.addEventListener('wheel', onWheel, {passive: true})
    return () => window.removeEventListener('wheel', onWheel)
  }, [content])
}

/**
 * What the screen is showing, in words. The screen itself is `aria-hidden` —
 * the page's landmark is the readable copy — so the one thing a screen reader
 * cannot otherwise learn is that a press changed it.
 */
function useAnnouncement(content: ConsoleContent): string {
  const isBooting = useConsole((state) => state.isBooting)
  const screen = useConsole((state) => state.screen)
  const index = useConsole((state) => state.gameIndex)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const isTrailerPlaying = useConsole((state) => state.isTrailerPlaying)
  const rowIndex = useConsole((state) => state.rowIndex)

  if (isBooting) return 'Console on'

  if (screen !== 'games') {
    const entry = content.timeline[rowIndex]
    const what = [entry?.role, entry?.organisation].filter(Boolean).join(' at ')
    return what ? `${SCREEN_LABELS[screen]}, ${what}` : SCREEN_LABELS[screen]
  }

  const project = content.projects[index]
  if (!project) return 'Games'
  const name = project.title ?? ''
  if (isTrailerPlaying) return `${name}, trailer playing`
  if (isProjectOpen) return `${name}, details`
  return `Games, ${name}, ${index + 1} of ${content.projects.length}`
}

export function ConsoleStage({content}: {content: ConsoleContent}) {
  const device = useDevice()
  const webglOk = useWebgl()
  useConsoleKeys(content)
  useLandmarkFocus()
  useDirectionalInput(content)
  useWheelShelf(content)
  const selection = useAnnouncement(content)
  const tuning = useTuneParam()

  /*
    A control that changes something invisible says so — the mute has no
    on-screen state a screen reader can reach. The notice is stamped with the
    selection it was raised against, so the next thing the screen says replaces
    it on its own.
  */
  const [notice, setNotice] = useState<{text: string; at: string} | null>(null)
  const announcement = notice?.at === selection ? notice.text : selection

  return (
    <>
      <div
        // Inside this, the arrow keys and letters are the console's, not the
        // screen reader's. The landmark in the page is the readable copy.
        aria-label="Yash Punia's portfolio, as a handheld console"
        className="fixed inset-0"
        role="application"
      >
        {webglOk ? (
          <WebglBoundary onError={failWebgl}>
            <Scene content={content} device={device} />
          </WebglBoundary>
        ) : (
          <FlatScreen content={content} device={device} />
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        <ConsoleControls
          content={content}
          onNotice={(text) => setNotice({text, at: selection})}
          visible={!webglOk}
        />
      </div>
      {tuning ? <TunePanel /> : null}
    </>
  )
}

/** What each cap's twin says it does. */
const CAP_LABELS: Record<FocusTarget, string> = {
  A: 'Open',
  B: 'Back',
}

/**
 * The accessible twins of the caps on the object. Everything on the shell is a
 * mesh and everything on the glass is inside an `aria-hidden` tree, so none of
 * it can take focus. Each twin carries `data-console-focus`, which lights its
 * cap's ring through `useLandmarkFocus`, so tabbing here is visible on the
 * object. Visually hidden until focused, in the manner of a skip link.
 *
 * Without WebGL there is no object, and the glass is on the page with its own
 * tabs, back control and résumé pill, so only the mute is shown there.
 */
function ConsoleControls({
  content,
  onNotice,
  visible,
}: {
  content: ConsoleContent
  onNotice: (notice: string) => void
  visible: boolean
}) {
  const muted = useConsole((state) => state.muted)
  const toggleMuted = useConsole((state) => state.toggleMuted)

  return (
    <div className={visible ? 'console-controls' : undefined}>
      <button
        className={visible ? undefined : 'sr-only'}
        onClick={() => {
          toggleMuted()
          onNotice(muted ? 'Sound on' : 'Sound off')
        }}
        type="button"
      >
        {muted ? 'Unmute the console' : 'Mute the console'}
      </button>
      {FOCUS_TARGETS.map((cap) => (
        <button
          className="sr-only"
          data-console-focus={cap}
          key={cap}
          onClick={() => pressAction(cap, content)}
          type="button"
        >
          {CAP_LABELS[cap]}
        </button>
      ))}
    </div>
  )
}
