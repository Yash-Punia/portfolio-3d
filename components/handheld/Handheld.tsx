'use client'

import {Html} from '@react-three/drei'
import {useMemo} from 'react'

import {accept, menu} from '@/components/console/actions'
import {trailerOf, type ConsoleContent} from '@/components/console/content'
import {hasRows} from '@/components/console/device'
import {htmlScale} from '@/components/console/htmlScale'
import {useConsole} from '@/components/console/store'
import {C, GB, PANEL} from '@/components/console/tokens'
import {DPad, PillCap, RoundCap} from '@/components/handheld/controls'
import {roundedRect, slab} from '@/components/handheld/geometry'
import {Print} from '@/components/handheld/print'
import {HandheldScreen} from '@/components/screen/HandheldScreen'

/**
 * Design 4b, built in 3D, in the original Game Boy's colours: the warm grey
 * shell with one big rounded corner, the slate bezel with its magenta and navy
 * rules, a black D-pad, magenta B and A on the diagonal, and grey pills.
 *
 * The layout is the design's 390×844 frame. Positions are its px, converted:
 * one world unit is 100px, the origin is the middle of the shell.
 */
export const HANDHELD = {width: 3.9, height: 8.44, depth: 0.5}

const BEVEL = 0.05
const x = (px: number) => px / 100 - HANDHELD.width / 2
const y = (px: number) => HANDHELD.height / 2 - px / 100

/**
 * The bezel runs from 18px down to 554px: the design's 50px top margin less a
 * band for the rules and the power light, then 7px around the 344×490 glass.
 */
const BEZEL = {top: 18, bottom: 554, left: 16, right: 374}
const GLASS = {top: 57, left: 23}

/** What A does here, printed under it as the design prints it. */
function useALabel(content: ConsoleContent): string {
  const screen = useConsole((state) => state.screen)
  const index = useConsole((state) => state.gameIndex)
  if (hasRows(screen, 'handheld')) return 'Open'
  const project = content.projects[index]
  return project && trailerOf(project) ? 'Trailer' : 'Details'
}

export function Handheld({content}: {content: ConsoleContent}) {
  const back = useConsole((state) => state.back)
  const setScreen = useConsole((state) => state.setScreen)
  const aLabel = useALabel(content)

  const shell = useMemo(
    () =>
      slab(
        roundedRect(
          HANDHELD.width - 2 * BEVEL,
          HANDHELD.height - 2 * BEVEL,
          [0.16, 0.16, 0.9, 0.16],
        ),
        HANDHELD.depth - 2 * BEVEL,
        BEVEL,
        [GB.shell, GB.shellShade],
      ),
    [],
  )
  const bezelW = (BEZEL.right - BEZEL.left) / 100
  const bezelH = (BEZEL.bottom - BEZEL.top) / 100
  const bezel = useMemo(
    () => slab(roundedRect(bezelW - 0.02, bezelH - 0.02, [0.1, 0.1, 0.42, 0.1]), 0.02, 0.01),
    [bezelW, bezelH],
  )
  const glassW = PANEL.handheld.width / 100
  const glassH = PANEL.handheld.height / 100
  const glassX = x(GLASS.left) + glassW / 2
  const glassY = y(GLASS.top) - glassH / 2

  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial roughness={0.7} vertexColors />
      </mesh>

      <group position={[x(BEZEL.left) + bezelW / 2, y(BEZEL.top) - bezelH / 2, 0.03]}>
        <mesh geometry={bezel}>
          <meshStandardMaterial color={GB.bezel} roughness={0.55} />
        </mesh>
      </group>

      {/* The glass well: the screen's own black edge, inside the bezel. */}
      <mesh position={[glassX, glassY, 0.031]} raycast={() => null}>
        <shapeGeometry args={[roundedRect(glassW + 0.02, glassH + 0.02, 0.17)]} />
        <meshStandardMaterial color={C.well} roughness={0.3} />
      </mesh>
      <Html
        center
        position={[glassX, glassY, 0.034]}
        scale={htmlScale(glassW, PANEL.handheld.width)}
        transform
        zIndexRange={[10, 0]}
      >
        <HandheldScreen content={content} />
      </Html>

      {/* The bezel's band: two rules either side of a printed name, and the power light. */}
      <Print
        deps={[]}
        draw={(ctx, font) => {
          const u = font.px
          const half = 170 * u
          ctx.fillStyle = GB.stripeMagenta
          ctx.fillRect(-half, -10 * u, 100 * u, 2 * u)
          ctx.fillRect(half - 100 * u, -10 * u, 100 * u, 2 * u)
          ctx.fillStyle = GB.stripeNavy
          ctx.fillRect(-half, -5 * u, 100 * u, 2 * u)
          ctx.fillRect(half - 100 * u, -5 * u, 100 * u, 2 * u)
          ctx.fillStyle = GB.bezelPrint
          ctx.font = `500 ${7 * u}px ${font.mono}`
          ctx.letterSpacing = `${1.5 * u}px`
          ctx.fillText('YP·01 HANDHELD', 0, -7 * u)
          ctx.font = `500 ${6 * u}px ${font.mono}`
          ctx.letterSpacing = `${1 * u}px`
          ctx.textAlign = 'left'
          ctx.fillText('POWER', -156 * u, 10 * u)
        }}
        height={0.36}
        position={[0, y(36), 0.033]}
        width={3.5}
      />
      <mesh position={[x(30), y(46), 0.034]} raycast={() => null}>
        <circleGeometry args={[0.035, 20]} />
        <meshStandardMaterial color={GB.led} emissive={GB.led} emissiveIntensity={1.2} />
      </mesh>

      {/* The D-pad, 138px across. */}
      <group position={[x(93), y(664), 0]}>
        <DPad
          arm={0.46}
          colour={GB.dpad}
          depth={0.09}
          dimple="#1b1b1d"
          ink="#5a5a60"
          litInk={C.accentInk}
          span={1.38}
        />
      </group>

      {/* B low, A high, on the diagonal; each named under its cap. */}
      <group position={[x(259), y(674), 0]}>
        <RoundCap
          colour={GB.ab}
          focus="B"
          height={0.08}
          hitScale={1.2}
          ink="#e9c9d6"
          letter="B"
          onPress={back}
          radius={0.29}
          size={16}
        />
      </group>
      <group position={[x(334), y(642), 0]}>
        <RoundCap
          colour={GB.ab}
          focus="A"
          height={0.08}
          hitScale={1.2}
          ink="#f3dbe5"
          letter="A"
          onPress={() => accept(content, 'handheld')}
          radius={0.32}
          size={17}
          weight={600}
        />
      </group>
      <Print
        deps={[aLabel]}
        draw={(ctx, font) => {
          ctx.fillStyle = GB.print
          ctx.font = `500 ${11 * font.px}px ${font.ui}`
          ctx.fillText('Back', (259 - 296) * font.px, (716 - 700) * font.px)
          ctx.fillText(aLabel, (334 - 296) * font.px, (687 - 700) * font.px)
        }}
        height={0.6}
        position={[x(296), y(700), 0.002]}
        width={1.6}
      />

      {/* Menu and About: the handheld's two pills, where a Game Boy has Select and Start. */}
      <group position={[x(146), y(792), 0]}>
        <PillCap
          colour={GB.pill}
          depth={0.04}
          focus="menu"
          height={0.44}
          ink={GB.pillInk}
          label="Menu"
          onPress={() => menu('handheld')}
          width={0.84}
        />
      </group>
      <group position={[x(244), y(792), 0]}>
        <PillCap
          colour={GB.pill}
          depth={0.04}
          focus="about"
          height={0.44}
          ink={GB.pillInk}
          label="About"
          onPress={() => setScreen('about')}
          width={0.84}
        />
      </group>

      {/* The speaker, six slots cut on the slant in the big corner. */}
      <group position={[x(322), y(798), 0.001]} rotation={[0, 0, -0.52]}>
        {Array.from({length: 6}, (_, i) => (
          <mesh key={i} position={[(i - 2.5) * 0.13, 0, 0]} raycast={() => null}>
            <shapeGeometry args={[roundedRect(0.06, 0.52, 0.03)]} />
            <meshStandardMaterial color={GB.slot} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
