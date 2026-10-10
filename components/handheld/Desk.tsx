'use client'

import {Html} from '@react-three/drei'
import {useMemo} from 'react'

import {accept} from '@/components/console/actions'
import type {ConsoleContent} from '@/components/console/content'
import {htmlScale} from '@/components/console/htmlScale'
import {useConsole} from '@/components/console/store'
import {useT} from '@/components/console/tune'
import {DPad, RoundCap} from '@/components/handheld/controls'
import {roundedHole, roundedRect, slab} from '@/components/handheld/geometry'
import {Print} from '@/components/handheld/print'
import {DeskScreen} from '@/components/screen/DeskScreen'

/**
 * Design 4a, built in 3D: a wide, Switch-style slab with a recessed screen, a
 * D-pad on the left, and A and B on the right with their words printed under
 * them. One world unit is 100 of the design's px. Every number is in the tune
 * (`desk*`).
 */
const BEVEL = 0.06
const WELL_DEPTH = 0.05

export function Desk({content}: {content: ConsoleContent}) {
  const t = useT()
  const back = useConsole((state) => state.back)

  /** The well the glass sits in: the glass plus its black bezel. */
  const wellW = t.deskGlassWidth / 100 + 2 * t.deskBezel
  const wellH = t.deskGlassHeight / 100 + 2 * t.deskBezel

  const shell = useMemo(() => {
    const outline = roundedRect(
      t.deskWidth - 2 * BEVEL,
      t.deskHeight - 2 * BEVEL,
      t.deskRadius - BEVEL,
    )
    outline.holes.push(roundedHole(wellW + 2 * BEVEL, wellH + 2 * BEVEL, t.deskWellRadius + BEVEL))
    return slab(outline, t.deskDepth - 2 * BEVEL, BEVEL, [t.deskShellTop, t.deskShellBottom])
  }, [
    t.deskWidth,
    t.deskHeight,
    t.deskDepth,
    t.deskRadius,
    t.deskWellRadius,
    t.deskShellTop,
    t.deskShellBottom,
    wellW,
    wellH,
  ])
  const well = useMemo(
    () => slab(roundedRect(wellW, wellH, t.deskWellRadius), 0.04, 0),
    [wellW, wellH, t.deskWellRadius],
  )

  const label = {
    colour: t.deskLabelColor,
    size: t.deskLabelSize,
    spacing: t.deskLabelSpacing,
    gap: t.deskLabelGap,
  }
  const cap = {
    colour: t.deskCapColor,
    height: t.deskCapHeight,
    hitScale: t.deskHitScale,
    ink: t.deskCapInk,
    size: t.deskCapLetterSize,
  }

  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial roughness={0.78} vertexColors />
      </mesh>

      {/* The glass's black bezel, at the bottom of the well. */}
      <mesh geometry={well} position={[0, 0, -WELL_DEPTH]}>
        <meshStandardMaterial color={t.deskWellColor} roughness={0.35} />
      </mesh>
      <Html
        center
        position={[0, 0, -WELL_DEPTH + 0.004]}
        scale={htmlScale(t.deskGlassWidth / 100, t.deskGlassWidth)}
        transform
        zIndexRange={[10, 0]}
      >
        <DeskScreen content={content} />
      </Html>

      {/* The seams where the controllers meet the tablet: a line, not a part. */}
      {t.deskSeamOn
        ? [-t.deskSeamX, t.deskSeamX].map((x) => (
            <mesh key={x} position={[x, 0, 0.001]} raycast={() => null}>
              <planeGeometry args={[0.012, t.deskHeight - 2 * BEVEL]} />
              <meshStandardMaterial color={t.deskSeamColor} roughness={0.9} />
            </mesh>
          ))
        : null}

      {/* The power LED, the one light on the shell. */}
      <mesh position={[t.deskLedX, t.deskLedY, 0.004]} raycast={() => null}>
        <circleGeometry args={[0.03, 20]} />
        <meshStandardMaterial
          color={t.deskLedColor}
          emissive={t.deskLedColor}
          emissiveIntensity={1.4}
        />
      </mesh>

      <Print
        deps={[t.deskSerialColor, t.deskSerialSize, t.deskSerialSpacing]}
        draw={(ctx, font) => {
          ctx.fillStyle = t.deskSerialColor
          ctx.font = `500 ${t.deskSerialSize * font.px}px ${font.mono}`
          ctx.letterSpacing = `${t.deskSerialSpacing * font.px}px`
          ctx.fillText('YP·01', 0, 0)
        }}
        height={0.2}
        position={[0, t.deskSerialY, 0.002]}
        width={1}
      />

      <group position={[t.deskDpadX, t.deskDpadY, 0]}>
        <DPad
          arm={t.deskDpadArm}
          colour={t.deskDpadColor}
          depth={t.deskDpadDepth}
          dimple={t.deskDpadDimple}
          ink={t.deskDpadInk}
          span={t.deskDpadSpan}
        />
      </group>

      {/* A and B on the diagonal, B low, each named under its cap. */}
      <group position={[t.deskBX, t.deskBY, 0]}>
        <RoundCap
          {...cap}
          focus="B"
          label={{...label, text: 'Back'}}
          letter="B"
          onPress={back}
          radius={t.deskBRadius}
        />
      </group>
      <group position={[t.deskAX, t.deskAY, 0]}>
        <RoundCap
          {...cap}
          focus="A"
          label={{...label, text: 'Open'}}
          letter="A"
          onPress={() => accept(content)}
          radius={t.deskARadius}
          weight={600}
        />
      </group>
    </group>
  )
}
