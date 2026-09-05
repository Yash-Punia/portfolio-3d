'use client'

import {animated, useSpring} from '@react-spring/three'
import {useThree} from '@react-three/fiber'
import {useEffect, useState} from 'react'

import {usePanelGeometry} from '@/components/console/geometry'
import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Cylinders are built around Y; the LED faces along Z. */
const FACING: [number, number, number] = [Math.PI / 2, 0, 0]
/** How far a drag has to travel before it counts as thrown (share of travel). */
const THROW = 0.25

/**
 * The DS-style power slider on the body's lower bezel (SPEC §4, §5). Left is
 * dark, right is light, and the LED beside the track is lit in dark mode.
 *
 * It flips the *screen* theme only: the chassis materials never change with it.
 * This phase the screen has no content, so what the toggle moves is the glass's
 * powered colour — SPEC §9's `#0A0F12` against its warm paper-white.
 */
export function PowerSlider() {
  const {dimensions: d, materials: m} = useSpec()
  const theme = useTheme()
  const setTheme = useConsole((state) => state.setTheme)
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const camera = useThree((state) => state.camera)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const nub = usePanelGeometry({
    width: d.slider.nubWidth,
    height: d.slider.nubHeight,
    depth: d.slider.nubDepth,
    radius: Math.min(d.slider.nubWidth, d.slider.nubHeight) * 0.3,
    bevel: 0.006,
  })

  const light = theme === 'light'
  const {x} = useSpring({
    x: (light ? 1 : -1) * (d.slider.travel / 2),
    // A detent, not a fade: short, firm, and over quickly (SPEC §5).
    config: {tension: 900, friction: 30},
    immediate: reducedMotion,
  })

  const face = d.z.faceFront
  const toggle = () => setTheme(light ? 'dark' : 'light')

  const hover = (on: boolean) => {
    document.body.style.cursor = on && isOpen ? 'pointer' : ''
  }

  useEffect(() => {
    if (isOpen) return
    document.body.style.cursor = ''
  }, [isOpen])

  /** A throw past a quarter of the travel sets the theme by its direction. */
  useEffect(() => {
    if (dragFrom === null) return

    // One orthographic world unit is `zoom` pixels, which is what turns a
    // fraction of the nub's travel into a pixel distance to beat.
    const threshold = d.slider.travel * camera.zoom * THROW

    function move(event: PointerEvent) {
      if (dragFrom === null) return
      if (Math.abs(event.clientX - dragFrom) < threshold) return
      const dx = event.clientX - dragFrom
      setTheme(dx > 0 ? 'light' : 'dark')
      setDragFrom(null)
    }

    function end() {
      setDragFrom(null)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [dragFrom, setTheme, camera, d.slider.travel])

  return (
    <group position={[0, d.slider.y, 0]}>
      {/* The recessed channel, with SPEC §4's red paint along the bottom. */}
      <mesh
        position={[0, 0, face - d.slider.depth / 2]}
        onClick={(event) => {
          event.stopPropagation()
          toggle()
        }}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <boxGeometry args={[d.slider.width, d.slider.height, d.slider.depth]} />
        <meshStandardMaterial {...m.bezel} />
      </mesh>
      <mesh position={[0, 0, face - d.slider.depth * 0.25]}>
        <boxGeometry args={[d.slider.width * 0.92, d.slider.height * 0.26, d.slider.depth * 0.5]} />
        <meshStandardMaterial {...m.accent} />
      </mesh>

      <animated.mesh
        geometry={nub}
        position-x={x}
        position-y={0}
        position-z={face + d.slider.nubDepth / 2 - 0.008}
        onClick={(event) => {
          event.stopPropagation()
          toggle()
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
          setDragFrom(event.clientX)
        }}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <meshStandardMaterial {...m.button} />
      </animated.mesh>

      {/* A tiny LED beside the track: lit in dark mode, dim in light. */}
      <mesh
        position={[d.slider.ledOffset, 0, face + d.slider.ledRadius / 2]}
        rotation={FACING}
        raycast={() => null}
      >
        <cylinderGeometry args={[d.slider.ledRadius, d.slider.ledRadius, d.slider.ledRadius, 20]} />
        <meshStandardMaterial
          {...m.accent}
          emissive={m.accent.color}
          emissiveIntensity={light ? 0.08 : 1.4}
        />
      </mesh>
    </group>
  )
}
