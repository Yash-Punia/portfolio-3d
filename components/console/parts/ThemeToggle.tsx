'use client'

import {animated, useSpring} from '@react-spring/three'
import {useEffect} from 'react'

import {usePanelGeometry} from '@/components/console/geometry'
import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders and spheres are built around Y; this face turns them toward Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]

/**
 * The theme toggle at the top of the right flap (SPEC §5's power slider, moved
 * off the body's bezel and rebuilt as a switch).
 *
 * A capsule housing with a lit channel and a knob that throws between two
 * detents: thrown right with the channel lit is dark mode, thrown left with it
 * all but out is light. That is the signal SPEC §5 asked a separate LED for,
 * folded into the control instead of sitting beside it.
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

  const housing = usePanelGeometry({
    width: d.toggle.width,
    height: d.toggle.height,
    depth: d.toggle.depth,
    // A radius of half the height is what makes the rectangle a capsule.
    radius: d.toggle.height / 2,
    bevel: 0.005,
  })

  const channel = usePanelGeometry({
    width: d.toggle.width - d.toggle.height * 0.34,
    height: d.toggle.height * 0.46,
    depth: d.toggle.channelDepth,
    radius: d.toggle.height * 0.26,
    bevel: 0.003,
  })

  const light = theme === 'light'

  const {x} = useSpring({
    // Dark is the switch thrown on, with the channel lit behind the knob —
    // the way a 'dark mode' switch reads anywhere else.
    x: (light ? -1 : 1) * (d.toggle.travel / 2),
    // A detent, not a fade: short, firm, and over quickly (SPEC §5).
    config: {tension: 900, friction: 30},
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

  const channelZ = d.toggle.depth + d.toggle.channelDepth / 2
  const knobZ = d.toggle.depth + d.toggle.knobHeight * 0.5

  return (
    <group
      position={[0, d.toggle.y, d.faceZ]}
      rotation={[0, Math.PI, 0]}
      onClick={(event) => {
        event.stopPropagation()
        if (isOpen) setTheme(light ? 'dark' : 'light')
      }}
      // Swallowed so a press on the switch cannot also drag the console round.
      onPointerDown={(event) => event.stopPropagation()}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      <mesh geometry={housing} position={[0, 0, d.toggle.depth / 2]}>
        <meshStandardMaterial {...m.bezel} />
      </mesh>

      {/* The lit channel the knob runs in: bright in dark mode, all but out in light. */}
      <mesh geometry={channel} position={[0, 0, channelZ]}>
        <meshStandardMaterial
          {...m.accent}
          emissive={m.accent.color}
          emissiveIntensity={light ? 0.05 : 0.85}
        />
      </mesh>

      {/*
        The knob is a flattened sphere rather than a disc: a flat cap under this
        scene's key light shades exactly like the housing behind it, and the
        curve is the whole of what reads as something you could push.
      */}
      <animated.mesh
        position-x={x}
        position-y={0}
        position-z={knobZ}
        rotation={FACING}
        scale={[1, 1, d.toggle.knobHeight / d.toggle.knobRadius]}
      >
        <sphereGeometry args={[d.toggle.knobRadius, 36, 22]} />
        <meshStandardMaterial {...m.button} />
      </animated.mesh>
    </group>
  )
}
