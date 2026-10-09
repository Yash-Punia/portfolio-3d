'use client'

import {Html} from '@react-three/drei'
import {useMemo} from 'react'

import {accept, details, menu} from '@/components/console/actions'
import type {ConsoleContent} from '@/components/console/content'
import {htmlScale} from '@/components/console/htmlScale'
import {useConsole} from '@/components/console/store'
import {C, PANEL} from '@/components/console/tokens'
import {DPad, PillCap, RoundCap} from '@/components/handheld/controls'
import {roundedHole, roundedRect, slab} from '@/components/handheld/geometry'
import {Print} from '@/components/handheld/print'
import {DeskScreen} from '@/components/screen/DeskScreen'

/**
 * Design 4a, built in 3D: a wide, Switch-style slab with a recessed screen, a
 * D-pad and MENU on the left, ABXY on the right. One world unit is 100 of the
 * design's px, so every number here reads straight off the mock.
 */
export const DESK = {width: 12.4, height: 6.4, depth: 0.56}

const BEVEL = 0.06
/** The well the glass sits in: 852×570, 18px corners, 10px of black bezel inside. */
const WELL = {width: 8.52, height: 5.7, radius: 0.18, depth: 0.05}
/** The two control columns' centres: 22px of padding, then a 150px column. */
const COLUMN_X = 6.2 - 0.22 - 0.75
/** Where the Joy-Con would part from the tablet: the middle of the 22px gap. */
const SEAM_X = 6.2 - 0.22 - 1.5 - 0.02

/** ABXY in the Nintendo diamond, 46px apart (design: a 140px box of 48px caps). */
const DIAMOND = [
  ['Y', 0, 0.46],
  ['X', -0.46, 0],
  ['A', 0.46, 0],
  ['B', 0, -0.46],
] as const

export function Desk({content}: {content: ConsoleContent}) {
  const back = useConsole((state) => state.back)

  const shell = useMemo(() => {
    const outline = roundedRect(DESK.width - 2 * BEVEL, DESK.height - 2 * BEVEL, 0.72 - BEVEL)
    outline.holes.push(
      roundedHole(WELL.width + 2 * BEVEL, WELL.height + 2 * BEVEL, WELL.radius + BEVEL),
    )
    return slab(outline, DESK.depth - 2 * BEVEL, BEVEL, [C.shellTop, C.shellBottom])
  }, [])
  const well = useMemo(() => slab(roundedRect(WELL.width, WELL.height, WELL.radius), 0.04, 0), [])

  const press = {
    A: () => accept(content, 'desk'),
    B: back,
    X: () => menu('desk'),
    Y: () => details(content),
  }

  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial roughness={0.78} vertexColors />
      </mesh>

      {/* The glass's black bezel, at the bottom of the well. */}
      <mesh geometry={well} position={[0, 0, -WELL.depth]}>
        <meshStandardMaterial color={C.well} roughness={0.35} />
      </mesh>
      <Html
        center
        position={[0, 0, -WELL.depth + 0.004]}
        scale={htmlScale(PANEL.desk.width / 100, PANEL.desk.width)}
        transform
        zIndexRange={[10, 0]}
      >
        <DeskScreen content={content} />
      </Html>

      {/* The seams where the controllers meet the tablet: a line, not a part. */}
      {[-SEAM_X, SEAM_X].map((x) => (
        <mesh key={x} position={[x, 0, 0.001]} raycast={() => null}>
          <planeGeometry args={[0.012, DESK.height - 2 * BEVEL]} />
          <meshStandardMaterial color="#111110" roughness={0.9} />
        </mesh>
      ))}

      {/* The power LED, the one light on the shell. */}
      <mesh position={[-4.37, 2.57, 0.004]} raycast={() => null}>
        <circleGeometry args={[0.03, 20]} />
        <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={1.4} />
      </mesh>

      <Print
        deps={[]}
        draw={(ctx, font) => {
          ctx.fillStyle = C.serial
          ctx.font = `500 ${10 * font.px}px ${font.mono}`
          ctx.letterSpacing = `${3 * font.px}px`
          ctx.fillText('YP·01', 0, 0)
        }}
        height={0.2}
        position={[0, -3.04, 0.002]}
        width={1}
      />

      {/* Left column: the D-pad, and MENU under it. */}
      <group position={[-COLUMN_X, 0.49, 0]}>
        <DPad
          arm={0.48}
          colour={C.cap}
          depth={0.08}
          dimple={C.capCentre}
          ink={C.hint}
          litInk={C.accentInk}
          span={1.44}
        />
      </group>
      <group position={[-COLUMN_X, -0.9, 0]}>
        <PillCap
          colour={C.cap}
          depth={0.04}
          focus="menu"
          height={0.22}
          onPress={() => menu('desk')}
          width={0.64}
        />
      </group>
      <Print
        deps={[]}
        draw={(ctx, font) => {
          ctx.fillStyle = C.print
          ctx.font = `500 ${10 * font.px}px ${font.mono}`
          ctx.letterSpacing = `${1.4 * font.px}px`
          ctx.fillText('MENU', 0, 0)
        }}
        height={0.2}
        position={[-COLUMN_X, -1.16, 0.002]}
        width={0.9}
      />

      {/* Right column: ABXY, and their legends printed under them. */}
      <group position={[COLUMN_X, 0.55, 0]}>
        {DIAMOND.map(([slot, x, y]) => (
          <group key={slot} position={[x, y, 0]}>
            <RoundCap
              colour={slot === 'A' ? C.capLight : C.cap}
              focus={slot}
              height={0.07}
              ink={slot === 'A' ? C.capLightInk : slot === 'B' ? C.capInkStrong : C.capInk}
              letter={slot}
              onPress={press[slot]}
              radius={0.24}
              size={slot === 'A' ? 15 : 14}
              weight={slot === 'A' ? 600 : 500}
            />
          </group>
        ))}
      </group>
      <Print
        deps={[]}
        draw={(ctx, font) => {
          const rows: Array<[string, string, string]> = [
            ['A', 'Open', 'ENTER'],
            ['B', 'Back', 'ESC'],
            ['Y', 'Details', 'D'],
          ]
          ctx.textAlign = 'left'
          rows.forEach(([key, label, keyboard], i) => {
            const y = (i - 1) * 22 * font.px
            ctx.font = `400 ${11 * font.px}px ${font.ui}`
            ctx.fillStyle = C.printStrong
            ctx.fillText(key, -52 * font.px, y)
            ctx.fillStyle = C.print
            ctx.fillText(label, -40 * font.px, y)
            ctx.font = `400 ${10 * font.px}px ${font.mono}`
            ctx.fillText(keyboard, 18 * font.px, y)
          })
        }}
        height={0.7}
        position={[COLUMN_X, -0.95, 0.002]}
        width={1.3}
      />
    </group>
  )
}
