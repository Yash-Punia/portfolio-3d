import {useEffect, useMemo} from 'react'
import {ExtrudeGeometry, Shape} from 'three'

/**
 * Panel geometry for the console shell.
 *
 * drei's `<RoundedBox>` rounds all twelve edges, which is wrong for the flaps:
 * their inner edges meet at the centre seam and must stay square, or the
 * "hairline seam" of SPEC §4 opens into a lens-shaped notch at top and bottom.
 * So panels are extruded from a `Shape` with per-corner radii instead, which
 * also gives us the frame-with-a-hole for the screen aperture for free.
 *
 * The bevel is not decoration — a hard 90 degree edge on a matte black surface
 * reads as a flat silhouette. The bevel catches the rim light and is what makes
 * the object look moulded.
 */

export type CornerRadii = number | {tl: number; tr: number; br: number; bl: number}

export interface PanelSpec {
  width: number
  height: number
  depth: number
  radius: CornerRadii
  /** Optional cut-out, centred. Produces a frame rather than a solid panel. */
  aperture?: {width: number; height: number; radius: number}
  bevel?: number
}

function radii(radius: CornerRadii) {
  return typeof radius === 'number' ? {tl: radius, tr: radius, br: radius, bl: radius} : radius
}

/** A centred rounded rectangle. A corner with radius 0 stays square. */
function roundedRect(width: number, height: number, radius: CornerRadii): Shape {
  const hw = width / 2
  const hh = height / 2
  const {tl, tr, br, bl} = radii(radius)
  const shape = new Shape()

  shape.moveTo(-hw + bl, -hh)
  shape.lineTo(hw - br, -hh)
  if (br > 0) shape.absarc(hw - br, -hh + br, br, -Math.PI / 2, 0, false)
  shape.lineTo(hw, hh - tr)
  if (tr > 0) shape.absarc(hw - tr, hh - tr, tr, 0, Math.PI / 2, false)
  shape.lineTo(-hw + tl, hh)
  if (tl > 0) shape.absarc(-hw + tl, hh - tl, tl, Math.PI / 2, Math.PI, false)
  shape.lineTo(-hw, -hh + bl)
  if (bl > 0) shape.absarc(-hw + bl, -hh + bl, bl, Math.PI, Math.PI * 1.5, false)
  shape.closePath()

  return shape
}

function panelGeometry(spec: PanelSpec): ExtrudeGeometry {
  const bevel = spec.bevel ?? 0.012
  const shape = roundedRect(spec.width, spec.height, spec.radius)

  if (spec.aperture) {
    shape.holes.push(roundedRect(spec.aperture.width, spec.aperture.height, spec.aperture.radius))
  }

  const geometry = new ExtrudeGeometry(shape, {
    // The bevel adds `bevel` at each end, so subtract it to honour `depth`.
    depth: Math.max(spec.depth - bevel * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  })
  // Extrusion runs from z=0 forward; recentre so the mesh position is its middle.
  geometry.center()

  return geometry
}

/** Memoised panel geometry, disposed on unmount (SPEC §12). */
export function usePanelGeometry(spec: PanelSpec): ExtrudeGeometry {
  const {width, height, depth, radius, aperture, bevel} = spec
  const geometry = useMemo(
    () => panelGeometry({width, height, depth, radius, aperture, bevel}),
    [width, height, depth, radius, aperture, bevel],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  return geometry
}
