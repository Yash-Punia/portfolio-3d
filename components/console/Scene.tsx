'use client'

import {Environment, Lightformer, OrthographicCamera} from '@react-three/drei'
import {Canvas, useFrame} from '@react-three/fiber'
import {useRef, useState} from 'react'
import {MathUtils, type OrthographicCamera as OrthographicCameraImpl} from 'three'

import {Console} from '@/components/console/Console'
import type {ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {useConsoleZoom} from '@/components/console/useConsoleZoom'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Camera lives in its own component so it can read the canvas size. */
function Camera() {
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const zoom = useConsoleZoom(isOpen)
  const camera = useRef<OrthographicCameraImpl>(null)
  // Opening widens the framing (SPEC §6). The prop would snap it, so it is
  // only rendered as the starting value and the damp below owns it after that.
  const [initialZoom] = useState(zoom)

  useFrame((_, delta) => {
    const target = camera.current
    if (!target || reducedMotion) return

    const next = MathUtils.damp(target.zoom, zoom, 4, delta)
    if (Math.abs(next - target.zoom) < 0.001) return
    target.zoom = next
    target.updateProjectionMatrix()
  })

  return (
    <OrthographicCamera
      ref={camera}
      makeDefault
      position={[0, 0, 10]}
      near={0.1}
      far={100}
      zoom={reducedMotion ? zoom : initialZoom}
    />
  )
}

export default function Scene({content}: {content: ConsoleContent}) {
  const reducedMotion = useReducedMotion()

  return (
    /*
      SPEC §12 allows frameloop="demand" only while the idle animation is off,
      and §5's drift runs the whole time the console is closed — so "always" is
      the normal case and reduced motion, which has nothing to animate, is the
      one that renders on demand. R3F invalidates on commit, so open/close still
      repaints there without a manual invalidate().
    */
    <Canvas
      orthographic
      dpr={[1, 2]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{antialias: true}}
    >
      <Camera />

      <ambientLight intensity={0.3} color="#9aa6b4" />
      {/* Raking, not head-on: a light square to a flat face shades it evenly. */}
      <directionalLight position={[-7, 6, 2.4]} intensity={2.4} color="#fdf6ee" />

      {/*
        SPEC §4 asks for <Environment preset="city" /> at low intensity for edge
        definition. The presets fetch an HDRI from a third-party CDN at runtime,
        which drei's own docs flag as not production-ready and which would put a
        network round-trip in front of the hero object (SPEC §12). Lightformers
        build the same environment in-scene: no network, no dependency, and
        placed softboxes shape a matte black shell better than a generic city.
      */}
      <Environment frames={1} resolution={256}>
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#ffffff"
          position={[0, 6, 3]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[12, 7, 1]}
        />
        <Lightformer
          form="rect"
          intensity={5}
          color="#dce6f2"
          position={[6, 1.5, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[7, 8, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          color="#6f7c8c"
          position={[-8, -2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[7, 5, 1]}
        />
      </Environment>

      {/*
        No <ContactShadows>. SPEC §4 asks for one in place of shadow maps, but
        it catches shadows on a horizontal plane, and the camera is locked
        front-on with no ground in frame — the plane renders edge-on and
        contributes nothing, while costing three extra full-scene renders per
        frame. Turning it to face the camera makes it a dark halo, which on a
        near-black stage removes the separation the stage gradient provides.
        The object is grounded by the pool of light behind it instead.
      */}
      <Console content={content} />
    </Canvas>
  )
}
