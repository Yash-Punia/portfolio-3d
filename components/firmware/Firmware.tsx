'use client'

import type {ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {Boot} from '@/components/firmware/Boot'
import {Detail} from '@/components/firmware/Detail'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {LibraryRail} from '@/components/firmware/LibraryRail'
import {StatusBar} from '@/components/firmware/StatusBar'
import {Timeline} from '@/components/firmware/Timeline'
import {useScreenTheme} from '@/components/firmware/theme'

/**
 * The section indicator, in the band the rail leaves empty at the bottom of the
 * screen: down enters the timeline, up comes back (SPEC §8). It is a control as
 * well as a sign, because every tile on the screen above it is clickable too.
 *
 * With no timeline entries published there is nowhere to go, so it does not
 * render at all — no empty axis, no dead affordance (SPEC §3.2).
 */
function SectionHint({toTimeline, onSwitch}: {toTimeline: boolean; onSwitch: () => void}) {
  const layout = useFirmwareLayout()

  return (
    <p
      onClick={onSwitch}
      style={{
        flex: '0 0 auto',
        margin: 0,
        padding: `0 ${layout.railX}px ${Math.round(layout.railX * 0.42)}px`,
        color: 'var(--screen-muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
        fontSize: `${layout.metaFont}px`,
        letterSpacing: '0.16em',
      }}
    >
      {toTimeline ? '▾  TIMELINE' : '▴  LIBRARY'}
    </p>
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

  const project = index > 0 ? (content.projects[index - 1] ?? null) : null

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
      <StatusBar section={section === 'timeline' ? 'TIMELINE' : 'LIBRARY'} />

      {/* Keyed so the two sections crossfade into one another. */}
      <div key={section} style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
        {section === 'timeline' ? (
          <Timeline content={content} />
        ) : (
          <LibraryRail content={content} />
        )}
      </div>

      {content.timeline.length > 0 ? (
        <SectionHint
          toTimeline={section === 'library'}
          onSwitch={() => setSection(section === 'library' ? 'timeline' : 'library')}
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
