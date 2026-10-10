'use client'

import {Html} from '@react-three/drei'
import {useMemo} from 'react'

import {accept} from '@/components/console/actions'
import type {ConsoleContent} from '@/components/console/content'
import {htmlScale} from '@/components/console/htmlScale'
import {useConsole} from '@/components/console/store'
import {useT} from '@/components/console/tune'
import {DPad, RoundCap} from '@/components/handheld/controls'
import {roundedRect, slab} from '@/components/handheld/geometry'
import {Print} from '@/components/handheld/print'
import {HandheldScreen} from '@/components/screen/HandheldScreen'

/**
 * The upright handheld, in the desk console's dress: the same dark gradient
 * shell, a recessed black well round the glass, a green power light, the D-pad,
 * and A and B on the diagonal with their words under them.
 *
 * Positions are design px from the shell's top-left (the design's 390×844
 * frame), converted: one world unit is 100px, the origin is the shell's middle.
 * Every number is in the tune (`hh*`).
 */
const BEVEL = 0.05

export function Handheld({content}: {content: ConsoleContent}) {
  const t = useT()
  const back = useConsole((state) => state.back)
  const x = (px: number) => px / 100 - t.hhWidth / 2
  const y = (px: number) => t.hhHeight / 2 - px / 100

  const shell = useMemo(
    () =>
      slab(
        roundedRect(t.hhWidth - 2 * BEVEL, t.hhHeight - 2 * BEVEL, t.hhRadius - BEVEL),
        t.hhDepth - 2 * BEVEL,
        BEVEL,
        [t.hhShellTop, t.hhShellBottom],
      ),
    [t.hhWidth, t.hhHeight, t.hhDepth, t.hhRadius, t.hhShellTop, t.hhShellBottom],
  )
  const glassW = t.hhGlassWidth / 100
  const glassH = t.hhGlassHeight / 100
  const glassX = 0
  const glassY = y(t.hhGlassTop) - glassH / 2
  const well = useMemo(
    () =>
      roundedRect(glassW + 2 * t.hhBezel, glassH + 2 * t.hhBezel, t.hhWellRadius + t.hhBezel / 2),
    [glassW, glassH, t.hhBezel, t.hhWellRadius],
  )

  const label = {
    colour: t.hhLabelColor,
    size: t.hhLabelSize,
    spacing: t.hhLabelSpacing,
    gap: t.hhLabelGap,
  }
  const cap = {
    colour: t.hhCapColor,
    height: t.hhCapHeight,
    hitScale: t.hhHitScale,
    ink: t.hhCapInk,
    size: t.hhCapLetterSize,
  }

  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial roughness={0.78} vertexColors />
      </mesh>

      {/* The well: the glass's black edge, flush on the face. */}
      <mesh position={[glassX, glassY, 0.002]} raycast={() => null}>
        <shapeGeometry args={[well]} />
        <meshStandardMaterial color={t.hhWellColor} roughness={0.35} />
      </mesh>
      <Html
        center
        position={[glassX, glassY, 0.006]}
        scale={htmlScale(glassW, t.hhGlassWidth)}
        transform
        zIndexRange={[10, 0]}
      >
        <HandheldScreen content={content} />
      </Html>

      {/* The power light and the serial, in the band above the glass. */}
      <mesh position={[x(t.hhLedX), y(t.hhLedY), 0.004]} raycast={() => null}>
        <circleGeometry args={[0.03, 20]} />
        <meshStandardMaterial
          color={t.hhLedColor}
          emissive={t.hhLedColor}
          emissiveIntensity={1.4}
        />
      </mesh>
      <Print
        deps={[t.hhSerialColor, t.hhSerialSize, t.hhSerialSpacing]}
        draw={(ctx, font) => {
          ctx.fillStyle = t.hhSerialColor
          ctx.font = `500 ${t.hhSerialSize * font.px}px ${font.mono}`
          ctx.letterSpacing = `${t.hhSerialSpacing * font.px}px`
          ctx.fillText('YP·01', 0, 0)
        }}
        height={0.2}
        position={[0, y(t.hhSerialY), 0.002]}
        width={1}
      />

      <group position={[x(t.hhDpadX), y(t.hhDpadY), 0]}>
        <DPad
          arm={t.hhDpadArm}
          colour={t.hhDpadColor}
          depth={t.hhDpadDepth}
          dimple={t.hhDpadDimple}
          ink={t.hhDpadInk}
          span={t.hhDpadSpan}
        />
      </group>

      {/* B low, A high, on the diagonal; each named under its cap. */}
      <group position={[x(t.hhBX), y(t.hhBY), 0]}>
        <RoundCap
          {...cap}
          focus="B"
          label={{...label, text: 'Back'}}
          letter="B"
          onPress={back}
          radius={t.hhBRadius}
        />
      </group>
      <group position={[x(t.hhAX), y(t.hhAY), 0]}>
        <RoundCap
          {...cap}
          focus="A"
          label={{...label, text: 'Open'}}
          letter="A"
          onPress={() => accept(content)}
          radius={t.hhARadius}
          weight={600}
        />
      </group>

      {/* The speaker: six slots on the slant, low in the corner. */}
      {t.hhSpeakerOn ? (
        <group
          position={[x(t.hhSpeakerX), y(t.hhSpeakerY), 0.001]}
          rotation={[0, 0, (t.hhSpeakerAngle * Math.PI) / 180]}
        >
          {Array.from({length: 6}, (_, i) => (
            <mesh key={i} position={[(i - 2.5) * 0.11, 0, 0]} raycast={() => null}>
              <shapeGeometry args={[roundedRect(0.045, 0.4, 0.0225)]} />
              <meshStandardMaterial color={t.hhSpeakerColor} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  )
}
