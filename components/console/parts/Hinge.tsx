'use client'

import {useSpec} from '@/components/console/spec'
import type {FlapSide} from '@/components/console/parts/Flap'

/**
 * The hinge post, sitting in the groove between the flap's outer edge and the
 * body rim. A cylinder in that channel is one of the few curved surfaces on the
 * closed console, so it carries a gradient the flat faces cannot.
 * The red collar is the hinge detail called for in SPEC §4.
 */
export function Hinge({side}: {side: FlapSide}) {
  const {dimensions: d, materials: m} = useSpec()
  const x = (side === 'left' ? -1 : 1) * d.hingePostX

  return (
    <group position={[x, 0, d.z.flapClosed + d.z.flapFront - d.hinge.radius]}>
      <mesh>
        <cylinderGeometry args={[d.hinge.radius, d.hinge.radius, d.hinge.length, 24]} />
        <meshStandardMaterial {...m.bezel} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[d.hinge.ringRadius, d.hinge.ringRadius, d.hinge.ringHeight, 24]} />
        <meshStandardMaterial {...m.accent} />
      </mesh>
    </group>
  )
}
