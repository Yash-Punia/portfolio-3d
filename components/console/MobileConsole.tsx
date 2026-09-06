'use client'

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react'

import {
  isLocalHref,
  linkForSlot,
  openLink,
  RESUME_FILENAME,
  resumeHref,
  type ButtonSlot,
  type ConsoleContent,
} from '@/components/console/content'
import {
  GLYPH_BOX,
  GLYPH_FOR_PLATFORM,
  GLYPHS,
  type GlyphName,
} from '@/components/console/glyphPaths'
import {useInput, type Direction} from '@/components/console/input'
import {SCREEN_FILL} from '@/components/console/mobile'
import {useSpec} from '@/components/console/spec'
import {useConsole, useTheme} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {Firmware} from '@/components/firmware/Firmware'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * The viewport width in CSS pixels. The layer is sized from the same number the
 * camera frames the glass with, so a scale factor is needed — and a scale
 * factor cannot be a `calc()`, because CSS has no way to divide a length by a
 * length. Hence a real measurement rather than `92vw`.
 */
function useViewportWidth(): number {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener('resize', onChange)
    return () => window.removeEventListener('resize', onChange)
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth,
    // Never read on the server: the layer mounts only while the console is
    // open, and it is never open at hydration.
    () => 0,
  )
}

/**
 * SPEC §6 and §7's second mount: on a phone the firmware is a fixed DOM layer
 * rather than drei's `<Html transform>` on the screen mesh. Sharper text, native
 * hit-testing, no per-frame matrix — and the same `<Firmware />` tree, which is
 * what §7 means by one implementation and two mounts.
 *
 * The layer is glued to the glass, not to the viewport. `useConsoleZoom` frames
 * the screen at `SCREEN_FILL` of the viewport width and the box below is that
 * same rectangle, so the chassis and its bezel still surround it: on a phone the
 * console is still the object, not a web page that replaced it.
 *
 * The camera damps into that framing over roughly half a second, so the layer
 * fades in behind the boot rather than overhanging the glass on the way.
 */
export function MobileConsole({content}: {content: ConsoleContent}) {
  const {dimensions: d} = useSpec()
  const layout = useFirmwareLayout()
  const reducedMotion = useReducedMotion()
  const width = useViewportWidth()

  const glass = width * SCREEN_FILL

  return (
    <>
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          width: `${glass}px`,
          height: `${(glass * d.screen.height) / d.screen.width}px`,
          transform: 'translate(-50%, -50%)',
          overflow: 'hidden',
          /*
          Deliberately no `touch-action: none` here, unlike the canvas and the
          control overlay. The detail view is a real scrolling box, and
          `touch-action` is intersected down the ancestor chain — `none` on this
          layer would take a descendant's `pan-y` with it and leave the panel
          unscrollable by finger. Nothing else on the page scrolls (`body` is
          `overflow: hidden`), so there is nothing to suppress.
        */
          zIndex: 1,
          animation: reducedMotion ? undefined : 'firmware-fade 180ms ease-out 260ms both',
        }}
      >
        {/*
        The panel is authored at `panelWidth` and scaled onto the glass, exactly
        as the `<Html transform>` mount scales it onto the screen mesh. The
        mobile layout table is what keeps that scale near 1 — the desktop panel
        shrunk to this width would be unreadable.
      */}
        <div
          style={{transform: `scale(${glass / layout.panelWidth})`, transformOrigin: 'top left'}}
        >
          <Firmware content={content} />
        </div>
      </div>

      <Overlay content={content} />
    </>
  )
}

/**
 * A round cap in the overlay, the DOM counterpart of the off-white caps on the
 * flaps (SPEC §6: "same off-white caps, black glyphs, red press state — so the
 * language is continuous").
 *
 * The colours come from the same `useSpec().materials` the meshes read, so the
 * object and its overlay are dialled by one set of tuning values rather than
 * drifting apart. The press state uses the chassis accent rather than SPEC §6's
 * literal red: the accent has been a tuning value since Phase 1, and a control
 * that flashed a colour the object never uses would read as a different product
 * — the same reasoning `theme.ts` runs for the screen's selection colour.
 */
function Cap({
  ariaLabel,
  children,
  dark,
  onPress,
  onRelease,
  pressed,
  size,
  ...rest
}: {
  ariaLabel?: string
  children: ReactNode
  /** The theme toggle alone is black, matching its cap on the flap. */
  dark?: boolean
  onPress?: () => void
  onRelease?: () => void
  pressed?: boolean
  size: number
} & Pick<ComponentProps<'button'>, 'onClick'>) {
  const {materials: m} = useSpec()
  const [held, setHeld] = useState(false)
  const lit = pressed || held

  return (
    <button
      // Every control here has an accessible twin in the page's `.sr-only`
      // landmark except the two that carry a label: see `Overlay`.
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      onPointerCancel={() => {
        setHeld(false)
        onRelease?.()
      }}
      onPointerDown={() => {
        setHeld(true)
        onPress?.()
      }}
      onPointerLeave={() => {
        if (!held) return
        setHeld(false)
        onRelease?.()
      }}
      onPointerUp={() => {
        setHeld(false)
        onRelease?.()
      }}
      tabIndex={ariaLabel ? undefined : -1}
      type="button"
      {...rest}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        padding: 0,
        border: 'none',
        borderRadius: '50%',
        background: dark ? m.bezel.color : m.button.color,
        color: dark ? m.accent.color : m.bezel.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
        /*
          The collar the housing gives the physical cap, plus the rim flash the
          3D button lights when it is pressed.

          A dark cap takes a light collar rather than the bezel-on-bezel the
          object uses: on the console the toggle reads because it is lit and
          specular, and a flat black disc on a near-black stage would be a hole.
        */
        boxShadow: lit
          ? `0 0 0 3px ${m.accent.color}, 0 0 14px ${m.accent.color}66`
          : `0 0 0 3px ${dark ? `${m.button.color}59` : m.bezel.color}, 0 2px 6px rgba(0, 0, 0, 0.45)`,
        transform: lit ? 'translateY(1px) scale(0.96)' : 'none',
        transition: 'transform 90ms ease, box-shadow 90ms ease',
      }}
    >
      {children}
    </button>
  )
}

/** One mark, at the size the cap wants it. */
function Glyph({name, size}: {name: GlyphName; size: number}) {
  const box = GLYPH_BOX[name]

  return (
    <svg fill="currentColor" height={size} viewBox={`0 0 ${box} ${box}`} width={size}>
      <path d={GLYPHS[name]} />
    </svg>
  )
}

/** SPEC §6's minimum comfortable touch target, and the caps sized from it. */
const CAP = 52
const CLOSE_CAP = 48
const DPAD_ARM = 46
/** Centre-to-centre of the ABXY diamond. Below 46 the caps start to touch. */
const DIAMOND = 46

/**
 * The D-pad, bottom-left where the joystick sits on the left flap.
 *
 * Each arm writes the same held direction the arrow keys and the physical stick
 * write, so `useInput`'s 180ms repeat, the rail's subscription to it and the
 * one `move()` dispatcher all come along untouched — and the stick out of frame
 * leans with the finger.
 */
function DPad() {
  const {materials: m} = useSpec()
  const held = useInput((state) => state.held)

  const arm = (direction: Direction, glyph: string, column: number, row: number) => (
    <div style={{gridColumn: column, gridRow: row}}>
      <Cap
        onPress={() => useInput.getState().hold(direction)}
        onRelease={() => useInput.getState().hold(null)}
        pressed={held === direction}
        size={DPAD_ARM}
      >
        <span style={{fontSize: `${Math.round(DPAD_ARM * 0.32)}px`, lineHeight: 1}}>{glyph}</span>
      </Cap>
    </div>
  )

  return (
    <div
      style={{
        display: 'grid',
        gridTemplate: `repeat(3, ${DPAD_ARM}px) / repeat(3, ${DPAD_ARM}px)`,
        gap: '6px',
        color: m.bezel.color,
      }}
    >
      {/*
        U+FE0E on the sideways pair: without it Android and iOS render
        U+25C0/U+25B6 as blue emoji, while the up and down triangles stay text.
        A D-pad with two of its arms in a different colour is not a D-pad.
      */}
      {arm('up', '▲', 2, 1)}
      {arm('left', '◀︎', 1, 2)}
      {arm('right', '▶︎', 3, 2)}
      {arm('down', '▼', 2, 3)}
    </div>
  )
}

/**
 * ABXY in the diamond the right flap carries them in — X top, A right, B
 * bottom, Y left — bound to the same `socialLink` documents, firing the same
 * `openLink`, and depressing from the same `pressedSlot` as the physical caps.
 *
 * `onClick` rather than the pointer events the cap already handles: iOS only
 * lets `window.open` through inside a trusted gesture, and a click is one.
 */
function FaceButtons({content}: {content: ConsoleContent}) {
  const pressed = useInput((state) => state.pressedSlot)

  const cell = (slot: ButtonSlot, column: number, row: number) => {
    const link = linkForSlot(content.socialLinks, slot)
    const glyph = link?.platform ? (GLYPH_FOR_PLATFORM[link.platform] ?? null) : null

    return (
      <div style={{gridColumn: column, gridRow: row}}>
        <Cap
          onClick={() => {
            if (!link?.url) return
            useInput.getState().pressSlot(slot)
            openLink(link.url)
          }}
          pressed={pressed === slot}
          size={CAP}
        >
          {/*
            An unbound slot keeps its cap and loses its mark, exactly as the
            physical button does: a console does not lose a button because a
            document has not been published.
          */}
          {glyph ? <Glyph name={glyph} size={Math.round(CAP * 0.46)} /> : null}
        </Cap>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'grid',
        // Tighter than the caps are wide, so the four read as a diamond rather
        // than a grid — but wide enough that they do not touch.
        gridTemplate: `repeat(3, ${DIAMOND}px) / repeat(3, ${DIAMOND}px)`,
        placeItems: 'center',
      }}
    >
      {cell('X', 2, 1)}
      {cell('Y', 1, 2)}
      {cell('A', 3, 2)}
      {cell('B', 2, 3)}
    </div>
  )
}

/**
 * The flap furniture, unfolded around the glass (SPEC §6). Each control sits on
 * the side its physical counterpart is on: the info monitor's resume link and
 * the joystick are the left flap, the theme toggle, ABXY and the close button
 * the right one. SPEC §6 asks for ABXY and close both "bottom-right"; the flap
 * stacks them, so this does too.
 *
 * Everything here is `aria-hidden` and unfocusable except the close button and
 * the theme toggle. The page's `.sr-only` landmark already carries the four
 * social links and the CV as real anchors — that is the same reasoning the
 * firmware and the info monitor run on, and reading them twice is worse than
 * once. Those two have no twin anywhere and a touch screen-reader user has no
 * `Escape` key, so they are real buttons with labels, outside the hidden
 * containers rather than focusable elements buried inside one.
 */
function Overlay({content}: {content: ConsoleContent}) {
  const {materials: m} = useSpec()
  const close = useConsole((state) => state.close)
  const setTheme = useConsole((state) => state.setTheme)
  const theme = useTheme()

  const resume = resumeHref(content.settings)
  const next = theme === 'dark' ? 'light' : 'dark'

  const corner: CSSProperties = {position: 'absolute', display: 'flex', pointerEvents: 'none'}
  const inset = {
    top: 'max(14px, env(safe-area-inset-top))',
    bottom: 'max(14px, env(safe-area-inset-bottom))',
    left: 'max(14px, env(safe-area-inset-left))',
    right: 'max(14px, env(safe-area-inset-right))',
  }

  return (
    <div
      data-console-overlay
      style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, touchAction: 'none'}}
    >
      {/* The left flap's monitor carries the resume link; here it is an anchor. */}
      {resume ? (
        <div style={{...corner, top: inset.top, left: inset.left}}>
          <a
            aria-hidden
            download={isLocalHref(resume) ? RESUME_FILENAME : undefined}
            href={resume}
            rel="noopener noreferrer"
            tabIndex={-1}
            style={{
              pointerEvents: 'auto',
              padding: '10px 14px',
              borderRadius: '999px',
              background: m.button.color,
              color: m.bezel.color,
              boxShadow: `0 0 0 3px ${m.bezel.color}`,
              fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            CV
          </a>
        </div>
      ) : null}

      {/* The toggle sits at the top of the right flap. */}
      <div style={{...corner, top: inset.top, right: inset.right}}>
        <Cap
          ariaLabel={`Switch to the ${next} theme`}
          dark
          onClick={() => setTheme(next)}
          size={CAP}
        >
          {/*
            ponytail: a crossfade, not the half-revolution the physical cap
            turns through. A CSS card-flip is a dozen lines for a control the
            size of a fingertip; revisit in Phase 7 if it reads cheap.
          */}
          <Glyph name={theme === 'dark' ? 'moon' : 'sun'} size={Math.round(CAP * 0.44)} />
        </Cap>
      </div>

      <div style={{...corner, bottom: inset.bottom, left: inset.left}}>
        <DPad />
      </div>

      <div
        style={{
          ...corner,
          bottom: inset.bottom,
          right: inset.right,
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <FaceButtons content={content} />
        <Cap ariaLabel="Close the console" dark onClick={close} size={CLOSE_CAP}>
          <Glyph name="close" size={Math.round(CLOSE_CAP * 0.36)} />
        </Cap>
      </div>
    </div>
  )
}
