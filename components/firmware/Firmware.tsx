'use client'

import type {ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {Boot} from '@/components/firmware/Boot'
import {Detail} from '@/components/firmware/Detail'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {LibraryRail} from '@/components/firmware/LibraryRail'
import {StatusBar} from '@/components/firmware/StatusBar'
import {useScreenTheme} from '@/components/firmware/theme'

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
/** Phase 5 adds the timeline; until then the status bar names the one section. */
const SECTION = 'LIBRARY'

export function Firmware({content}: {content: ConsoleContent}) {
  const {vars} = useScreenTheme()
  const layout = useFirmwareLayout()
  const index = useConsole((state) => state.libraryIndex)
  const isDetailOpen = useConsole((state) => state.isDetailOpen)

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
      <StatusBar section={SECTION} />
      <LibraryRail content={content} />

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
