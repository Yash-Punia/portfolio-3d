'use client'

import {animated, useSpring} from '@react-spring/three'
import {useThree} from '@react-three/fiber'
import {useEffect, useRef, useState} from 'react'

import {useSpec} from '@/components/console/spec'
import {useInput, type Direction} from '@/components/console/input'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; every part of the stick stands along Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * Which way the stick leans for a held direction. The stick points along +Z, so
 * a lean is a rotation about X (up/down) or about Y (left/right) — rotating
 * about X by a positive angle tips the tip toward -Y, which is why "up" is
 * negative.
 */
function leanFor(held: Direction | null, tilt: number): [number, number] {
  switch (held) {
    case 'up':
      return [-tilt, 0]
    case 'down':
      return [tilt, 0]
    case 'left':
      return [0, -tilt]
    case 'right':
      return [0, tilt]
    default:
      return [0, 0]
  }
}

/**
 * The joystick on the lower half of the left flap (SPEC §4, §5).
 *
 * The stick and the arrow keys are one input mirrored both ways: a held arrow
 * key leans the stick, and dragging the stick emits what the arrow keys emit.
 * Both write to `useInput`, which owns the 180ms repeat, and the lean below is
 * rendered from `held` — so there is exactly one direction in the system, and
 * the physical control always shows it.
 */
export function Joystick() {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const camera = useThree((state) => state.camera)

  const held = useInput((state) => state.held)
  const hold = useInput((state) => state.hold)

  const [dragging, setDragging] = useState(false)
  const origin = useRef({x: 0, y: 0})

  const [leanX, leanY] = leanFor(held, d.joystick.maxTilt)
  const lean = useSpring({
    x: leanX,
    y: leanY,
    config: {tension: 320, friction: 22},
    immediate: reducedMotion,
  })

  /**
   * A drag is read in screen pixels and quantised to four directions, with a
   * deadzone of 25% of the stick's radius (SPEC §5). One orthographic world
   * unit is `zoom` pixels, which is what converts the two.
   */
  useEffect(() => {
    if (!dragging) return

    const deadzone = d.joystick.capRadius * camera.zoom * d.joystick.deadzone

    function move(event: PointerEvent) {
      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y

      if (Math.hypot(dx, dy) < deadzone) {
        hold(null)
        return
      }

      if (Math.abs(dx) > Math.abs(dy)) hold(dx > 0 ? 'right' : 'left')
      else hold(dy > 0 ? 'down' : 'up')
    }

    function end() {
      setDragging(false)
      hold(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging, camera, d.joystick.capRadius, d.joystick.deadzone, hold])

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'grab' : ''
  }

  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  const pivotZ = d.joystick.wellDepth
  const stemZ = d.joystick.stemHeight / 2
  const capZ = d.joystick.stemHeight

  return (
    <group position={[0, d.joystick.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      {/* The well the stick stands in. */}
      <mesh position={[0, 0, d.joystick.wellDepth / 2]} rotation={FACING}>
        <cylinderGeometry
          args={[d.joystick.wellRadius, d.joystick.wellRadius, d.joystick.wellDepth, 40]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      {/* SPEC §4: the collar ring is one of the four permitted red accents.
          A torus already lies in the XY plane, so it needs no turning. */}
      <mesh position={[0, 0, d.joystick.wellDepth]}>
        <torusGeometry args={[d.joystick.collarRadius, d.joystick.collarHeight, 12, 48]} />
        <meshStandardMaterial {...m.accent} />
      </mesh>

      <animated.group position={[0, 0, pivotZ]} rotation-x={lean.x} rotation-y={lean.y}>
        <mesh position={[0, 0, stemZ]} rotation={FACING}>
          <cylinderGeometry
            args={[d.joystick.stemRadius, d.joystick.stemRadius * 1.1, d.joystick.stemHeight, 24]}
          />
          <meshStandardMaterial {...m.bezel} />
        </mesh>

        {/*
          A dome, not a disc. Under a locked front-on camera a flat cap shades
          exactly like the flat flap behind it and the stick disappears — the
          curve is what carries a gradient and reads as a thumbstick.
        */}
        <mesh
          position={[0, 0, capZ]}
          scale={[1, 1, d.joystick.capHeight / d.joystick.capRadius]}
          onPointerDown={(event) => {
            event.stopPropagation()
            if (!isOpen) return
            origin.current = {x: event.clientX, y: event.clientY}
            setDragging(true)
          }}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
        >
          <sphereGeometry args={[d.joystick.capRadius, 40, 24]} />
          <meshStandardMaterial {...m.shell} />
        </mesh>
      </animated.group>
    </group>
  )
}
