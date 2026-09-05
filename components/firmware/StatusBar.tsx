'use client'

import {useSyncExternalStore} from 'react'

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
 * The persistent chrome across the top of the screen (SPEC §7): section name
 * left, firmware mark centre, clock right. Caps are allowed here and nowhere
 * else — this is diegetic console chrome, not a typographic label (SPEC §10).
 */
export function StatusBar({section}: {section: string}) {
  const time = useClock()
  const layout = useFirmwareLayout()

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
      <span style={{color: 'var(--screen-fg)'}}>{section}</span>
      <span>{VERSION}</span>
      {/* Reserves its own width so the bar does not reflow when the clock lands. */}
      <span style={{minWidth: '5ch', textAlign: 'right'}}>{time ?? ''}</span>
    </header>
  )
}
