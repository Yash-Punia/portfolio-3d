'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect} from 'react'
import {DoubleSide} from 'three'

import {accept} from '@/components/console/actions'
import type {ButtonSlot, ConsoleContent} from '@/components/console/content'
import {useGlyphGeometry, type GlyphName} from '@/components/console/glyphs'
import {useInput} from '@/components/console/input'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the caps face along Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * SPEC §5's Nintendo diamond: X top, A right, B bottom, Y left. Offsets are in
 * units of `abxy.spacing`.
 */
const LAYOUT: Record<ButtonSlot, [number, number]> = {
  X: [0, 1],
  A: [1, 0],
  B: [0, -1],
  Y: [-1, 0],
}

const SLOTS = Object.keys(LAYOUT) as ButtonSlot[]

/**
 * What is printed on each cap.
 *
 * These four used to be the social links. They are now the console's own verbs,
 * which is what a handheld's face buttons are for: accept, back, and the two
 * sections worth a button of their own. The links moved to the info monitor on
 * the left flap, where a mark can be small and there is room for five.
 */
const GLYPH_FOR: Record<ButtonSlot, GlyphName> = {
  A: 'letterA',
  B: 'letterB',
  X: 'gamepad',
  Y: 'hourglass',
}

function FaceButton({
  slot,
  glyph,
  onPress,
}: {
  slot: ButtonSlot
  glyph: GlyphName
  onPress: () => void
}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()

  const pressed = useInput((state) => state.pressedSlot === slot)
  const focused = useInput((state) => state.focusedSlot === slot)
  const pressSlot = useInput((state) => state.pressSlot)

  const geometry = useGlyphGeometry(glyph, d.abxy.glyphSize)
  const [x, y] = LAYOUT[slot]

  const capZ = d.abxy.housingDepth + d.abxy.capHeight / 2
  const {z} = useSpring({
    z: pressed ? capZ - d.abxy.travel : capZ,
    config: {tension: 900, friction: 28},
    immediate: reducedMotion,
  })

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'pointer' : ''
  }

  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  return (
    <group position={[x * d.abxy.spacing, y * d.abxy.spacing, 0]}>
      <mesh position={[0, 0, d.abxy.housingDepth / 2]} rotation={FACING}>
        <cylinderGeometry
          args={[d.abxy.housingRadius, d.abxy.housingRadius, d.abxy.housingDepth, 40]}
        />
        {/* The rim flashes accent-coloured for the length of a press. */}
        <meshStandardMaterial
          {...m.bezel}
          emissive={m.accent.color}
          emissiveIntensity={pressed ? 0.85 : 0}
        />
      </mesh>

      {/* SPEC §11.4: a red ring in 3D is the focus indicator for these. */}
      {focused ? (
        <mesh position={[0, 0, d.abxy.housingDepth]}>
          <torusGeometry args={[d.abxy.ringRadius, d.abxy.ringTube, 10, 40]} />
          <meshStandardMaterial {...m.accent} emissive={m.accent.color} emissiveIntensity={0.6} />
        </mesh>
      ) : null}

      <animated.group position-z={z}>
        <mesh
          rotation={FACING}
          onClick={(event) => {
            event.stopPropagation()
            if (!isOpen) return
            pressSlot(slot)
            onPress()
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            if (isOpen) pressSlot(slot)
          }}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
        >
          <cylinderGeometry args={[d.abxy.capRadius, d.abxy.capRadius, d.abxy.capHeight, 40]} />
          <meshStandardMaterial {...m.button} />
        </mesh>

        <mesh
          geometry={geometry}
          position={[0, 0, d.abxy.capHeight / 2 + 0.002]}
          raycast={() => null}
        >
          <meshStandardMaterial {...m.bezel} side={DoubleSide} />
        </mesh>
      </animated.group>
    </group>
  )
}

/**
 * The ABXY cluster on the right flap (SPEC §4, §5), sitting at the joystick's
 * own height so the two hands are level.
 *
 * Every cap is bound, always: unlike the social links these stood for, a verb
 * cannot be missing from the dataset. A closed console still ignores them —
 * only `A` opens it, and it does that through `accept`.
 */
export function FaceButtons({content}: {content: ConsoleContent}) {
  const {dimensions: d} = useSpec()
  const back = useConsole((state) => state.back)
  const jump = useConsole((state) => state.jump)

  const press: Record<ButtonSlot, () => void> = {
    A: () => accept(content),
    B: back,
    X: () => jump('library'),
    Y: () => jump('timeline'),
  }

  return (
    <group position={[0, d.abxy.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      {SLOTS.map((slot) => (
        <FaceButton key={slot} slot={slot} glyph={GLYPH_FOR[slot]} onPress={press[slot]} />
      ))}
    </group>
  )
}
