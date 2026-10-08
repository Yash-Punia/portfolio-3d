'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect, useState} from 'react'
import {DoubleSide} from 'three'

import {accept} from '@/components/console/actions'
import type {ButtonSlot, ConsoleContent} from '@/components/console/content'
import {useGlyphGeometry, type GlyphName} from '@/components/console/glyphs'
import {useInput, type FocusTarget} from '@/components/console/input'
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
  A: 'check',
  B: 'undo',
  X: 'gamepad',
  Y: 'hourglass',
}

/**
 * One round cap on a flap: the ABXY four, and the close cap at the top of the
 * right flap, which is the same button in black.
 *
 * `focus` names the cap for the focus ring its twin in the page lights, and for
 * the depression a keyboard press shows through `pressedSlot`.
 */
export function FaceButton({
  focus,
  glyph,
  onPress,
  dark = false,
}: {
  focus: FocusTarget
  glyph: GlyphName
  onPress: () => void
  /** A black cap with a lit mark, like the theme toggle beside the close cap. */
  dark?: boolean
}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()

  const pressed = useInput((state) => state.pressedSlot === focus)
  const focused = useInput((state) => state.focusedSlot === focus)

  const geometry = useGlyphGeometry(glyph, d.abxy.glyphSize)

  /*
    The cap is down while a finger is on it, and that is all pointerdown does.

    The press itself — the cue and the action — belongs to the release, because
    a tap raises both a pointerdown and a click and firing on each meant one tap
    counted twice: two `press` cues on top of each other, and the cap snapping
    down, up and down again as two 140ms timers overlapped.
  */
  const [held, setHeld] = useState(false)

  const capZ = d.abxy.housingDepth + d.abxy.capHeight / 2
  const {z} = useSpring({
    z: pressed || held ? capZ - d.abxy.travel : capZ,
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

  /*
    The mark is what says a finger is down: the cap's 0.018 of travel reads as
    nothing on a phone, and the glyph is the part of the cap a thumb is aimed
    at. Switched, not faded — a button is a contact. `heldTintColor` is the knob
    (Colours, console tab). A dark cap's mark is lit, the way the toggle's are,
    and goes dark with the same tint.
  */
  const mark = dark
    ? {
        ...m.accent,
        color: held ? m.heldTint : m.accent.color,
        emissive: m.accent.color,
        emissiveIntensity: held ? 0 : 0.45,
      }
    : {...m.bezel, color: held ? m.heldTint : m.bezel.color}

  return (
    /*
      The handlers sit on the cap's whole group, so the invisible hit disc below
      answers for it as well as the cap, its collar and its mark — R3F bubbles a
      child mesh's events up to here.
    */
    <group
      // One tap, one press: the click is the release, and it is the only thing
      // that fires. A finger slid off the cap lifts it and does nothing, which
      // is what a button under a thumb should do.
      onClick={(event) => {
        event.stopPropagation()
        setHeld(false)
        if (!isOpen) return
        onPress()
      }}
      // Swallowed so a press on the cap cannot also drag the console round.
      onPointerDown={(event) => {
        event.stopPropagation()
        if (isOpen) setHeld(true)
      }}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onPointerOver={() => hover(true)}
      onPointerOut={() => {
        setHeld(false)
        hover(false)
      }}
    >
      {/*
        The target a finger has to land on, wider than the cap by
        `buttonHitScale` (Hit areas, console tab). Invisible is not
        unraycastable: three tests every mesh it is handed, drawn or not. It
        does not ride the cap down, so the target does not move under a press.
      */}
      <mesh position={[0, 0, d.abxy.housingDepth / 2]} rotation={FACING} visible={false}>
        <cylinderGeometry
          args={[d.abxy.hitRadius, d.abxy.hitRadius, d.abxy.housingDepth + d.abxy.capHeight, 24]}
        />
      </mesh>

      <mesh position={[0, 0, d.abxy.housingDepth / 2]} rotation={FACING}>
        <cylinderGeometry
          args={[d.abxy.housingRadius, d.abxy.housingRadius, d.abxy.housingDepth, 40]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      {/* SPEC §11.4: a red ring in 3D is the focus indicator for these. */}
      {focused ? (
        <mesh position={[0, 0, d.abxy.housingDepth]}>
          <torusGeometry args={[d.abxy.ringRadius, d.abxy.ringTube, 10, 40]} />
          <meshStandardMaterial {...m.accent} emissive={m.accent.color} emissiveIntensity={0.6} />
        </mesh>
      ) : null}

      <animated.group position-z={z}>
        <mesh rotation={FACING}>
          <cylinderGeometry args={[d.abxy.capRadius, d.abxy.capRadius, d.abxy.capHeight, 40]} />
          <meshStandardMaterial {...(dark ? m.bezel : m.button)} />
        </mesh>

        <mesh
          geometry={geometry}
          position={[0, 0, d.abxy.capHeight / 2 + 0.002]}
          raycast={() => null}
        >
          <meshStandardMaterial {...mark} side={DoubleSide} />
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
  const pressSlot = useInput((state) => state.pressSlot)

  const press: Record<ButtonSlot, () => void> = {
    A: () => accept(content),
    B: back,
    X: () => jump('library'),
    Y: () => jump('timeline'),
  }

  return (
    <group position={[0, d.abxy.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      {SLOTS.map((slot) => {
        const [x, y] = LAYOUT[slot]
        return (
          <group key={slot} position={[x * d.abxy.spacing, y * d.abxy.spacing, 0]}>
            <FaceButton
              focus={slot}
              glyph={GLYPH_FOR[slot]}
              onPress={() => {
                pressSlot(slot)
                press[slot]()
              }}
            />
          </group>
        )
      })}
    </group>
  )
}
