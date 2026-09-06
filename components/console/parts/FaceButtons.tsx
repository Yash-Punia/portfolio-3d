'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect} from 'react'
import {DoubleSide} from 'three'

import {
  linkForSlot,
  openLink,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {useGlyphGeometry, type GlyphName} from '@/components/console/glyphs'
import {useInput} from '@/components/console/input'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the caps face along Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * SPEC §5's Nintendo diamond, which §3.1's slot table already assumes: X top,
 * A right, B bottom, Y left. Offsets are in units of `abxy.spacing`.
 */
const LAYOUT: Record<ButtonSlot, [number, number]> = {
  X: [0, 1],
  A: [1, 0],
  B: [0, -1],
  Y: [-1, 0],
}

const SLOTS = Object.keys(LAYOUT) as ButtonSlot[]

/** The mark on the cap is the platform's, so an unbound slot has no glyph. */
const GLYPH_FOR: Record<string, GlyphName> = {
  github: 'github',
  itch: 'itch',
  linkedin: 'linkedin',
  twitter: 'twitter',
}

function FaceButton({
  slot,
  url,
  glyph,
}: {
  slot: ButtonSlot
  url: string | null
  glyph: GlyphName | null
}) {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()

  const pressed = useInput((state) => state.pressedSlot === slot)
  const focused = useInput((state) => state.focusedSlot === slot)
  const pressSlot = useInput((state) => state.pressSlot)

  const geometry = useGlyphGeometry(glyph ?? 'close', d.abxy.glyphSize)
  const [x, y] = LAYOUT[slot]

  const capZ = d.abxy.housingDepth + d.abxy.capHeight / 2
  const {z} = useSpring({
    z: pressed ? capZ - d.abxy.travel : capZ,
    config: {tension: 900, friction: 28},
    immediate: reducedMotion,
  })

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen && url ? 'pointer' : ''
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
            if (!isOpen || !url) return
            pressSlot(slot)
            openLink(url)
          }}
          onPointerDown={(event) => {
            event.stopPropagation()
            if (isOpen && url) pressSlot(slot)
          }}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
        >
          <cylinderGeometry args={[d.abxy.capRadius, d.abxy.capRadius, d.abxy.capHeight, 40]} />
          <meshStandardMaterial {...m.button} />
        </mesh>

        {/*
          An unbound slot keeps its cap and loses its mark: a physical console
          does not lose a button because a document has not been published.
        */}
        {glyph ? (
          <mesh
            geometry={geometry}
            position={[0, 0, d.abxy.capHeight / 2 + 0.002]}
            raycast={() => null}
          >
            <meshStandardMaterial {...m.bezel} side={DoubleSide} />
          </mesh>
        ) : null}
      </animated.group>
    </group>
  )
}

/**
 * The ABXY cluster on the right flap (SPEC §4, §5). Each cap is bound to a
 * `socialLink` document through its `buttonSlot` field, so the mapping is
 * CMS-driven rather than hard-coded here.
 */
export function FaceButtons({socialLinks}: {socialLinks: ConsoleContent['socialLinks']}) {
  const {dimensions: d} = useSpec()

  return (
    <group position={[0, d.abxy.y, d.faceZ]} rotation={[0, Math.PI, 0]}>
      {SLOTS.map((slot) => {
        const link = linkForSlot(socialLinks, slot)
        const glyph = link?.platform ? (GLYPH_FOR[link.platform] ?? null) : null

        return <FaceButton key={slot} slot={slot} url={link?.url ?? null} glyph={glyph} />
      })}
    </group>
  )
}
