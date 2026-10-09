'use client'

import {animated, useSpring} from '@react-spring/three'
import type {ThreeEvent} from '@react-three/fiber'
import {useMemo, useState} from 'react'

import {useInput, type Direction, type FocusTarget} from '@/components/console/input'
import {C} from '@/components/console/tokens'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {cross, roundedRect, slab} from '@/components/handheld/geometry'
import {Print, type Fonts} from '@/components/handheld/print'

/** Cylinders are built around Y; the caps face along Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/** How far a cap goes down under a thumb. */
const TRAVEL = 0.035

/**
 * One tap, one press — the rule every control on both shells follows:
 *
 * - `pointerdown` only puts the cap down, and is swallowed so a press can never
 *   also start a drag-to-rotate on the shell behind it.
 * - The action fires on `click`, which is the release. A finger slid off the
 *   cap lifts it and does nothing.
 * - A key or a hidden twin in the page presses the same cap through
 *   `pressedSlot`, and lights its ring through `focusedSlot`.
 */
function usePress(focus: FocusTarget, onPress: () => void) {
  const [held, setHeld] = useState(false)
  const pressed = useInput((state) => state.pressedSlot === focus)
  const focused = useInput((state) => state.focusedSlot === focus)
  const pressSlot = useInput((state) => state.pressSlot)

  const handlers = {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      setHeld(false)
      pressSlot(focus)
      onPress()
    },
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      setHeld(true)
    },
    onPointerUp: () => setHeld(false),
    onPointerCancel: () => setHeld(false),
    onPointerOver: () => {
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      setHeld(false)
      document.body.style.cursor = ''
    },
  }

  return {handlers, down: held || pressed, focused}
}

/** The accent ring a focused twin lights round its cap. */
function FocusRing({radius, z}: {radius: number; z: number}) {
  return (
    <mesh position={[0, 0, z]} raycast={() => null}>
      <torusGeometry args={[radius, 0.018, 10, 48]} />
      <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={0.7} />
    </mesh>
  )
}

/**
 * A round face button with its letter printed on top: ABXY on the desk, A and
 * B on the handheld.
 */
export function RoundCap({
  focus,
  radius,
  height,
  colour,
  ink,
  letter,
  weight = 500,
  size,
  hitScale = 1.25,
  onPress,
}: {
  focus: FocusTarget
  radius: number
  height: number
  colour: string
  ink: string
  letter: string
  weight?: number
  /** The letter's size in design px. */
  size: number
  hitScale?: number
  onPress: () => void
}) {
  const reducedMotion = useReducedMotion()
  const {handlers, down, focused} = usePress(focus, onPress)
  const {z} = useSpring({
    z: down ? -TRAVEL : 0,
    config: {tension: 900, friction: 28},
    immediate: reducedMotion,
  })

  return (
    <group {...handlers}>
      {/* The target a thumb has to land on, wider than the cap. Invisible is
          not unraycastable: three tests every mesh it is handed. */}
      <mesh position={[0, 0, height / 2]} rotation={FACING} visible={false}>
        <cylinderGeometry args={[radius * hitScale, radius * hitScale, height, 20]} />
      </mesh>
      {focused ? <FocusRing radius={radius + 0.06} z={0.01} /> : null}
      <animated.group position-z={z}>
        <mesh position={[0, 0, height / 2]} rotation={FACING}>
          <cylinderGeometry args={[radius, radius * 1.03, height, 48]} />
          <meshStandardMaterial color={colour} roughness={0.55} />
        </mesh>
        <Print
          deps={[letter, ink, weight, size]}
          draw={(ctx, font) => {
            ctx.fillStyle = ink
            ctx.font = `${weight} ${size * font.px}px ${font.mono}`
            ctx.fillText(letter, 0, font.px)
          }}
          height={radius * 2}
          position={[0, 0, height + 0.002]}
          width={radius * 2}
        />
      </animated.group>
    </group>
  )
}

/** A pill-shaped key: the desk's MENU, the handheld's Menu and About. */
export function PillCap({
  focus,
  width,
  height,
  depth,
  colour,
  label,
  ink,
  size = 12.5,
  hitPad = 0.08,
  onPress,
}: {
  focus: FocusTarget
  width: number
  height: number
  depth: number
  colour: string
  /** Printed on the key itself, as the handheld's are. */
  label?: string
  ink?: string
  size?: number
  hitPad?: number
  onPress: () => void
}) {
  const reducedMotion = useReducedMotion()
  const {handlers, down, focused} = usePress(focus, onPress)
  const geometry = useMemo(
    () => slab(roundedRect(width - 0.02, height - 0.02, height / 2 - 0.01), depth, 0.01),
    [width, height, depth],
  )
  const {z} = useSpring({
    z: down ? depth - TRAVEL * 0.7 : depth,
    config: {tension: 900, friction: 28},
    immediate: reducedMotion,
  })

  return (
    <group {...handlers}>
      <mesh position={[0, 0, depth / 2]} visible={false}>
        <boxGeometry args={[width + hitPad * 2, height + hitPad * 2, depth]} />
      </mesh>
      {focused ? (
        <mesh position={[0, 0, 0.005]} raycast={() => null}>
          <shapeGeometry args={[roundedRect(width + 0.1, height + 0.1, height / 2 + 0.05)]} />
          <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={0.7} />
        </mesh>
      ) : null}
      <animated.group position-z={z}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={colour} roughness={0.6} />
        </mesh>
        {label && ink ? (
          <Print
            deps={[label, ink, size]}
            draw={(ctx, font) => {
              ctx.fillStyle = ink
              ctx.font = `500 ${size * font.px}px ${font.ui}`
              ctx.fillText(label, 0, font.px * 0.5)
            }}
            height={height}
            position={[0, 0, 0.003]}
            width={width}
          />
        ) : null}
      </animated.group>
    </group>
  )
}

const ARROWS: Array<[Direction, number]> = [
  ['up', 0],
  ['right', Math.PI / 2],
  ['down', Math.PI],
  ['left', -Math.PI / 2],
]

/** Where each arm's middle sits, as a unit vector. */
const OUT: Record<Direction, [number, number]> = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
}

/**
 * The D-pad: one cross that rocks toward the arm under the thumb, with that arm
 * lit in the accent the design uses for "selected".
 *
 * Each arm is its own invisible target, and a tap is one `nudge()` — one move,
 * however long the thumb stays down. The arrow keys hold it over the same
 * `held` direction, so the cross rocks under a keystroke too.
 */
export function DPad({
  span,
  arm,
  depth,
  colour,
  ink,
  litInk,
  dimple,
}: {
  span: number
  arm: number
  depth: number
  colour: string
  /** The arrows' colour, and their colour on the lit arm. */
  ink: string
  litInk: string
  dimple: string
}) {
  const reducedMotion = useReducedMotion()
  const held = useInput((state) => state.held)
  const nudge = useInput((state) => state.nudge)
  const geometry = useMemo(
    () => slab(cross(span - 0.02, arm - 0.02, 0.07), depth, 0.01),
    [span, arm, depth],
  )

  const tilt = 0.1
  const [x, y] = held ? OUT[held] : [0, 0]
  const lean = useSpring({
    rx: -y * tilt,
    ry: x * tilt,
    config: {tension: 420, friction: 24},
    immediate: reducedMotion,
  })

  /** The arrows, and the lit arm under the one that is held. */
  const draw = (ctx: CanvasRenderingContext2D, font: Fonts) => {
    const unit = 100 * font.px
    const a = arm * unit
    const reach = (span / 2) * unit
    if (held) {
      const [ox, oy] = OUT[held]
      const cx = ox * (a / 2 + (reach - a / 2) / 2)
      const cy = -oy * (a / 2 + (reach - a / 2) / 2)
      const w = ox ? reach - a / 2 : a
      const h = oy ? reach - a / 2 : a
      ctx.fillStyle = C.accent
      ctx.beginPath()
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 7 * font.px)
      ctx.fill()
    }
    for (const [direction, angle] of ARROWS) {
      const [ox, oy] = OUT[direction]
      const d = (a / 2 + reach) / 2
      ctx.save()
      ctx.translate(ox * d, -oy * d)
      ctx.rotate(angle)
      ctx.fillStyle = direction === held ? litInk : ink
      const s = 4.5 * font.px
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(s, s * 0.7)
      ctx.lineTo(-s, s * 0.7)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    // The dimple in the middle.
    ctx.fillStyle = dimple
    ctx.beginPath()
    ctx.arc(0, 0, 8 * font.px * (arm / 0.48), 0, Math.PI * 2)
    ctx.fill()
  }

  return (
    <group>
      {ARROWS.map(([direction]) => {
        const [ox, oy] = OUT[direction]
        const along = (span / 2 + arm / 2) / 2
        return (
          <mesh
            key={direction}
            onClick={(event) => {
              event.stopPropagation()
              nudge(direction)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerOut={() => {
              document.body.style.cursor = ''
            }}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer'
            }}
            position={[ox * along, oy * along, depth / 2]}
            visible={false}
          >
            <boxGeometry
              args={[
                ox ? span / 2 - arm / 2 + 0.12 : arm + 0.12,
                oy ? span / 2 - arm / 2 + 0.12 : arm + 0.12,
                depth,
              ]}
            />
          </mesh>
        )
      })}
      <animated.group position-z={depth * 0.4} rotation-x={lean.rx} rotation-y={lean.ry}>
        <mesh geometry={geometry} position={[0, 0, depth * 0.6]} raycast={() => null}>
          <meshStandardMaterial color={colour} roughness={0.6} />
        </mesh>
        <Print
          deps={[held, colour, ink]}
          draw={draw}
          height={span}
          position={[0, 0, depth * 0.6 + 0.002]}
          width={span}
        />
      </animated.group>
    </group>
  )
}
