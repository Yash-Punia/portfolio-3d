'use client'

import dynamic from 'next/dynamic'
import {useEffect, useState} from 'react'

import {accept, details, menu} from '@/components/console/actions'
import {
  contactRows,
  socialLabel,
  isLocalHref,
  RESUME_FILENAME,
  resumeHref,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {hasRows, SCREEN_LABELS, useDevice, type Device} from '@/components/console/device'
import {useInput, type Direction, type FocusTarget} from '@/components/console/input'
import {Skeleton} from '@/components/console/Skeleton'
import {useConsole} from '@/components/console/store'
import {C, FONT} from '@/components/console/tokens'
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

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/** The letters a keyboard presses the caps with. `D` is Y's (the design's legend), `M` is MENU. */
const KEYS: Record<string, FocusTarget> = {a: 'A', b: 'B', x: 'X', y: 'Y', d: 'Y', m: 'menu'}

/** What each cap does, wherever it is pressed from — the cap, its key, or its twin in the page. */
function pressAction(cap: FocusTarget, content: ConsoleContent, device: Device) {
  useInput.getState().pressSlot(cap)
  const state = useConsole.getState()

  if (cap === 'A') return accept(content, device)
  if (cap === 'B') return state.back()
  if (cap === 'Y') return details(content)
  if (cap === 'about') return state.setScreen('about')
  menu(device)
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
 * and `Space` are A, and the letters press their caps.
 */
function useConsoleKeys(content: ConsoleContent, device: Device) {
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
        pressAction('A', content, device)
        return
      }

      const cap = KEYS[event.key.toLowerCase()]
      if (cap) {
        event.preventDefault()
        pressAction(cap, content, device)
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
  }, [content, device])
}

const FOCUS_TARGETS: FocusTarget[] = ['A', 'B', 'X', 'Y', 'menu', 'about']

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
 * - A list: up and down walk its rows, and scroll on past the ends.
 * - Anything else that scrolls: up and down scroll it.
 */
function move(direction: Direction, content: ConsoleContent, device: Device) {
  const state = useConsole.getState()
  const vertical = direction === 'up' || direction === 'down'
  const delta = direction === 'up' || direction === 'left' ? -1 : 1

  if (state.screen === 'games') {
    if (!vertical) return state.moveGame(delta, content.projects.length)
    if (state.isProjectOpen) scrollBox(direction)
    return
  }

  if (!vertical) return
  if (hasRows(state.screen, device)) {
    const before = state.rowIndex
    state.moveRow(delta, contactRows(content).length)
    if (useConsole.getState().rowIndex !== before) return
  }
  scrollBox(direction)
}

/**
 * The D-pad's and the arrow keys' consumer: `input.tick` advances once per
 * move, so subscribing here moves the selection one step per press or repeat.
 */
function useDirectionalInput(content: ConsoleContent, device: Device) {
  useEffect(
    () =>
      useInput.subscribe((state, previous) => {
        if (state.tick === previous.tick || state.held === null) return
        move(state.held, content, device)
      }),
    [content, device],
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
function useAnnouncement(content: ConsoleContent, device: Device): string {
  const isBooting = useConsole((state) => state.isBooting)
  const screen = useConsole((state) => state.screen)
  const index = useConsole((state) => state.gameIndex)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const isTrailerPlaying = useConsole((state) => state.isTrailerPlaying)
  const rowIndex = useConsole((state) => state.rowIndex)

  if (isBooting) return 'Console on'

  if (screen !== 'games') {
    const label = SCREEN_LABELS[screen]
    if (!hasRows(screen, device)) return label
    const row = contactRows(content)[rowIndex]
    return row ? `${label}, ${row.label}` : label
  }

  const project = content.projects[index]
  if (!project) return 'Games'
  const name = project.title ?? ''
  if (isTrailerPlaying) return `${name}, trailer playing`
  if (isProjectOpen) return `${name}, details`
  return `Games, ${name}, ${index + 1} of ${content.projects.length}`
}

/**
 * The page around the desk console (design 4a): name and title on the left,
 * the links and the résumé on the right — so a recruiter never has to "play"
 * to reach them — and the keyboard's hint underneath.
 */
function DeskChrome({content}: {content: ConsoleContent}) {
  const {settings, socialLinks} = content
  const resume = resumeHref(settings)
  const link = {color: C.muted, textDecoration: 'none'}

  return (
    <>
      <header
        style={{
          position: 'fixed',
          left: 56,
          right: 56,
          top: 0,
          height: 84,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: FONT.ui,
          color: C.ink,
          zIndex: 5,
        }}
      >
        <div style={{display: 'flex', gap: 14, alignItems: 'baseline'}}>
          <div style={{fontSize: 15, fontWeight: 600}}>{settings?.fullName}</div>
          {settings?.title ? (
            <div style={{fontSize: 14, color: C.label}}>{settings.title}</div>
          ) : null}
        </div>
        <nav aria-label="Contact" style={{display: 'flex', gap: 28, fontSize: 14}}>
          {socialLinks.map((social) =>
            social.url ? (
              <a
                className="chrome-link"
                href={social.url}
                key={social._id}
                rel="noopener noreferrer"
                style={link}
                target="_blank"
              >
                {socialLabel(social)}
              </a>
            ) : null,
          )}
          {resume ? (
            <a
              className="chrome-link"
              download={isLocalHref(resume) ? RESUME_FILENAME : undefined}
              href={resume}
              style={{...link, color: C.ink}}
            >
              Résumé ↓
            </a>
          ) : null}
        </nav>
      </header>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 30,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: FONT.ui,
          fontSize: 12.5,
          color: C.dim,
          pointerEvents: 'none',
        }}
      >
        Arrow keys · Enter · Esc
      </div>
    </>
  )
}

export function ConsoleStage({content}: {content: ConsoleContent}) {
  const device = useDevice()
  const webglOk = useWebgl()
  useConsoleKeys(content, device)
  useLandmarkFocus()
  useDirectionalInput(content, device)
  useWheelShelf(content)
  const selection = useAnnouncement(content, device)

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
      {device === 'desk' ? <DeskChrome content={content} /> : null}
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
          device={device}
          onNotice={(text) => setNotice({text, at: selection})}
          visible={!webglOk}
        />
      </div>
    </>
  )
}

/** What each cap's twin says it does. */
const CAP_LABELS: Record<ButtonSlot | 'menu', string> = {
  A: 'Select',
  B: 'Back',
  X: 'Next tab',
  Y: 'Open the selected game’s details',
  menu: 'Menu: next tab',
}

/**
 * The accessible twins of the caps on the object. Everything on the shell is a
 * mesh and everything on the glass is inside an `aria-hidden` tree, so none of
 * it can take focus. Each twin carries `data-console-focus`, which lights its
 * cap's ring through `useLandmarkFocus`, so tabbing here is visible on the
 * object. Visually hidden until focused, in the manner of a skip link.
 *
 * Without WebGL there is no object, and the glass is on the page with its own
 * tabs and back control, so only the mute is shown there.
 */
function ConsoleControls({
  content,
  device,
  onNotice,
  visible,
}: {
  content: ConsoleContent
  device: Device
  onNotice: (notice: string) => void
  visible: boolean
}) {
  const muted = useConsole((state) => state.muted)
  const toggleMuted = useConsole((state) => state.toggleMuted)
  const caps: Array<ButtonSlot | 'menu'> =
    device === 'desk' ? ['A', 'B', 'X', 'Y', 'menu'] : ['A', 'B', 'menu']

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
      {caps.map((cap) => (
        <button
          className="sr-only"
          data-console-focus={cap}
          key={cap}
          onClick={() => pressAction(cap, content, device)}
          type="button"
        >
          {CAP_LABELS[cap]}
        </button>
      ))}
      {device === 'handheld' ? (
        <button
          className="sr-only"
          data-console-focus="about"
          onClick={() => pressAction('about', content, device)}
          type="button"
        >
          About
        </button>
      ) : null}
    </div>
  )
}
