'use client'

import {useState, useSyncExternalStore} from 'react'

import {GLYPHS, VIEWBOX} from '@/components/console/glyphs'
import {useConsole} from '@/components/console/store'
import {useFirmwareLayout} from '@/components/firmware/layout'

/** SPEC §16.4, confirmed: the firmware's version string. */
const VERSION = 'YP-OS 1.0'

function clockText(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * The wall clock is an external source, so it is read as one: the server
 * snapshot is `null` — the visitor's local time is the one string here that is
 * not the same for everyone, and rendering it during hydration would disagree
 * with the markup that arrived.
 *
 * Polling twice a minute rather than every second is deliberate. The snapshot is
 * `HH:MM`, so React sees the same string until the minute actually turns and
 * re-renders — and every re-render of this component repaints the canvas the
 * firmware is drawn into.
 */
const POLL_MS = 30_000

function subscribeToClock(onChange: () => void) {
  const id = setInterval(onChange, POLL_MS)
  return () => clearInterval(id)
}

function useClock(): string | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => clockText(new Date()),
    () => null,
  )
}

/**
 * The way out, top left of the glass: a left arrow, where every screen on a
 * phone puts one — and the section name beside it, because the two of them
 * together are a target a thumb can actually find. An arrow alone on a bar this
 * size is about ten pixels wide on a phone.
 *
 * So the name is part of the control rather than a label next to it. That reads
 * the way a phone's back affordance normally does, where the title of the place
 * you came from is the thing you press.
 *
 * It is the B cap's twin: both call `back()`, so a detail view closes, then the
 * Timeline returns to the Library, then the console shuts. The screen used to
 * say this with a pair of large `▴ / ▾` section arrows above and below the
 * content; the flap carries that job now (Library and Timeline have caps of
 * their own), and what the screen was missing was the step *out*.
 *
 * A span, not a button, for the reason the mute beside it is one: this tree is
 * `aria-hidden` and a focusable element inside one is a trap. The accessible
 * twin is the "Back" button in the page.
 */
function BackControl({section}: {section: string}) {
  const layout = useFirmwareLayout()
  const back = useConsole((state) => state.back)
  const [hovered, setHovered] = useState(false)
  const box = VIEWBOX.chevronLeft
  const mark = Math.round(layout.statusFont * 1.5)
  const pad = Math.round(layout.railX * 0.46)

  return (
    <span
      onClick={back}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6ch',
        // Full height of the bar, and out to its left edge: the tap area is
        // everything there is room for rather than the ink's own box.
        alignSelf: 'stretch',
        margin: `0 0 0 -${pad}px`,
        padding: `0 ${pad}px`,
        color: hovered ? 'var(--screen-accent)' : 'var(--screen-fg)',
        cursor: 'pointer',
      }}
    >
      <svg
        aria-hidden
        fill="var(--screen-accent)"
        height={mark}
        viewBox={`0 0 ${box} ${box}`}
        width={mark}
      >
        <path d={GLYPHS.chevronLeft} />
      </svg>
      {section}
    </span>
  )
}

/**
 * The persistent chrome across the top of the screen (SPEC §7): the way back
 * and the section name left, firmware mark centre, clock right. Caps are
 * allowed here and nowhere else — this is diegetic console chrome, not a
 * typographic label (SPEC §10).
 */
export function StatusBar({section}: {section: string}) {
  const time = useClock()
  const layout = useFirmwareLayout()
  const muted = useConsole((state) => state.muted)
  const toggleMuted = useConsole((state) => state.toggleMuted)

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${Math.round(layout.railX * 0.46)}px`,
        height: `${layout.statusHeight}px`,
        flex: '0 0 auto',
        borderBottom: '1px solid color-mix(in srgb, var(--screen-muted) 28%, transparent)',
        color: 'var(--screen-muted)',
        fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
        fontSize: `${layout.statusFont}px`,
        letterSpacing: '0.14em',
      }}
    >
      <BackControl section={section} />

      <span style={{display: 'flex', alignItems: 'center', gap: '1.1ch'}}>
        {VERSION}
        {/*
          The mute (SPEC §16.2). A span, not a button: this tree is
          `aria-hidden`, and a focusable element inside one is a trap — the
          accessible twin is a real button in the page's landmark, the same
          arrangement the resume link has had since Phase 3.

          U+266A is a text-default character, so it does not arrive as a
          colour emoji the way a speaker glyph would.
        */}
        <span
          onClick={toggleMuted}
          style={{
            color: muted ? 'var(--screen-muted)' : 'var(--screen-accent)',
            cursor: 'pointer',
            textDecoration: muted ? 'line-through' : 'none',
          }}
        >
          ♪
        </span>
      </span>

      {/* Reserves its own width so the bar does not reflow when the clock lands. */}
      <span style={{minWidth: '5ch', textAlign: 'right'}}>{time ?? ''}</span>
    </header>
  )
}
