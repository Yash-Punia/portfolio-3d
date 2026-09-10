'use client'

import dynamic from 'next/dynamic'
import {useEffect, useState, useSyncExternalStore} from 'react'

import {accept} from '@/components/console/actions'
import {
  menuOptions,
  neighbours,
  SECTION_LABELS,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {inConsoleFrame, panelScale} from '@/components/console/frame'
import {useInput, type Direction, type FocusTarget} from '@/components/console/input'
import {useIsMobile} from '@/components/console/mobile'
import {Skeleton} from '@/components/console/Skeleton'
import {useConsole, useTheme, type Section} from '@/components/console/store'
import {failWebgl, useWebgl, WebglBoundary} from '@/components/console/webgl'

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
 * The firmware without a canvas (SPEC §11.3), in its own chunk for the same
 * reason the scene is in one: a visitor whose browser runs WebGL never
 * downloads it, and importing it directly here would pull the whole firmware
 * into the page bundle (SPEC §12).
 */
const FallbackFirmware = dynamic(() => import('@/components/console/FallbackFirmware'), {
  ssr: false,
})

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

const SLOT_KEYS: Record<string, ButtonSlot> = {a: 'A', b: 'B', x: 'X', y: 'Y'}

/**
 * What each face button does, wherever it is pressed from — the cap, its
 * letter key, or the hidden twin in the page. `FaceButtons` builds the same
 * four; this is the copy the keyboard and the landmark share.
 */
const SLOT_LABELS: Record<ButtonSlot, string> = {
  A: 'Select',
  B: 'Back',
  X: 'Open the games library',
  Y: 'Open the experience timeline',
}

/** The section each of the two shortcut caps jumps to. */
const SLOT_SECTION: Partial<Record<ButtonSlot, Section>> = {X: 'library', Y: 'timeline'}

function pressSlotAction(slot: ButtonSlot, content: ConsoleContent) {
  useInput.getState().pressSlot(slot)

  if (slot === 'A') return accept(content)
  if (slot === 'B') return useConsole.getState().back()

  const section = SLOT_SECTION[slot]
  if (section) useConsole.getState().jump(section)
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
 * Keyboard control of the console, on the DOM side so it works before the
 * three.js chunk lands.
 *
 * `Escape` is the back button (SPEC §5); `Enter` and `Space` open, because a
 * canvas that can only be opened by pointer is a dead end for keyboard visitors
 * (§11.4). The arrow keys are the joystick (§5) — they write the same held
 * direction the stick writes, which is what makes the stick lean when they are
 * pressed — and `A`/`B`/`X`/`Y` do what the four caps beside them do.
 */
function useConsoleKeys(content: ConsoleContent) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping()) return

      const {isOpen, open, back} = useConsole.getState()

      // Escape is the B button: a detail view, then the menu, then the console
      // itself. One definition of back, in the store (SPEC §8).
      if (event.key === 'Escape') {
        if (!isOpen) return
        back()
        return
      }

      if (isOpen) {
        const direction = ARROWS[event.key]
        if (direction) {
          event.preventDefault()
          useInput.getState().hold(direction)
          return
        }

        // Enter is the A button: it takes the highlighted menu half, or opens
        // the selected project.
        if (event.key === 'Enter' || event.key === ' ') {
          if (document.activeElement !== document.body) return
          event.preventDefault()
          accept(content)
          return
        }

        const slot = SLOT_KEYS[event.key.toLowerCase()]
        if (slot) {
          event.preventDefault()
          pressSlotAction(slot, content)
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

const FOCUS_TARGETS: FocusTarget[] = ['A', 'B', 'X', 'Y', 'close', 'theme']

/**
 * The physical controls' focus rings, and the rail's selection, driven by real
 * DOM focus in the page.
 *
 * The visually-hidden landmark already renders the anchors and buttons — they
 * are server-rendered, they carry the accessible names, and they are where
 * `Tab` naturally lands. Mirroring their focus onto the object gives SPEC
 * §11.4's visible focus indicator without a second, duplicate set of controls
 * for a screen reader to read through, and it is delegated from `document` so
 * `app/page.tsx` stays a Server Component with no handlers of its own.
 *
 * Two attributes: `data-console-focus` names a control on the chassis, and
 * `data-project-index` names a tile on the Library rail — focusing a project's
 * button selects that tile, activating it opens the tile's detail view, which is
 * SPEC §11.6's "project tiles are buttons" without leaving the rail behind.
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

      const {isOpen, isDetailOpen, setSection, setLibraryIndex} = useConsole.getState()
      setLibraryIndex(index)
      if (isOpen && !isDetailOpen) setSection('library')
    }

    function onClick(event: MouseEvent) {
      const index = indexOf(event.target)
      if (index === null) return

      // `open()` starts the firmware from the top, so it goes first and the
      // destination is set after it.
      const console = useConsole.getState()
      if (!console.isOpen) console.open()
      console.setSection('library')
      console.setLibraryIndex(index)
      console.openDetail()
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
 * Finger-scrolling a panel that overflows: a timeline entry with a long
 * summary, a project's detail view.
 *
 * It is done here rather than left to the browser because the panel is a
 * rotated, scaled subtree of a `<Html transform>`: what a browser makes of a
 * touch on a box turned through 90° is not something to find out on someone's
 * phone. The box is marked `touch-action: none`, so there is exactly one thing
 * moving it — this, through `inConsoleFrame`, the same quarter turn the rails
 * drag through.
 *
 * This used to carry swipe navigation too. It does not any more: sideways is
 * the rails' own drag, which follows the finger instead of jumping a tile at a
 * time, and up/down are the Library and Timeline buttons on the flap. A
 * window-wide swipe was also the thing quietly competing with drag-to-rotate,
 * which is why the console would not turn under a finger.
 *
 * Hence the `[data-firmware]` gate: nothing outside the screen is ever
 * captured here, so a drag on bare chassis belongs entirely to `Console`.
 *
 * Nothing calls `preventDefault`, so every tap the firmware handles still
 * works.
 */
function usePanelScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let start: {x: number; y: number} | null = null
    let scroller: {box: HTMLElement; top: number; scale: number} | null = null

    function onPointerDown(event: PointerEvent) {
      start = null
      scroller = null
      if (event.pointerType === 'mouse') return
      if (!(event.target instanceof HTMLElement)) return
      if (!event.target.closest('[data-firmware]')) return

      const box = event.target.closest('[data-console-scroll]')
      // A box with nothing hidden below the fold is not a scroller.
      if (!(box instanceof HTMLElement) || box.scrollHeight <= box.clientHeight) return

      start = {x: event.clientX, y: event.clientY}
      scroller = {box, top: box.scrollTop, scale: panelScale(box)}
    }

    function onPointerMove(event: PointerEvent) {
      if (!start || !scroller) return

      const {x, y} = inConsoleFrame(event.clientX - start.x, event.clientY - start.y)
      // The dominant axis wins outright, the same rule the rails follow.
      if (Math.abs(y) <= Math.abs(x)) return

      scroller.box.scrollTop = scroller.top - y / scroller.scale
    }

    function onPointerUp() {
      start = null
      scroller = null
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [enabled])
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
  const isBooting = useConsole((state) => state.isBooting)
  const section = useConsole((state) => state.section)
  const menuIndex = useConsole((state) => state.menuIndex)
  const index = useConsole((state) => state.libraryIndex)
  const timelineIndex = useConsole((state) => state.timelineIndex)
  const isDetailOpen = useConsole((state) => state.isDetailOpen)

  // Opening, booting and closing are state changes with nothing on screen to
  // read, so they say themselves. Closed is the first render's value, which a
  // live region does not announce — it only speaks once this changes.
  if (!isOpen) return 'Console closed'
  if (isBooting) return 'Console on, booting'

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
  useLandmarkFocus()
  useStageTheme()
  useRailInput(content)
  useWheelRail(content)
  const tuning = useTuningFlag()
  const selection = useAnnouncement(content)
  const mobile = useIsMobile()
  const webglOk = useWebgl()

  /*
    A control that changes something invisible says so — the theme and the mute
    have no on-screen state a screen reader can reach. Each notice is stamped
    with the selection it was raised against, so the next thing the rail says
    replaces it on its own: no timer, and no stale "Light screen" left in the
    region to be read out again on the way past.
  */
  const [notice, setNotice] = useState<{text: string; at: string} | null>(null)
  const announcement = notice?.at === selection ? notice.text : selection

  usePanelScroll(mobile)

  return (
    <div
      // SPEC §11.6: inside this, the arrow keys and letters are the console's,
      // not the screen reader's. The landmark in the page is the readable copy.
      role="application"
      aria-label="Yash Punia's portfolio, as a handheld console"
      className="fixed inset-0"
    >
      {webglOk ? (
        <WebglBoundary onError={failWebgl}>
          <Scene content={content} />
        </WebglBoundary>
      ) : (
        <FallbackFirmware content={content} />
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ConsoleControls
        content={content}
        onNotice={(text) => setNotice({text, at: selection})}
        visible={!webglOk}
      />
      {tuning ? <TuningPanel /> : null}
    </div>
  )
}

/**
 * The accessible twins of the controls on the object (SPEC §11.4).
 *
 * Everything on the chassis is a mesh, and everything on the screen is inside
 * the firmware's `aria-hidden` tree — so none of it can take focus, and without
 * these the theme cap in particular had no keyboard path at all. Each button
 * carries `data-console-focus`, which lights its physical twin's focus ring
 * through `useLandmarkFocus`, so tabbing here is visible on the object.
 *
 * They are visually hidden until focused, in the manner of a skip link. With no
 * WebGL there is no object to point at, so they are simply on screen — and
 * `Close` is dropped there, because closing would leave an empty page.
 *
 * The four face buttons are here too. They used to borrow the landmark's social
 * anchors, which carried `data-console-focus` because each cap was one of those
 * links; the caps are the console's own verbs now, so they need buttons that
 * say what they do. Without WebGL the firmware is on screen with its own BACK
 * control and section arrows, so these four stay hidden there.
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
  const isOpen = useConsole((state) => state.isOpen)
  const open = useConsole((state) => state.open)
  const close = useConsole((state) => state.close)
  const muted = useConsole((state) => state.muted)
  const toggleMuted = useConsole((state) => state.toggleMuted)
  const setTheme = useConsole((state) => state.setTheme)
  const theme = useTheme()

  const next = theme === 'dark' ? 'light' : 'dark'
  const className = visible ? undefined : 'sr-only'

  return (
    <div className={visible ? 'console-controls' : undefined}>
      {visible ? null : (
        <button
          className={className}
          // Named unconditionally: focus is read when it happens, and a button
          // that only claims the cap once the console is open would light
          // nothing for the visitor who opened it from this very control. The
          // cap it rings is behind a shut flap until then.
          data-console-focus="close"
          onClick={() => (isOpen ? close() : open())}
          type="button"
        >
          {isOpen ? 'Close the console' : 'Open the console'}
        </button>
      )}
      <button
        className={className}
        data-console-focus="theme"
        onClick={() => {
          setTheme(next)
          onNotice(next === 'dark' ? 'Dark screen' : 'Light screen')
        }}
        type="button"
      >
        {next === 'dark' ? 'Switch to the dark screen' : 'Switch to the light screen'}
      </button>
      <button
        className={className}
        onClick={() => {
          toggleMuted()
          onNotice(muted ? 'Sound on' : 'Sound off')
        }}
        type="button"
      >
        {muted ? 'Unmute the console' : 'Mute the console'}
      </button>
      {FACE_SLOTS.map((slot) => (
        <button
          className="sr-only"
          data-console-focus={slot}
          key={slot}
          onClick={() => pressSlotAction(slot, content)}
          type="button"
        >
          {SLOT_LABELS[slot]}
        </button>
      ))}
    </div>
  )
}

/** In the order they read on the diamond: top, right, bottom, left. */
const FACE_SLOTS: ButtonSlot[] = ['X', 'A', 'B', 'Y']
