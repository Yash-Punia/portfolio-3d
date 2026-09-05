'use client'

import {Html} from '@react-three/drei'
import {useState} from 'react'

import {isLocalHref, RESUME_FILENAME, type ConsoleContent} from '@/components/console/content'
import {htmlScale} from '@/components/console/htmlScale'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useScreenTheme} from '@/components/firmware/theme'

/**
 * The DOM is authored at this width in CSS pixels and then scaled to the
 * monitor's width in world units, so the type scale is a fixed ratio of the
 * panel rather than something to re-guess whenever the flap is retuned.
 */
const PANEL_PX = 420

/**
 * The small secondary display at the top of the left flap (SPEC §4). Self-lit,
 * so it reads as a powered instrument rather than a printed panel, and it shows
 * the name, title and status line whenever Sanity has them.
 *
 * It also carries the resume link, which used to be a physical cap below the
 * panel. The monitor is the one lit surface on this flap, so the words sit
 * where they can be read; the cap could only ever carry an arrow.
 *
 * The text is real DOM through drei's `<Html transform>` — the same mount SPEC
 * §7 locks for the firmware screen in Phase 4 — and is `aria-hidden`, because
 * the accessible copy of these strings is the server-rendered `.sr-only`
 * landmark on the page. Reading them twice is worse than reading them once, and
 * that landmark's anchor is also where keyboard visitors download from — which
 * is why the link below is a plain span rather than a focusable element buried
 * in a hidden subtree.
 */
export function InfoMonitor({
  href,
  settings,
}: {
  /** Where the resume lives, or null when there is nothing to download. */
  href: string | null
  settings: ConsoleContent['settings']
}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const {palette} = useScreenTheme()
  const [hovered, setHovered] = useState(false)

  const name = settings?.fullName
  const title = settings?.title
  const status = settings?.statusLine

  const download = () => {
    if (!href) return
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.rel = 'noopener noreferrer'
    // Cross-origin (Sanity) hrefs ignore `download`; those carry `?dl=` instead.
    if (isLocalHref(href)) anchor.download = RESUME_FILENAME
    anchor.click()
  }

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
        <meshBasicMaterial color={palette.bg} toneMapped={false} />
      </mesh>

      {/*
        Mounted only while the console is open: closed, this panel faces into
        the body, and DOM in 3D space has no depth test to hide it there.
      */}
      {isOpen && (name || title || status || href) ? (
        <Html
          aria-hidden
          center
          pointerEvents="none"
          position={[0, 0, d.monitor.depth + 0.002]}
          scale={htmlScale(d.monitor.width, PANEL_PX)}
          transform
        >
          <div
            style={{
              width: `${PANEL_PX}px`,
              padding: '34px 38px',
              boxSizing: 'border-box',
              color: palette.fg,
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
            {href ? (
              <p style={{margin: '26px 0 0', fontSize: '24px'}}>
                {/*
                  A span, not a button: the wrapper is aria-hidden, and a
                  focusable element inside that is a trap. `pointerEvents` is
                  re-enabled here alone, so the rest of the panel stays
                  click-through to the meshes behind it.
                */}
                <span
                  onClick={download}
                  onPointerOut={() => setHovered(false)}
                  onPointerOver={() => setHovered(true)}
                  style={{
                    color: hovered ? palette.accent : palette.fg,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    textUnderlineOffset: '4px',
                    textDecoration: 'underline',
                    transition: 'color 120ms ease',
                  }}
                >
                  Download Resume
                </span>
              </p>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}
