'use client'

import {neighbours, SECTION_LABELS, type ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {Boot} from '@/components/firmware/Boot'
import {Detail} from '@/components/firmware/Detail'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {LibraryRail} from '@/components/firmware/LibraryRail'
import {Menu} from '@/components/firmware/Menu'
import {StatusBar} from '@/components/firmware/StatusBar'
import {Timeline} from '@/components/firmware/Timeline'
import {useScreenTheme} from '@/components/firmware/theme'
import type {Section} from '@/components/console/store'

/** The status bar's own names: short caps chrome, not the readable labels. */
const STATUS_NAMES: Record<Section, string> = {
  menu: 'MENU',
  library: 'LIBRARY',
  timeline: 'TIMELINE',
}

/**
 * The way out of a screen, at the edge it leads to: a large chevron and the
 * name of where it goes. Up sits above the section, down below it, and the pair
 * of them is what makes the up/down keys discoverable — the joystick's other
 * axis is not obvious from a rail that only moves sideways.
 *
 * It is a control as well as a sign, because everything else on the screen is
 * clickable too. Where the stack has no neighbour, `neighbours()` returns none
 * and nothing renders — no dead affordance (SPEC §3.2).
 */
function SectionArrow({
  direction,
  label,
  onSwitch,
}: {
  direction: 'up' | 'down'
  label: string
  onSwitch: () => void
}) {
  const layout = useFirmwareLayout()

  return (
    <div
      onClick={onSwitch}
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${Math.round(layout.railX * 0.3)}px`,
        cursor: 'pointer',
        padding: `${Math.round(layout.railX * 0.2)}px 0`,
        color: 'var(--screen-muted)',
      }}
    >
      <span
        style={{
          color: 'var(--screen-accent)',
          fontSize: `${Math.round(layout.titleFont * 0.8)}px`,
          lineHeight: 0.7,
        }}
      >
        {direction === 'up' ? '▴' : '▾'}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
          fontSize: `${layout.metaFont + 2}px`,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * The firmware (SPEC §7): one self-contained tree that knows nothing about
 * whether it is in 3D. Phase 4 mounts it through drei's `<Html transform>` on
 * the screen plane; Phase 6 mounts the same tree as a fullscreen DOM layer on
 * mobile. Everything below this line is ordinary DOM.
 *
 * It is authored at a pixel size from the tuning values and scaled to the
 * screen's world size by whatever mounts it, so the type scale is a fixed ratio
 * of the panel rather than something to re-guess when the console is retuned —
 * and every size in it can be dialled in live from `?tune`.
 *
 * The tree is `aria-hidden`. The accessible copy of every string here is the
 * server-rendered `.sr-only` landmark on the page (SPEC §11.1) — reading the
 * portfolio twice is worse than reading it once, and nothing inside an
 * `aria-hidden` subtree may be focusable. `ConsoleStage` renders the live region
 * that announces what the rail has selected.
 */
export function Firmware({content}: {content: ConsoleContent}) {
  const {vars} = useScreenTheme()
  const layout = useFirmwareLayout()
  const index = useConsole((state) => state.libraryIndex)
  const isDetailOpen = useConsole((state) => state.isDetailOpen)
  const section = useConsole((state) => state.section)
  const setSection = useConsole((state) => state.setSection)

  const project = content.projects[index] ?? null
  const {up, down} = neighbours(section, content)

  return (
    <div
      aria-hidden
      style={{
        ...vars,
        position: 'relative',
        overflow: 'hidden',
        width: `${layout.panelWidth}px`,
        height: `${layout.panelHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--screen-bg)',
        color: 'var(--screen-fg)',
        fontFamily: 'var(--font-archivo), system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      <StatusBar section={STATUS_NAMES[section]} />

      {up ? (
        <SectionArrow direction="up" label={SECTION_LABELS[up]} onSwitch={() => setSection(up)} />
      ) : null}

      {/* Keyed so the screens crossfade into one another. */}
      <div key={section} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
        {section === 'menu' ? <Menu content={content} /> : null}
        {section === 'library' ? <LibraryRail content={content} /> : null}
        {section === 'timeline' ? <Timeline content={content} /> : null}
      </div>

      {down ? (
        <SectionArrow
          direction="down"
          label={SECTION_LABELS[down]}
          onSwitch={() => setSection(down)}
        />
      ) : null}

      {isDetailOpen && project ? <Detail project={project} /> : null}

      <Boot name={content.settings?.fullName ?? null} />

      {/*
        SPEC §9: scanlines at 3% dark / 1.5% light, plus a hint of vignette. A
        suggestion of a display, not a CRT filter — and never in the way of a
        pointer.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 4,
          background:
            'repeating-linear-gradient(to bottom, rgba(0,0,0,var(--screen-scanline)) 0 1px, transparent 1px 3px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 4,
          background: 'radial-gradient(75% 65% at 50% 45%, transparent 55%, rgba(0,0,0,0.28) 100%)',
        }}
      />
    </div>
  )
}
