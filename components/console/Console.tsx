'use client'

import {animated, useSpring} from '@react-spring/three'
import {useFrame} from '@react-three/fiber'
import {useEffect, useRef, useState} from 'react'
import {MathUtils, type Group} from 'three'

import type {ConsoleContent} from '@/components/console/content'
import {Body} from '@/components/console/parts/Body'
import {Flap} from '@/components/console/parts/Flap'
import {Hinge} from '@/components/console/parts/Hinge'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** SPEC §5: a slow ±1.5° yaw drift while the console is closed. */
const DRIFT_YAW = (1.5 * Math.PI) / 180
const DRIFT_SPEED = 0.45

/** SPEC §5's clamps. It is a display object, not a model viewer. */
const MAX_YAW = (22 * Math.PI) / 180
const MAX_PITCH = (14 * Math.PI) / 180
/** Pointer travel to rotation. A full yaw sweep takes about 110px of drag. */
const RAD_PER_PX = 0.0035

/**
 * The console.
 *
 * Two nested groups: the outer one carries the drag rotation, the inner one the
 * idle drift. Keeping them apart means neither has to know about the other —
 * the drift writes `rotation.y` every frame and the drag springs its own.
 */
export function Console({content}: {content: ConsoleContent}) {
  const drift = useRef<Group>(null)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  // Amplitude rather than angle, so opening eases the drift out instead of
  // snapping the object straight while the flaps are still swinging.
  const amplitude = useRef(1)

  const [dragging, setDragging] = useState(false)
  const from = useRef({x: 0, y: 0, yaw: 0, pitch: 0})

  const [pose, api] = useSpring(() => ({
    yaw: 0,
    pitch: 0,
    config: {tension: 120, friction: 18},
  }))

  useFrame((state, delta) => {
    const group = drift.current
    if (!group || reducedMotion) return

    amplitude.current = MathUtils.damp(amplitude.current, isOpen ? 0 : 1, 3, delta)
    group.rotation.y =
      Math.sin(state.clock.elapsedTime * DRIFT_SPEED) * DRIFT_YAW * amplitude.current
  })

  /**
   * Drag-to-rotate (SPEC §5). The listeners are on the window rather than the
   * canvas so that a drag which leaves the canvas — or ends outside it — still
   * finishes cleanly and springs back.
   */
  useEffect(() => {
    if (!dragging) return

    function move(event: PointerEvent) {
      const yaw = MathUtils.clamp(
        from.current.yaw + (event.clientX - from.current.x) * RAD_PER_PX,
        -MAX_YAW,
        MAX_YAW,
      )
      const pitch = MathUtils.clamp(
        from.current.pitch + (event.clientY - from.current.y) * RAD_PER_PX,
        -MAX_PITCH,
        MAX_PITCH,
      )

      // Stiffer than the release spring: the object follows the pointer, but
      // with enough lag to feel weighted.
      api.start({yaw, pitch, config: {tension: 280, friction: 34}, immediate: reducedMotion})
    }

    function end() {
      setDragging(false)
      // Gentle overshoot back to square (SPEC §5).
      api.start({yaw: 0, pitch: 0, config: {tension: 120, friction: 18}, immediate: reducedMotion})
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragging, api, reducedMotion])

  return (
    <animated.group
      rotation-x={pose.pitch}
      rotation-y={pose.yaw}
      /*
        Chassis meshes reach this by bubbling. The interactive ones — buttons,
        the joystick, the toggle, the screen — stop their pointerdown here
        (SPEC §5: a drag starting on those does not rotate the model). A closed
        flap deliberately does not: §5 wants a shaky tap on a door to still open
        it, which is the flap's own 6px threshold, not a veto on dragging.
      */
      onPointerDown={(event) => {
        from.current = {
          x: event.clientX,
          y: event.clientY,
          yaw: pose.yaw.get(),
          pitch: pose.pitch.get(),
        }
        setDragging(true)
      }}
    >
      <group ref={drift}>
        <Body content={content} />
        <Hinge side="left" />
        <Hinge side="right" />
        <Flap side="left" content={content} />
        <Flap side="right" content={content} />
      </group>
    </animated.group>
  )
}
