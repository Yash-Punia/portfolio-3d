'use client'

import {Html} from '@react-three/drei'

import type {ConsoleContent} from '@/components/console/content'
import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'

/**
 * The DOM is authored at this width in CSS pixels and then scaled to the
 * monitor's width in world units, so the type scale is a fixed ratio of the
 * panel rather than something to re-guess whenever the flap is retuned.
 */
const PANEL_PX = 420

/**
 * drei's transform mode lays the element out at `400 / distanceFactor` CSS
 * pixels per world unit, and defaults `distanceFactor` to 10 — so one world unit
 * is 40px there, and the scale that fits PANEL_PX into the panel has to undo it.
 */
const PX_PER_UNIT = 40

/** SPEC §9's two palettes, for the one surface that shows text this phase. */
const PALETTE = {
  dark: {foreground: '#e9f0f1', muted: '#7c8b90'},
  light: {foreground: '#141819', muted: '#6b6f70'},
} as const

/**
 * The small secondary display at the top of the left flap (SPEC §4). Self-lit,
 * so it reads as a powered instrument rather than a printed panel, and it shows
 * the name, title and status line whenever Sanity has them.
 *
 * The text is real DOM through drei's `<Html transform>` — the same mount SPEC
 * §7 locks for the firmware screen in Phase 4 — and is `aria-hidden`, because
 * the accessible copy of these strings is the server-rendered `.sr-only`
 * landmark on the page. Reading them twice is worse than reading them once.
 */
export function InfoMonitor({settings}: {settings: ConsoleContent['settings']}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const theme = useTheme()
  const palette = PALETTE[theme]

  const name = settings?.fullName
  const title = settings?.title
  const status = settings?.statusLine

  /**
   * Flap-local space is mirrored once the door swings through ~172°, so the
   * face group turns back through π and everything inside it can be laid out
   * as if facing the camera: +x right, +y up, +z out of the surface.
   */
  return (
    <group position={[0, d.monitor.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0, d.monitor.depth / 2]}>
        <boxGeometry
          args={[
            d.monitor.width + d.monitor.bezel * 2,
            d.monitor.height + d.monitor.bezel * 2,
            d.monitor.depth,
          ]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      {/* SPEC §4: the info monitor is meshBasicMaterial — unlit, always on. */}
      <mesh position={[0, 0, d.monitor.depth + 0.001]}>
        <planeGeometry args={[d.monitor.width, d.monitor.height]} />
        <meshBasicMaterial color={m.screenOn[theme]} toneMapped={false} />
      </mesh>

      {/*
        Mounted only while the console is open: closed, this panel faces into
        the body, and DOM in 3D space has no depth test to hide it there.
      */}
      {isOpen && (name || title || status) ? (
        <Html
          aria-hidden
          center
          pointerEvents="none"
          position={[0, 0, d.monitor.depth + 0.002]}
          scale={(d.monitor.width / PANEL_PX) * PX_PER_UNIT}
          transform
        >
          <div
            style={{
              width: `${PANEL_PX}px`,
              padding: '34px 38px',
              boxSizing: 'border-box',
              color: palette.foreground,
              fontFamily: 'var(--font-archivo), system-ui, sans-serif',
              lineHeight: 1.15,
              userSelect: 'none',
            }}
          >
            {name ? (
              <p
                style={{
                  margin: 0,
                  fontSize: '46px',
                  fontWeight: 600,
                  fontStretch: '112%',
                  letterSpacing: '-0.01em',
                }}
              >
                {name}
              </p>
            ) : null}
            {title ? (
              <p style={{margin: '10px 0 0', fontSize: '26px', color: palette.muted}}>{title}</p>
            ) : null}
            {status ? (
              <p
                style={{
                  margin: '26px 0 0',
                  fontSize: '19px',
                  color: palette.muted,
                  fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
                }}
              >
                {status}
              </p>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}
