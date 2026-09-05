'use client'

import {useEffect, useState} from 'react'

import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * SPEC §7's power-on: black, a scanline expanding vertically, a firmware header,
 * then a wipe onto the Library. Reopening plays the short form instead of the
 * full sequence, and reduced motion skips it entirely.
 */
const FULL_MS = 900
const SHORT_MS = 250
/** Where the header lands inside the full sequence. */
const LINE_MS = 180

export function Boot({name}: {name: string | null}) {
  const isBooting = useConsole((state) => state.isBooting)
  const hasBooted = useConsole((state) => state.hasBooted)
  const endBoot = useConsole((state) => state.endBoot)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()
  // Held from the first render so a re-render mid-boot cannot restart it.
  const [short] = useState(hasBooted)
  const duration = short ? SHORT_MS : FULL_MS

  useEffect(() => {
    if (!isBooting) return
    if (reducedMotion) {
      endBoot()
      return
    }

    const done = setTimeout(endBoot, duration)
    return () => clearTimeout(done)
  }, [isBooting, reducedMotion, duration, endBoot])

  if (!isBooting || reducedMotion) return null

  /*
    The overlay is `pointer-events: none` and the Library is already mounted and
    interactive underneath it — SPEC §7: the boot must never block.
  */
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--screen-bg)',
        pointerEvents: 'none',
        animation: `firmware-boot-out 140ms linear ${duration - 140}ms forwards`,
        zIndex: 3,
      }}
    >
      {/* The scanline: a bright hairline that opens vertically into the panel. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: 'var(--screen-accent)',
          animation: `firmware-scanline ${LINE_MS}ms ease-out forwards`,
        }}
      />

      {short ? null : (
        <div
          style={{
            textAlign: 'center',
            opacity: 0,
            animation: `firmware-header 420ms ease-out ${LINE_MS}ms forwards`,
          }}
        >
          <p
            style={{
              margin: 0,
              color: 'var(--screen-muted)',
              fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
              fontSize: `${layout.statusFont}px`,
              letterSpacing: '0.32em',
            }}
          >
            YP-OS 1.0
          </p>
          {name ? (
            <p
              style={{
                margin: `${layout.textGap}px 0 0`,
                color: 'var(--screen-fg)',
                fontFamily: 'var(--font-archivo), system-ui, sans-serif',
                fontSize: `${Math.round(layout.titleFont * 0.9)}px`,
                fontStretch: '118%',
                fontWeight: 600,
              }}
            >
              {name}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
