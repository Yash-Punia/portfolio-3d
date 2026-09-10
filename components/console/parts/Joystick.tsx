'use client'

import {animated, useSpring} from '@react-spring/three'
import {useThree} from '@react-three/fiber'
import {useEffect, useRef, useState} from 'react'

import {useSpec} from '@/components/console/spec'
import {useInput, type Direction} from '@/components/console/input'
import {isPortraitPhone} from '@/components/console/mobile'
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
 * key leans the stick, and pushing the stick emits what the arrow keys emit.
 * Both write to `useInput`, and the lean below is rendered from `held` — so
 * there is exactly one direction in the system, and the physical control always
 * shows it.
 *
 * They differ in one thing: a key repeats while it is down, a stick does not.
 * One push is one move, and a finger that stays pushed emits nothing further
 * until it lifts — `nudge` is what makes that true, and it also clears the lean
 * on a timer, so the stick cannot be left leaning by a `pointerup` that never
 * arrived.
 */
export function Joystick() {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  const held = useInput((state) => state.held)
  const nudge = useInput((state) => state.nudge)

  const [dragging, setDragging] = useState(false)
  const origin = useRef({x: 0, y: 0})
  /** One direction per push: set on the first crossing, cleared on the next. */
  const fired = useRef(false)

  const [leanX, leanY] = leanFor(held, d.joystick.maxTilt)
  const lean = useSpring({
    x: leanX,
    y: leanY,
    config: {tension: 320, friction: 22},
    immediate: reducedMotion,
  })

  /**
   * A push is read in screen pixels and quantised to four directions, with a
   * deadzone of 25% of the stick's radius (SPEC §5). One orthographic world
   * unit is `zoom` pixels, which is what converts the two.
   */
  useEffect(() => {
    if (!dragging) return

    const deadzone = d.joystick.capRadius * camera.zoom * d.joystick.deadzone

    function move(event: PointerEvent) {
      // The push has already been named. Everything until the finger lifts is
      // the same push, however far it travels.
      if (fired.current) return

      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y

      if (Math.hypot(dx, dy) < deadzone) return

      /*
        Turned onto a phone's long axis, the stick's own right points down the
        screen — so a drag has to be turned by the same quarter turn before it
        is named, or pushing the stick right would emit `down`. The lean needs
        no such correction: it is rendered in the console's own space, which the
        roll has already rotated.

        The same transform `inConsoleFrame` applies, and it must match `Console`'s
        roll. If one sign flips, all three do.
      */
      const turned = isPortraitPhone(size.width, size.height)
      const x = turned ? dy : dx
      const y = turned ? -dx : dy

      fired.current = true
      if (Math.abs(x) > Math.abs(y)) nudge(x > 0 ? 'right' : 'left')
      else nudge(y > 0 ? 'down' : 'up')
    }

    /*
      Four ways a finger can leave, because on a touch screen it does not
      always leave the way it came: `pointerup` is the ordinary one,
      `pointercancel` is the browser taking the gesture, `lostpointercapture`
      is the implicit capture being dropped, and a `blur` is the tab going
      away mid-push. The lean recentres on its own timer regardless — this only
      re-arms the next push.
    */
    function end() {
      setDragging(false)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('lostpointercapture', end)
    window.addEventListener('blur', end)

    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('lostpointercapture', end)
      window.removeEventListener('blur', end)
    }
  }, [dragging, camera, size, d.joystick.capRadius, d.joystick.deadzone, nudge])

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
            fired.current = false
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
