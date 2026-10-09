'use client'

import {useFrame} from '@react-three/fiber'
import {useEffect, useRef} from 'react'
import {DoubleSide, type Mesh, type MeshBasicMaterial} from 'three'

import {IDLE} from '@/components/console/lure'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useTuning} from '@/components/console/tuning'
import {useReducedMotion} from '@/components/console/useReducedMotion'

/** Seconds the ring takes to spread and fade, from the start of each period. */
const SPREAD = 0.6

/**
 * A ghost tap on the seam (`lure.ts`), off unless `rippleOn` is set in the
 * tuning panel: once the visitor has sat idle for `IDLE`
 * seconds, a ring spreads from the middle of the shut doors just before they
 * peek, as if something had tapped them. Gone for good once the console has
 * been opened — by then the visitor knows.
 */
export function Ripple() {
  const {dimensions: d, materials: m} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const ring = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const opened = useRef(false)
  const activeAt = useRef(0)

  useEffect(() => {
    if (isOpen) opened.current = true
  }, [isOpen])

  useEffect(() => {
    const touch = () => (activeAt.current = performance.now())
    touch()
    window.addEventListener('pointermove', touch)
    window.addEventListener('pointerdown', touch)
    window.addEventListener('keydown', touch)
    return () => {
      window.removeEventListener('pointermove', touch)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [])

  useFrame((state) => {
    const mesh = ring.current
    if (!mesh || !material.current) return

    const {rippleOn, peekPeriodS} = useTuning.getState().values
    const phase = (state.clock.elapsedTime % peekPeriodS) / SPREAD
    const idle = (performance.now() - activeAt.current) / 1000 > IDLE
    mesh.visible = rippleOn && !reducedMotion && !isOpen && !opened.current && idle && phase < 1
    if (!mesh.visible) return

    const eased = 1 - (1 - phase) ** 3
    mesh.scale.setScalar(0.2 + eased * d.flap.height * 0.3)
    material.current.opacity = 0.8 * (1 - phase)
  })

  return (
    <mesh
      ref={ring}
      // `flapFront` is in the flap's own frame; clear of the seam band too.
      position={[0, 0, d.z.flapClosed + d.z.flapFront + d.seam.bandDepth + 0.01]}
      // Never the target of the tap it is asking for.
      raycast={() => null}
      visible={false}
    >
      <ringGeometry args={[0.92, 1, 64]} />
      <meshBasicMaterial
        ref={material}
        color={m.accent.color}
        transparent
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
