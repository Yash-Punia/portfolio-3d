'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect, useState} from 'react'
import {DoubleSide} from 'three'

import {useGlyphGeometry} from '@/components/console/glyphs'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the button's axis is Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * The close button on the lower right flap (SPEC §4, §5).
 *
 * It sits on the flap's inner face, where "out of the surface" is -Z, so the
 * cap travels toward +Z when pressed and the glyph is turned through π to undo
 * the mirroring the open door applies to everything on that face.
 */
export function CloseButton() {
  const {dimensions: d, materials: m} = useSpec()
  const close = useConsole((state) => state.close)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const [pressed, setPressed] = useState(false)
  const glyph = useGlyphGeometry('close', d.closeButton.capRadius * 0.9)

  /** Inner surface of the flap; the button sits on it, facing the viewer. */
  const surfaceZ = -d.flap.depth / 2
  const housingZ = surfaceZ - d.closeButton.housingDepth / 2
  const capZ = surfaceZ - d.closeButton.housingDepth - d.closeButton.capHeight / 2

  const {z} = useSpring({
    z: pressed ? capZ + d.closeButton.travel : capZ,
    config: {tension: 700, friction: 26},
    immediate: reducedMotion,
  })

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'pointer' : ''
  }

  // Closing under a stationary pointer fires no pointerout, so the cursor has
  // to be dropped when the flap carries the button away.
  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  return (
    <group position={[0, d.closeButton.y, 0]}>
      <mesh position={[0, 0, housingZ]} rotation={FACING}>
        <cylinderGeometry
          args={[
            d.closeButton.housingRadius,
            d.closeButton.housingRadius,
            d.closeButton.housingDepth,
            32,
          ]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      <animated.group position-x={0} position-y={0} position-z={z}>
        <mesh
          rotation={FACING}
          onClick={(event) => {
            event.stopPropagation()
            if (isOpen) close()
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            setPressed(true)
          }}
          onPointerUp={() => setPressed(false)}
          onPointerOver={() => hover(true)}
          onPointerOut={() => {
            setPressed(false)
            hover(false)
          }}
        >
          <cylinderGeometry
            args={[d.closeButton.capRadius, d.closeButton.capRadius, d.closeButton.capHeight, 32]}
          />
          <meshStandardMaterial {...m.button} />
        </mesh>

        <mesh
          geometry={glyph}
          position={[0, 0, -d.closeButton.capHeight / 2 - 0.002]}
          rotation={[0, Math.PI, 0]}
          raycast={() => null}
        >
          <meshStandardMaterial {...m.bezel} side={DoubleSide} />
        </mesh>
      </animated.group>
    </group>
  )
}
