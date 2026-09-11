'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect, useState} from 'react'
import {DoubleSide} from 'three'

import {useGlyphGeometry} from '@/components/console/glyphs'
import {useInput} from '@/components/console/input'

import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the cap's axis is Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/** How long a press reads as pressed, matching the face buttons' (SPEC §5). */
const PRESS_MS = 140

/**
 * The theme toggle at the top of the right flap (SPEC §5's power slider, moved
 * off the body's bezel and rebuilt as a button).
 *
 * It is a round cap the size of the ABXY ones, but black, carrying a moon on
 * one face and a sun on the other in the accent colour. Pressing it turns the
 * cap through half a revolution: the moon swings out to the left as the sun
 * comes round from the right, and back the other way. Whichever mark is facing
 * you is the mode in force — moon for dark, sun for light — so the control
 * needs no label and no separate lamp beside it.
 *
 * Like everything else on an inner face, the whole thing is turned through π so
 * that +X is the viewer's right and +Z is out of the flap toward them, the way
 * the ABXY cluster and the joystick are built.
 *
 * It flips the *screen* theme only: the chassis materials never change with it.
 */
export function ThemeToggle() {
  const {dimensions: d, materials: m} = useSpec()
  const theme = useTheme()
  const setTheme = useConsole((state) => state.setTheme)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const focused = useInput((state) => state.focusedSlot === 'theme')

  const moon = useGlyphGeometry('moon', d.toggle.glyphSize)
  // The sun's rays inflate its bounding box, and every glyph is normalised to
  // its longest side — so drawn at the same size it reads smaller than the
  // moon. This is an optical correction, not a different size.
  const sun = useGlyphGeometry('sun', d.toggle.glyphSize * 1.14)

  const light = theme === 'light'

  /*
    This is the one cap on the object that is black where every other one is
    off-white, so it is the one that does not announce itself as pressable by
    its colour alone. It gets what the face buttons have instead: the cap sinks
    under a finger and its mark goes dark, which is the object's own vocabulary
    for "this is a button" (SPEC §5).

    Local state rather than `input.ts`'s `pressedSlot` — that is keyed by ABXY
    slot, and this control has no slot and no keyboard twin to stay in step
    with.
  */
  const [pressed, setPressed] = useState(false)
  /** The cap is down while a finger is on it; `pressed` is the release flash. */
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!pressed) return
    const id = setTimeout(() => setPressed(false), PRESS_MS)
    return () => clearTimeout(id)
  }, [pressed])

  const {spin} = useSpring({
    // Negative, so the face on show leaves to the left rather than the right.
    spin: light ? -Math.PI : 0,
    // Smooth rather than snappy: this one turns over, it does not click across.
    config: {tension: 210, friction: 26},
    immediate: reducedMotion,
  })

  const restZ = d.toggle.housingDepth + d.toggle.capHeight / 2
  // The same travel and the same fast spring the face buttons depress on.
  const {capZ} = useSpring({
    capZ: pressed || held ? restZ - d.abxy.travel : restZ,
    config: {tension: 900, friction: 28},
    immediate: reducedMotion,
  })

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'pointer' : ''
  }

  // Closing under a stationary pointer fires no pointerout, so the cursor has
  // to be dropped when the flap carries the switch away.
  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  const faceZ = d.toggle.capHeight / 2 + 0.002

  /*
    The mark on both faces. Lit accent at rest — a glyph on a black cap needs it
    to stay legible — and dark green with the light off while a finger is on it,
    which is `heldTintColor` doing the same job on a mark that was
    already green.
  */
  const mark = {
    ...m.accent,
    color: held ? m.heldTint : m.accent.color,
    emissive: m.accent.color,
    emissiveIntensity: held ? 0 : 0.45,
    side: DoubleSide,
  }

  return (
    <group
      position={[0, d.toggle.y, d.faceZ]}
      rotation={[0, Math.PI, 0]}
      // One tap, one press. A tap raises a pointerdown *and* a click, so only
      // the release fires — pressing on both counted every tap twice and ran
      // two 140ms timers over each other.
      onClick={(event) => {
        event.stopPropagation()
        setHeld(false)
        if (!isOpen) return
        setPressed(true)
        setTheme(light ? 'dark' : 'light')
      }}
      // Swallowed so a press on the button cannot also drag the console round.
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
        SPEC §11.4, and the reason this control now has a keyboard path at all:
        the "Switch to the light screen" button in the page focuses here, and
        the ring says which cap it will press.
      */}
      {focused ? (
        <mesh position={[0, 0, d.toggle.housingDepth]}>
          <torusGeometry args={[d.toggle.capRadius * 1.72, d.abxy.ringTube, 10, 40]} />
          <meshStandardMaterial {...m.accent} emissive={m.accent.color} emissiveIntensity={0.6} />
        </mesh>
      ) : null}

      {/* The same recessed collar the other buttons sit in. */}
      <mesh position={[0, 0, d.toggle.housingDepth / 2]} rotation={FACING}>
        <cylinderGeometry
          args={[d.toggle.housingRadius, d.toggle.housingRadius, d.toggle.housingDepth, 40]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      <animated.group position-z={capZ} rotation-y={spin}>
        <mesh rotation={FACING}>
          <cylinderGeometry
            args={[d.toggle.capRadius, d.toggle.capRadius, d.toggle.capHeight, 40]}
          />
          {/* Black, not the off-white of the caps that open links. */}
          <meshStandardMaterial {...m.bezel} />
        </mesh>

        {/*
          The two marks, back to back. The far one is turned through π so it
          reads the right way round once the cap has carried it to the front —
          and a lit glyph is what keeps an accent mark legible on black.
        */}
        <mesh geometry={moon} position={[0, 0, faceZ]} raycast={() => null}>
          <meshStandardMaterial {...mark} />
        </mesh>

        <mesh
          geometry={sun}
          position={[0, 0, -faceZ]}
          rotation={[0, Math.PI, 0]}
          raycast={() => null}
        >
          <meshStandardMaterial {...mark} />
        </mesh>
      </animated.group>
    </group>
  )
}
