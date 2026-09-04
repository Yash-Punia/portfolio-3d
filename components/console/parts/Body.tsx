'use client'

import {BODY, BODY_FRONT_Z, FACE, SCREEN} from '@/components/console/dimensions'
import {usePanelGeometry, type PanelSpec} from '@/components/console/geometry'
import {BEZEL, SCREEN_GLASS, SHELL} from '@/components/console/materials'

const CORE: PanelSpec = {
  width: BODY.width,
  height: BODY.height,
  depth: BODY.depth,
  radius: BODY.radius,
}

/** The front frame, with the screen aperture cut out of it. */
const FRAME: PanelSpec = {
  width: BODY.width,
  height: BODY.height,
  depth: FACE.depth,
  radius: BODY.radius,
  aperture: {
    width: FACE.apertureWidth,
    height: FACE.apertureHeight,
    radius: FACE.apertureRadius,
  },
}

/** Bezel floor sits a hair proud of the core's front face to avoid z-fighting. */
const BEZEL_FLOOR_DEPTH = 0.02
const BEZEL_FLOOR_Z = BODY_FRONT_Z + 0.005 - BEZEL_FLOOR_DEPTH / 2
const SCREEN_Z = BODY_FRONT_Z + 0.007

/**
 * The base slab. Closed, none of this is visible — the flaps cover the whole
 * front face. It is built now because the flaps open onto it in Phase 2.
 */
export function Body() {
  const core = usePanelGeometry(CORE)
  const frame = usePanelGeometry(FRAME)

  return (
    <group>
      <mesh geometry={core}>
        <meshStandardMaterial {...SHELL} />
      </mesh>

      <mesh geometry={frame} position={[0, 0, BODY_FRONT_Z + FACE.depth / 2]}>
        <meshStandardMaterial {...SHELL} />
      </mesh>

      <mesh position={[0, 0, BEZEL_FLOOR_Z]}>
        <boxGeometry args={[FACE.apertureWidth, FACE.apertureHeight, BEZEL_FLOOR_DEPTH]} />
        <meshStandardMaterial {...BEZEL} />
      </mesh>

      <mesh position={[0, 0, SCREEN_Z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        <meshPhysicalMaterial {...SCREEN_GLASS} />
      </mesh>
    </group>
  )
}
