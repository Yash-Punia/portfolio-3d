'use client'

import {Html} from '@react-three/drei'
import {useState} from 'react'

import {
  isLocalHref,
  openLink,
  RESUME_FILENAME,
  RESUME_LABEL,
  type ConsoleContent,
} from '@/components/console/content'
import {GLYPHS, VIEWBOX, type GlyphName} from '@/components/console/glyphs'
import {htmlScale} from '@/components/console/htmlScale'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useScreenTheme, type ScreenPalette} from '@/components/firmware/theme'

/**
 * The DOM is authored at this width in CSS pixels and then scaled to the
 * monitor's width in world units, so the type scale is a fixed ratio of the
 * panel rather than something to re-guess whenever the flap is retuned.
 */
const PANEL_PX = 420

/** The icon row: the box, the mark inside it, and the gap between boxes. */
const ICON_BOX = 52
const ICON_MARK = 30
const ICON_GAP = 14

/** The mark on a link is the platform's, so an unknown one has no icon. */
const GLYPH_FOR: Record<string, GlyphName> = {
  github: 'github',
  itch: 'itch',
  linkedin: 'linkedin',
  twitter: 'twitter',
}

/**
 * One mark in the row. A span, not a button: the panel around it is
 * `aria-hidden`, and a focusable element inside one is a trap — `pointerEvents`
 * is re-enabled here alone, so the rest of the panel stays click-through to the
 * meshes behind it.
 */
function Icon({
  glyph,
  label,
  onActivate,
  palette,
  reducedMotion,
}: {
  glyph: GlyphName
  label: string
  onActivate: () => void
  palette: ScreenPalette
  reducedMotion: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const box = VIEWBOX[glyph]

  return (
    <span
      onClick={onActivate}
      onPointerOut={() => setHovered(false)}
      onPointerOver={() => setHovered(true)}
      title={label}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: `${ICON_BOX}px`,
        height: `${ICON_BOX}px`,
        borderRadius: '10px',
        border: `1px solid ${hovered ? palette.accent : palette.muted}`,
        color: hovered ? palette.accent : palette.fg,
        cursor: 'pointer',
        pointerEvents: 'auto',
        // Colour is not motion, but a visitor who has asked for none gets none
        // here either (SPEC §11.5).
        transition: reducedMotion ? 'none' : 'color 120ms ease, border-color 120ms ease',
      }}
    >
      <svg
        aria-hidden
        fill="currentColor"
        height={ICON_MARK}
        viewBox={`0 0 ${box} ${box}`}
        width={ICON_MARK}
      >
        <path d={GLYPHS[glyph]} />
      </svg>
    </span>
  )
}

/**
 * The small secondary display at the top of the left flap (SPEC §4). Self-lit,
 * so it reads as a powered instrument rather than a printed panel.
 *
 * It shows the name, title and status line, and under them the row of things
 * that leave the site: the social links, then the resume. Those links used to
 * be the four ABXY caps on the right flap — a cap carries one mark and the face
 * buttons were needed for the console's own verbs, so they moved here, where a
 * mark can be small and a fifth one costs nothing.
 *
 * The About copy that used to sit above the link is gone from the object. It is
 * still on the page — the `.sr-only` landmark and the `Person` schema both
 * render it — this panel is simply not what carries it any more.
 *
 * The text is real DOM through drei's `<Html transform>` and is `aria-hidden`,
 * because the accessible copy of every string here is that same landmark:
 * reading them twice is worse than reading them once, and nothing inside an
 * `aria-hidden` subtree may be focusable. Which is why every control below is a
 * span, and why the landmark's anchors are where a keyboard visitor follows
 * these links and downloads the CV from.
 */
export function InfoMonitor({
  href,
  settings,
  socialLinks,
}: {
  /** Where the resume lives, or null when there is nothing to download. */
  href: string | null
  settings: ConsoleContent['settings']
  socialLinks: ConsoleContent['socialLinks']
}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const {palette} = useScreenTheme()
  const reducedMotion = useReducedMotion()

  const name = settings?.fullName
  const title = settings?.title
  const status = settings?.statusLine

  // In the order the query returns them. A link with no URL, or with a platform
  // there is no mark for, is not an icon (SPEC §3.2).
  const links = socialLinks.flatMap((link) => {
    const glyph = link.platform ? GLYPH_FOR[link.platform] : undefined
    if (!link.url || !glyph) return []
    return [{id: link._id, glyph, label: link.label ?? link.platform ?? '', url: link.url}]
  })

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
      {isOpen && (name || title || status || links.length > 0 || href) ? (
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

            {links.length > 0 || href ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${ICON_GAP}px`,
                  margin: '34px 0 0',
                }}
              >
                {links.map((link) => (
                  <Icon
                    key={link.id}
                    glyph={link.glyph}
                    label={link.label}
                    onActivate={() => openLink(link.url)}
                    palette={palette}
                    reducedMotion={reducedMotion}
                  />
                ))}
                {href ? (
                  <Icon
                    glyph="download"
                    label={settings?.resumeLabel ?? RESUME_LABEL}
                    onActivate={download}
                    palette={palette}
                    reducedMotion={reducedMotion}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  )
}
