'use client'

import {FLAP_CLOSED_Z, FLAP_FRONT_Z, HINGE, HINGE_POST_X} from '@/components/console/dimensions'
import {ACCENT, BEZEL} from '@/components/console/materials'
import type {FlapSide} from '@/components/console/parts/Flap'

/**
 * The hinge post, sitting in the groove between the flap's outer edge and the
 * body rim. A cylinder in that channel is one of the few curved surfaces on the
 * closed console, so it carries a gradient the flat faces cannot.
 * The red collar is the hinge detail called for in SPEC §4.
 */
export function Hinge({side}: {side: FlapSide}) {
  const x = (side === 'left' ? -1 : 1) * HINGE_POST_X

  return (
    <group position={[x, 0, FLAP_CLOSED_Z + FLAP_FRONT_Z - HINGE.radius]}>
      <mesh>
        <cylinderGeometry args={[HINGE.radius, HINGE.radius, HINGE.length, 24]} />
        <meshStandardMaterial {...BEZEL} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[HINGE.ringRadius, HINGE.ringRadius, HINGE.ringHeight, 24]} />
        <meshStandardMaterial {...ACCENT} />
      </mesh>
    </group>
  )
}
