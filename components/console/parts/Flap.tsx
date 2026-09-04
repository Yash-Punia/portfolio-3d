'use client'

import {FLAP, FLAP_CLOSED_Z, HINGE_X, PANEL, SEAM} from '@/components/console/dimensions'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {ACCENT, SHELL} from '@/components/console/materials'

export type FlapSide = 'left' | 'right'

/**
 * Outer corners are rounded; the inner corners — the ones that meet at the
 * centre seam — stay square, so the closed seam is a true hairline.
 */
const OUTER: Record<FlapSide, PanelSpec> = {
  left: {
    width: FLAP.width,
    height: FLAP.height,
    depth: FLAP.depth,
    radius: {tl: FLAP.radius, bl: FLAP.radius, tr: 0, br: 0},
    bevel: 0.018,
  },
  right: {
    width: FLAP.width,
    height: FLAP.height,
    depth: FLAP.depth,
    radius: {tr: FLAP.radius, br: FLAP.radius, tl: 0, bl: 0},
    bevel: 0.018,
  },
}

/**
 * A raised border laid over the flap face, which reads as a shallow moulded
 * panel recessed into it. Its four inner edges are the only thing on an
 * otherwise coplanar face for the key light and the rim lightformer to catch.
 */
const MOULDING: Record<FlapSide, PanelSpec> = {
  left: {
    width: FLAP.width,
    height: FLAP.height,
    depth: PANEL.depth,
    radius: {tl: FLAP.radius, bl: FLAP.radius, tr: 0, br: 0},
    aperture: {
      width: FLAP.width - PANEL.margin * 2,
      height: FLAP.height - PANEL.margin * 2,
      radius: PANEL.radius,
    },
    bevel: 0.007,
  },
  right: {
    width: FLAP.width,
    height: FLAP.height,
    depth: PANEL.depth,
    radius: {tr: FLAP.radius, br: FLAP.radius, tl: 0, bl: 0},
    aperture: {
      width: FLAP.width - PANEL.margin * 2,
      height: FLAP.height - PANEL.margin * 2,
      radius: PANEL.radius,
    },
    bevel: 0.007,
  },
}

/** Distance from the flap's own centre to its inner (seam) edge. */
const HALF_WIDTH = FLAP.width / 2
const BAND_X = HALF_WIDTH - SEAM.bandWidth / 2
const BAND_HEIGHT = FLAP.height - FLAP.radius * 2
const BAND_Z = FLAP.depth / 2 + PANEL.depth + SEAM.bandDepth / 2 - 0.003

/**
 * One front door.
 *
 * The outer `<group>` is the hinge pivot, sitting on the flap's outer edge, so
 * Phase 2 only has to spring `rotation-y` on it. Rotation 0 is closed.
 */
export function Flap({side}: {side: FlapSide}) {
  const outer = usePanelGeometry(OUTER[side])
  const moulding = usePanelGeometry(MOULDING[side])
  const sign = side === 'left' ? 1 : -1

  return (
    <group position={[sign * -HINGE_X, 0, FLAP_CLOSED_Z]}>
      <group position={[sign * HALF_WIDTH, 0, 0]}>
        <mesh geometry={outer}>
          <meshStandardMaterial {...SHELL} />
        </mesh>

        <mesh geometry={moulding} position={[0, 0, (FLAP.depth + PANEL.depth) / 2]}>
          <meshStandardMaterial {...SHELL} />
        </mesh>

        {/* Painted red edge along the seam (SPEC §4). */}
        <mesh position={[sign * BAND_X, 0, BAND_Z]}>
          <boxGeometry args={[SEAM.bandWidth, BAND_HEIGHT, SEAM.bandDepth]} />
          <meshStandardMaterial {...ACCENT} />
        </mesh>
      </group>
    </group>
  )
}
