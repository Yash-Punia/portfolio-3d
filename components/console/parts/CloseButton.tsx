'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect, useState} from 'react'

import {CLOSE_BUTTON, FLAP} from '@/components/console/dimensions'
import {BEZEL, BUTTON} from '@/components/console/materials'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Inner surface of the flap; the button sits on it, facing the viewer. */
const SURFACE_Z = -FLAP.depth / 2
const HOUSING_Z = SURFACE_Z - CLOSE_BUTTON.housingDepth / 2
const CAP_Z = SURFACE_Z - CLOSE_BUTTON.housingDepth - CLOSE_BUTTON.capHeight / 2

/** Cylinders are built around Y; the button's axis is Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * The close button on the lower right flap (SPEC §4, §5). It is the only
 * physical control in Phase 2 — the rest of the flap furniture is Phase 3, and
 * the glyph arrives with them.
 */
export function CloseButton() {
  const close = useConsole((state) => state.close)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const [pressed, setPressed] = useState(false)

  const {z} = useSpring({
    z: pressed ? CAP_Z + CLOSE_BUTTON.travel : CAP_Z,
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
    <group position={[0, CLOSE_BUTTON.y, 0]}>
      <mesh position={[0, 0, HOUSING_Z]} rotation={FACING}>
        <cylinderGeometry
          args={[
            CLOSE_BUTTON.housingRadius,
            CLOSE_BUTTON.housingRadius,
            CLOSE_BUTTON.housingDepth,
            32,
          ]}
        />
        <meshStandardMaterial {...BEZEL} />
      </mesh>

      <animated.mesh
        position-x={0}
        position-y={0}
        position-z={z}
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
        onPointerOver={() => {
          hover(true)
        }}
        onPointerOut={() => {
          setPressed(false)
          hover(false)
        }}
      >
        <cylinderGeometry
          args={[CLOSE_BUTTON.capRadius, CLOSE_BUTTON.capRadius, CLOSE_BUTTON.capHeight, 32]}
        />
        <meshStandardMaterial {...BUTTON} />
      </animated.mesh>
    </group>
  )
}
