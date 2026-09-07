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
import {isPortraitPhone, useIsMobile} from '@/components/console/mobile'
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
  const mobile = useIsMobile()
  const muted = useConsole((state) => state.muted)
  const toggleMuted = useConsole((state) => state.toggleMuted)

  useTouchRail(content, mobile)

  return (
    <div className="fixed inset-0">
      <Scene content={content} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {/*
        The mute's accessible twin (SPEC §16.2). The glyph in the status bar is
        inside the firmware's `aria-hidden` tree and cannot be focusable, and
        the sounds have no other control — so, like Phase 6's close and theme
        buttons, the real one is a labelled button out here in the page.
      */}
      <button className="sr-only" onClick={toggleMuted} type="button">
        {muted ? 'Unmute the console' : 'Mute the console'}
      </button>
      {tuning ? <TuningPanel /> : null}
    </div>
  )
}
