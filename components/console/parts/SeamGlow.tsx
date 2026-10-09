'use client'

import {useFrame} from '@react-three/fiber'
import {useRef, useState} from 'react'
import {AdditiveBlending, Color, MathUtils, type Mesh, type ShaderMaterial} from 'three'

import {ajarDeg} from '@/components/console/lure'
import {useSpec} from '@/components/console/spec'
import {useConsole} from '@/components/console/store'
import {useTuning} from '@/components/console/tuning'
import {useReducedMotion} from '@/components/console/useReducedMotion'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// A soft halo with a hot core across the strip, fading out at both ends.
const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  varying vec2 vUv;
  void main() {
    float x = (vUv.x - 0.5) * 2.0;
    float across = 0.6 * exp(-x * x * 8.0) + 0.4 * exp(-x * x * 90.0);
    float along = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    gl_FragColor = vec4(color * intensity * across * along, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Light from inside the console spilling out of the seam while the doors peek
 * (`lure.ts`). Its brightness and width follow how far the doors stand open, so
 * shut it is nothing and at the widest crack it is `peekGlow`.
 *
 * There is no bloom pass, so this is drawn over the doors rather than behind
 * them: additive, ignoring depth, the way a glare sits on top of what it lights.
 */
export function SeamGlow() {
  const {dimensions: d} = useSpec()
  const isOpen = useConsole((state) => state.isOpen)
  const reducedMotion = useReducedMotion()
  const mesh = useRef<Mesh>(null)
  const amount = useRef(0)
  const material = useRef<ShaderMaterial>(null)
  const [uniforms] = useState(() => ({color: {value: new Color()}, intensity: {value: 0}}))

  useFrame((state, delta) => {
    const glow = mesh.current
    if (!glow || !material.current) return

    const v = useTuning.getState().values
    const open =
      isOpen || reducedMotion || v.peekAngleDeg <= 0 ? 0 : ajarDeg(state.clock.elapsedTime, v)
    const target = Math.min(open / Math.max(v.peekAngleDeg, 0.001), 1)
    amount.current = MathUtils.damp(amount.current, target, 10, delta)

    glow.visible = amount.current > 0.002 && v.peekGlow > 0
    if (!glow.visible) return

    material.current.uniforms.color!.value.set(v.peekGlowColor)
    material.current.uniforms.intensity!.value = v.peekGlow * amount.current
    glow.scale.x = v.peekGlowWidth * (0.3 + 0.7 * amount.current)
  })

  return (
    <mesh
      ref={mesh}
      position={[0, 0, d.z.flapClosed + d.z.flapFront + d.seam.bandDepth + 0.01]}
      raycast={() => null}
      renderOrder={10}
      visible={false}
    >
      <planeGeometry args={[1, d.flap.height * 1.05]} />
      <shaderMaterial
        ref={material}
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        fragmentShader={fragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={vertexShader}
      />
    </mesh>
  )
}
