'use client'

import {useFrame} from '@react-three/fiber'
import {useRef} from 'react'
import {MathUtils, type Group} from 'three'

import {Body} from '@/components/console/parts/Body'
import {Flap} from '@/components/console/parts/Flap'
import {Hinge} from '@/components/console/parts/Hinge'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** SPEC §5: a slow ±1.5° yaw drift while the console is closed. */
const DRIFT_YAW = (1.5 * Math.PI) / 180
const DRIFT_SPEED = 0.45

/**
 * The console. The root group carries the idle drift, and is where Phase 3's
 * drag-to-rotate spring will go.
 */
export function Console() {
  const root = useRef<Group>(null)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  // Amplitude rather than angle, so opening eases the drift out instead of
  // snapping the object straight while the flaps are still swinging.
  const amplitude = useRef(1)

  useFrame((state, delta) => {
    const group = root.current
    if (!group || reducedMotion) return

    amplitude.current = MathUtils.damp(amplitude.current, isOpen ? 0 : 1, 3, delta)
    group.rotation.y =
      Math.sin(state.clock.elapsedTime * DRIFT_SPEED) * DRIFT_YAW * amplitude.current
  })

  return (
    <group ref={root}>
      <Body />
      <Hinge side="left" />
      <Hinge side="right" />
      <Flap side="left" />
      <Flap side="right" />
    </group>
  )
}
