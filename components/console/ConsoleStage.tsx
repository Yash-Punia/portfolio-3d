'use client'

import dynamic from 'next/dynamic'
import {useEffect, useState, useSyncExternalStore} from 'react'

import {
  linkForSlot,
  menuOptions,
  neighbours,
  openLink,
  SECTION_LABELS,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {useInput, type Direction, type FocusTarget} from '@/components/console/input'
import {isPortraitPhone, useIsMobile} from '@/components/console/mobile'
import {Skeleton} from '@/components/console/Skeleton'
import {useConsole, useTheme} from '@/components/console/store'
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

/** A finger has to travel this far before it is a swipe and not a tap. */
const SWIPE_PX = 44

/**
 * A screen delta, turned into the console's own frame.
 *
 * On an upright phone the open console has rolled a quarter turn, so the
 * visitor's fingers and the console's axes no longer agree: the console's right
 * is down the screen. Turning the deltas by the same quarter turn puts them
 * back in the console's frame, and everything downstream — a swipe, a scroll —
 * never learns the difference.
 *
 * The rotation must match `Console`'s roll. If one sign flips, they all do.
 */
function inConsoleFrame(dx: number, dy: number): {x: number; y: number} {
  const turned = isPortraitPhone(window.innerWidth, window.innerHeight)
  return turned ? {x: dy, y: -dx} : {x: dx, y: dy}
}

/**
 * How many screen pixels one pixel of a panel box measures.
 *
 * The firmware is authored at a fixed width and then scaled onto the glass by
 * `<Html transform>`, so a finger that has travelled 100 screen pixels has to
 * scroll more or fewer than 100 of the panel's own. Rolled a quarter turn, the
 * box's local height runs along the screen's x, which is why the bounding
 * rect's width is what is measured there.
 */
function panelScale(box: HTMLElement): number {
  const rect = box.getBoundingClientRect()
  const turned = isPortraitPhone(window.innerWidth, window.innerHeight)
  const onScreen = turned ? rect.width : rect.height
  const scale = box.offsetHeight > 0 ? onScreen / box.offsetHeight : 1
  return scale > 0 ? scale : 1
}

/**
 * SPEC §8's touch mappings: swipe left/right to move within the rail, up/down
 * to change section. The same `move()` the keys, the stick and the wheel go
 * through — a swipe is only another way of naming a direction.
 *
 * Carousel-natural rather than scroll-natural: the content follows the finger,
 * so swiping left brings the next project in from the right. The opposite
 * convention is one sign flip if it reads wrong on a real device.
 *
 * **A box that scrolls keeps its own gesture.** A phone-sized panel overflows
 * often — most timeline entries do, and every project's detail view does — and
 * a finger dragged up inside one has to scroll it, not jump to another section.
 * So a vertical drag that begins inside `[data-console-scroll]` scrolls that box
 * and never navigates, which is what a nested scroller does everywhere else.
 *
 * The scrolling is done here rather than left to the browser because the panel
 * is a rotated, scaled subtree of a `<Html transform>`: what the browser would
 * do with a touch on a box turned through 90° is not something to find out on
 * someone's phone. The box is marked `touch-action: none` so there is exactly
 * one thing moving it — this handler, through the same quarter turn the swipe
 * uses, so a scroll and a swipe can never disagree about which way is up.
 *
 * A sideways drag inside a scrolling box still moves the rail: there is nothing
 * to scroll along x, and it keeps the rail reachable from anywhere on screen.
 *
 * Nothing here calls `preventDefault`, so the taps the firmware already handles
 * — a tile to select, a tile again to drill in, `BACK` to come out — and the
 * taps on the flap's own controls all keep working.
 *
 * ponytail: no fling. The content tracks the finger and stops when it lifts;
 * momentum is a spring and a rAF loop away if it is missed on a real device.
 */
function useTouchRail(content: ConsoleContent, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let start: {x: number; y: number} | null = null
    let scroller: {box: HTMLElement; top: number; scale: number} | null = null
    let scrolling = false

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse') {
        start = null
        return
      }
      start = {x: event.clientX, y: event.clientY}
      scrolling = false

      const box =
        event.target instanceof HTMLElement ? event.target.closest('[data-console-scroll]') : null
      // A box with nothing hidden below the fold is not a scroller, so a swipe
      // that starts on a short entry still changes section.
      scroller =
        box instanceof HTMLElement && box.scrollHeight > box.clientHeight
          ? {box, top: box.scrollTop, scale: panelScale(box)}
          : null
    }

    function onPointerMove(event: PointerEvent) {
      if (!start || !scroller) return

      const {x, y} = inConsoleFrame(event.clientX - start.x, event.clientY - start.y)
      // The dominant axis wins outright, the same rule the swipe follows.
      if (Math.abs(y) <= Math.abs(x)) return

      scrolling = true
      scroller.box.scrollTop = scroller.top - y / scroller.scale
    }

    function onPointerUp(event: PointerEvent) {
      const from = start
      const scrolled = scrolling
      start = null
      scroller = null
      scrolling = false
      // A gesture that scrolled a box has already done its job.
      if (!from || scrolled) return

      // A detail view is not a rail, and neither is a closed console.
      const {isOpen, isDetailOpen} = useConsole.getState()
      if (!isOpen || isDetailOpen) return

      const {x, y} = inConsoleFrame(event.clientX - from.x, event.clientY - from.y)

      // The dominant axis wins outright: a diagonal drag should do one thing.
      if (Math.abs(x) > Math.abs(y)) {
        if (Math.abs(x) > SWIPE_PX) move(x < 0 ? 'right' : 'left', content)
      } else if (Math.abs(y) > SWIPE_PX) {
        move(y < 0 ? 'down' : 'up', content)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [content, enabled])
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

  useTouchRail(content, mobile)

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
      <ConsoleControls onNotice={(text) => setNotice({text, at: selection})} visible={!webglOk} />
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
 */
function ConsoleControls({
  onNotice,
  visible,
}: {
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
    </div>
  )
}
