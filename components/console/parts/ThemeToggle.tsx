'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect} from 'react'
import {DoubleSide} from 'three'

import {useGlyphGeometry} from '@/components/console/glyphs'
import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the cap's axis is Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

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

  const moon = useGlyphGeometry('moon', d.toggle.glyphSize)
  // The sun's rays inflate its bounding box, and every glyph is normalised to
  // its longest side — so drawn at the same size it reads smaller than the
  // moon. This is an optical correction, not a different size.
  const sun = useGlyphGeometry('sun', d.toggle.glyphSize * 1.14)

  const light = theme === 'light'

  const {spin} = useSpring({
    // Negative, so the face on show leaves to the left rather than the right.
    spin: light ? -Math.PI : 0,
    // Smooth rather than snappy: this one turns over, it does not click across.
    config: {tension: 210, friction: 26},
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

  return (
    <group
      position={[0, d.toggle.y, d.faceZ]}
      rotation={[0, Math.PI, 0]}
      onClick={(event) => {
        event.stopPropagation()
        if (isOpen) setTheme(light ? 'dark' : 'light')
      }}
      // Swallowed so a press on the button cannot also drag the console round.
      onPointerDown={(event) => event.stopPropagation()}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      {/* The same recessed collar the other buttons sit in. */}
      <mesh position={[0, 0, d.toggle.housingDepth / 2]} rotation={FACING}>
        <cylinderGeometry
          args={[d.toggle.housingRadius, d.toggle.housingRadius, d.toggle.housingDepth, 40]}
        />
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      <animated.group position-z={d.toggle.housingDepth + d.toggle.capHeight / 2} rotation-y={spin}>
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
          <meshStandardMaterial
            {...m.accent}
            emissive={m.accent.color}
            emissiveIntensity={0.45}
            side={DoubleSide}
          />
        </mesh>

        <mesh
          geometry={sun}
          position={[0, 0, -faceZ]}
          rotation={[0, Math.PI, 0]}
          raycast={() => null}
        >
          <meshStandardMaterial
            {...m.accent}
            emissive={m.accent.color}
            emissiveIntensity={0.45}
            side={DoubleSide}
          />
        </mesh>
      </animated.group>
    </group>
  )
}
