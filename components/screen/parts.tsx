'use client'

import {useEffect, useRef, type CSSProperties, type ReactNode} from 'react'

import {openGame} from '@/components/console/actions'
import {
  descriptionParagraphs,
  downloadResume,
  entryYears,
  openLink,
  profileLinks,
  projectFacts,
  resumeHref,
  trailerOf,
  type ConsoleContent,
  type ProfileLink,
  type Project,
} from '@/components/console/content'
import {SCREEN_LABELS} from '@/components/console/device'
import {useConsole, type Screen} from '@/components/console/store'
import {FONT} from '@/components/console/tokens'
import {useT, usePalette, type Palette} from '@/components/console/tune'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {Cover} from '@/components/screen/media'

/**
 * The pieces both screens are built from. Every size is the design's own px,
 * passed in by the screen that knows which device it is on — the desk and the
 * handheld draw the same parts at different sizes, never a scaled copy. Colours
 * come from the tune's screen palette (`usePalette`).
 *
 * Everything here is inside the screen's `aria-hidden` tree, so nothing is a
 * `<button>` or an `<a>`: a focusable element inside `aria-hidden` is a trap.
 * The page's hidden landmark and `ConsoleControls` are the accessible copies.
 *
 * Motion is CSS (`app/globals.css`, the `scr-*` classes), driven by custom
 * properties `Glass` sets from the tune.
 */

export const row: CSSProperties = {display: 'flex', alignItems: 'center'}

/** A stagger slot for a `.scr-in` child: the nth to arrive. */
export function stagger(i: number): CSSProperties {
  return {'--i': i} as CSSProperties
}

/** A tap target. One tap, one action: it fires on the click, which is the release. */
export function Tap({
  onTap,
  style,
  className,
  dataRow,
  selected,
  children,
}: {
  onTap: () => void
  style?: CSSProperties
  /** A `scr-*` hover treatment. */
  className?: string
  /** Marks a row the D-pad walks, so it can be kept in view. */
  dataRow?: number
  selected?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={className}
      data-row={dataRow}
      data-selected={selected ? '' : undefined}
      onClick={(event) => {
        event.stopPropagation()
        onTap()
      }}
      style={{cursor: 'pointer', ...style}}
    >
      {children}
    </div>
  )
}

/** The little A disc the design sets over the trailer. */
export function ABadge({
  size,
  fontSize,
  light = false,
}: {
  size: number
  fontSize: number
  light?: boolean
}) {
  const C = usePalette()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: light ? C.ink : C.screen,
        color: light ? C.screen : C.ink,
        ...row,
        justifyContent: 'center',
        font: `500 ${fontSize}px ${FONT.mono}`,
      }}
    >
      A
    </div>
  )
}

export type PillKind = 'primary' | 'ghost' | 'outline'

function pillStyle(kind: PillKind, C: Palette): CSSProperties {
  if (kind === 'primary') return {background: C.ink, color: C.screen, fontWeight: 600}
  if (kind === 'ghost') return {background: `rgba(${C.inkRgb},.12)`}
  return {border: `1px solid ${C.outline}`, background: C.screen}
}

export function Pill({
  kind,
  height,
  fontSize,
  padding = '0 16px',
  onTap,
  style,
  children,
}: {
  kind: PillKind
  height: number
  fontSize: number
  padding?: string
  onTap: () => void
  style?: CSSProperties
  children: ReactNode
}) {
  const C = usePalette()
  return (
    <Tap
      className="scr-tap"
      onTap={onTap}
      style={{
        height,
        padding,
        borderRadius: height / 2,
        boxSizing: 'border-box',
        ...row,
        justifyContent: 'center',
        gap: 9,
        fontSize,
        whiteSpace: 'nowrap',
        ...pillStyle(kind, C),
        ...style,
      }}
    >
      {children}
    </Tap>
  )
}

/** "Résumé ↓" on About, where the page's own résumé link used to be. Collapses without one. */
export function ResumePill({
  settings,
  height,
  fontSize,
}: {
  settings: ConsoleContent['settings']
  height: number
  fontSize: number
}) {
  if (!resumeHref(settings)) return null
  return (
    <Pill
      fontSize={fontSize}
      height={height}
      kind="outline"
      onTap={() => downloadResume(settings)}
      style={{alignSelf: 'flex-start'}}
    >
      Résumé ↓
    </Pill>
  )
}

/** The tab strip: the current tab is the light pill, the rest plain text. */
export function Tabs({
  screens,
  height,
  fontSize,
  idle,
  activePadding,
  idlePadding,
}: {
  screens: Screen[]
  height: number
  fontSize: number
  /** The colour of a tab that is not showing. */
  idle: string
  activePadding: string
  idlePadding: string
}) {
  const C = usePalette()
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const setScreen = useConsole((state) => state.setScreen)

  return (
    <div style={{...row, gap: 2, fontSize}}>
      {screens.map((tab) => {
        const active = tab === screen && !isProjectOpen
        return (
          <Tap
            className={active ? undefined : 'scr-tab'}
            key={tab}
            onTap={() => setScreen(tab)}
            style={{
              height,
              padding: active ? activePadding : idlePadding,
              borderRadius: height / 2,
              ...row,
              ...(active
                ? {background: `rgba(${C.inkRgb},.92)`, color: C.screen, fontWeight: 600}
                : {color: idle}),
            }}
          >
            {SCREEN_LABELS[tab]}
          </Tap>
        )
      })}
    </div>
  )
}

/** The strip along the bottom of the glass that says what the buttons do here. */
export function Hints({
  items,
  height,
  fontSize,
  gap,
  tail,
}: {
  items: Array<[string, string]>
  height: number
  fontSize: number
  gap: number
  /** The quiet last word — "or click anything". */
  tail?: string
}) {
  const C = usePalette()
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        ...row,
        justifyContent: 'center',
        gap,
        fontSize,
        color: C.hint,
        borderTop: `1px solid ${C.ruleSoft}`,
        background: C.footer,
        whiteSpace: 'nowrap',
        zIndex: 3,
      }}
    >
      {items.map(([key, label]) => (
        <div key={key + label}>
          <span style={{color: C.soft}}>{key}</span> {label}
        </div>
      ))}
      {tail ? <div style={{color: C.dim}}>{tail}</div> : null}
    </div>
  )
}

export interface ShelfSize {
  width: number
  height: number
  /** The selected tile grows on the desk; on the handheld every tile is one size. */
  selectedWidth: number
  selectedHeight: number
  gap: number
  labelSize: number
  labelGap: number
  outlineOffset: number
}

/**
 * The row of games along the bottom of the home screen.
 *
 * The D-pad and the arrow keys move the selection, and the row scrolls to keep
 * it in view. A finger swipes it natively — the panel is no longer turned on a
 * phone, so the browser's own horizontal pan is the right one. A tap on a tile
 * selects it; a tap on the selected one opens it (`openGame`), trailer first.
 *
 * With `follow` (the handheld), the first slot *is* the selection: the row
 * snaps tile by tile, a swipe selects whichever tile lands in the first slot as
 * it arrives, and the one before slides off to the left. A selection made any
 * other way — the D-pad, a tap — scrolls its tile into that slot. Every tile
 * shares one size there, which is what makes the slot a fixed step.
 */
export function Shelf({
  projects,
  size,
  follow = false,
}: {
  projects: Project[]
  size: ShelfSize
  follow?: boolean
}) {
  const C = usePalette()
  const index = useConsole((state) => state.gameIndex)
  const setGameIndex = useConsole((state) => state.setGameIndex)
  const reducedMotion = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  /** Where a scroll this component started is headed; a swipe's scroll events are ignored until it lands. */
  const steering = useRef<number | null>(null)
  /** The selection a swipe just made: the finger and the browser's snap own that scroll, so it is not chased. */
  const swiped = useRef<number | null>(null)
  const pad = size.outlineOffset + 3
  const step = size.width + size.gap

  /*
    Scrolled by hand rather than with `scrollIntoView`, which would also scroll
    every ancestor it can — and `body`, though `overflow: hidden`, is one.
  */
  useEffect(() => {
    if (swiped.current === index) {
      swiped.current = null
      return
    }
    const el = box.current
    const tile = el?.children[index]
    if (!el || !(tile instanceof HTMLElement)) return
    const left = tile.offsetLeft - pad
    const right = tile.offsetLeft + size.selectedWidth + pad - el.clientWidth
    const target = follow ? left : Math.min(Math.max(el.scrollLeft, right), left)
    if (Math.abs(target - el.scrollLeft) < 1) return
    el.scrollTo({left: target, behavior: reducedMotion ? 'auto' : 'smooth'})
    if (!follow) return
    steering.current = target
    // If the scroll never quite lands (clamped, interrupted), swipes still take over.
    const release = setTimeout(() => {
      steering.current = null
    }, 900)
    return () => clearTimeout(release)
  }, [index, pad, size.selectedWidth, reducedMotion, follow])

  /** A swipe: whichever tile is nearest the first slot is the selection. */
  function onScroll() {
    const el = box.current
    if (!follow || !el) return
    if (steering.current !== null) {
      if (Math.abs(el.scrollLeft - steering.current) < 2) steering.current = null
      return
    }
    const at = Math.min(Math.max(Math.round(el.scrollLeft / step), 0), projects.length - 1)
    if (at === useConsole.getState().gameIndex) return
    swiped.current = at
    setGameIndex(at)
  }

  return (
    <div
      onScroll={onScroll}
      // A finger on the row takes over from any scroll the selection started.
      onTouchStart={() => {
        steering.current = null
      }}
      ref={box}
      style={{
        ...(follow ? {scrollSnapType: 'x mandatory', scrollPaddingLeft: pad} : {}),
        position: 'relative',
        display: 'flex',
        gap: size.gap,
        alignItems: 'flex-end',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        touchAction: 'pan-x',
        overscrollBehavior: 'contain',
        padding: `${pad}px ${pad}px 0`,
        margin: `0 -${pad}px`,
      }}
    >
      {projects.map((project, i) => {
        const selected = i === index
        const width = selected ? size.selectedWidth : size.width
        const height = selected ? size.selectedHeight : size.height
        return (
          <Tap
            className="scr-tile"
            key={project._id}
            onTap={() => (selected ? openGame(project) : setGameIndex(i))}
            selected={selected}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: size.labelGap,
              flexShrink: 0,
              scrollSnapAlign: follow ? 'start' : undefined,
              // One tile per swipe: a flick stops at the next tile instead of gliding past several.
              scrollSnapStop: follow ? 'always' : undefined,
            }}
          >
            <div
              className="scr-tile-art"
              style={{
                position: 'relative',
                width,
                height,
                borderRadius: 5,
                overflow: 'hidden',
                outline: `2px solid ${selected ? C.accent : 'transparent'}`,
                outlineOffset: size.outlineOffset,
                transition: reducedMotion
                  ? undefined
                  : 'width 160ms ease, height 160ms ease, outline-color 160ms ease',
              }}
            >
              <Cover height={size.selectedHeight} project={project} width={size.selectedWidth} />
            </div>
            <div
              style={{
                width,
                fontSize: size.labelSize,
                paddingTop: 2,
                color: selected ? C.ink : C.soft,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {project.title}
            </div>
          </Tap>
        )
      })}
      {/* Room after the last tile, so it too can scroll up into the first slot. */}
      {follow ? (
        <div aria-hidden style={{flex: '0 0 auto', width: `calc(100% - ${step}px)`}} />
      ) : null}
    </div>
  )
}

/**
 * The trailer slot at the top of a project page: the cover with "A Play
 * trailer" over it, and — once it is asked for — the trailer itself, inline.
 * A YouTube or Vimeo link plays in its embed player, a video file in a
 * `<video>`; any other link opens in a new tab instead.
 */
export function TrailerSlot({
  project,
  width,
  height,
  badge,
}: {
  project: Project
  width: number
  height: number
  badge: {height: number; disc: number; fontSize: number; discFont: number}
}) {
  const C = usePalette()
  const playing = useConsole((state) => state.isTrailerPlaying)
  const playTrailer = useConsole((state) => state.playTrailer)
  const trailer = trailerOf(project)

  if (playing && trailer && trailer.kind !== 'link') {
    return (
      <div className="scr-fade" style={{position: 'relative', width, height, background: '#000'}}>
        {trailer.kind === 'iframe' ? (
          <iframe
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            src={trailer.src}
            style={{position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0}}
            title={`${project.title ?? 'Project'} trailer`}
          />
        ) : (
          <video
            autoPlay
            controls
            // Muted by default, as the embeds are (`mute=1`); the controls unmute it.
            muted
            playsInline
            src={trailer.src}
            style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
          />
        )}
      </div>
    )
  }

  const play = () => (trailer?.kind === 'link' ? openLink(trailer.src) : playTrailer())

  return (
    <Tap
      className={trailer ? 'scr-media' : undefined}
      onTap={trailer ? play : () => {}}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        cursor: trailer ? 'pointer' : 'default',
      }}
    >
      <Cover eager height={height} project={project} width={width} />
      {trailer ? (
        <div
          className="scr-badge"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            height: badge.height,
            padding: '0 14px 0 4px',
            borderRadius: badge.height / 2,
            background: `rgba(${C.scrim},.82)`,
            ...row,
            gap: 8,
            fontSize: badge.fontSize,
          }}
        >
          <ABadge fontSize={badge.discFont} light size={badge.disc} />
          Play trailer
        </div>
      ) : null}
    </Tap>
  )
}

/** A project's facts, in one of the design's three arrangements. */
export function Facts({
  project,
  variant,
  inline,
  className,
  style,
}: {
  project: Project
  /** `inline` on the home screen, `grid` on the desk project page, `stacked` on the handheld's. */
  variant: 'inline' | 'grid' | 'stacked'
  /** The inline row's sizes (the home screen's are tuned). */
  inline?: {fontSize: number; labelSize: number; gap: number}
  className?: string
  style?: CSSProperties
}) {
  const C = usePalette()
  const facts = projectFacts(project)
  if (facts.length === 0) return null

  if (variant === 'inline') {
    const sizes = inline ?? {fontSize: 13, labelSize: 11.5, gap: 24}
    return (
      <div
        className={className}
        style={{display: 'flex', gap: sizes.gap, fontSize: sizes.fontSize, ...style}}
      >
        {facts.map(([label, value]) => (
          <div key={label} style={{display: 'flex', flexDirection: 'column', gap: 3}}>
            <div style={{color: C.label, fontSize: sizes.labelSize}}>{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>
    )
  }

  // The bottom row of the grid closes with a rule of its own.
  const lastRow = facts.length - (facts.length % 2 || 2)
  const stacked = variant === 'stacked'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: stacked ? 14 : 20,
        fontSize: stacked ? 12.5 : 13.5,
      }}
    >
      {facts.map(([label, value], i) => (
        <div
          key={label}
          style={{
            display: 'flex',
            ...(stacked
              ? {flexDirection: 'column', gap: 2, padding: '7px 0'}
              : {justifyContent: 'space-between', gap: 12, padding: '9px 0'}),
            borderTop: `1px solid ${C.rule}`,
            borderBottom: i >= lastRow ? `1px solid ${C.rule}` : undefined,
          }}
        >
          <div style={{color: C.label, fontSize: stacked ? 11 : undefined}}>{label}</div>
          <div style={{textAlign: stacked ? undefined : 'right'}}>{value}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * The write-up under a project's facts: the description's paragraphs, its list
 * items as the numbered "What I built" rows, and the stack.
 */
export function WriteUp({project, compact}: {project: Project; compact: boolean}) {
  const C = usePalette()
  const paragraphs = descriptionParagraphs(project.description)
  const prose = paragraphs.filter((paragraph) => !paragraph.listItem)
  const built = paragraphs.filter((paragraph) => paragraph.listItem)
  const body = compact ? 13.5 : 15
  const labelSize = compact ? 11.5 : 12.5

  return (
    <>
      {prose.length === 0 && project.blurb ? (
        <div style={{fontSize: body, lineHeight: compact ? 1.45 : 1.5, color: C.inkStrong}}>
          {project.blurb}
        </div>
      ) : null}
      {prose.map((paragraph) =>
        paragraph.heading ? (
          <div key={paragraph.key} style={{fontSize: labelSize, color: C.label}}>
            {paragraph.text}
          </div>
        ) : (
          <div
            key={paragraph.key}
            style={{
              fontSize: body,
              lineHeight: compact ? 1.45 : 1.5,
              color: C.inkStrong,
              textWrap: 'pretty',
            }}
          >
            {paragraph.text}
          </div>
        ),
      )}
      {built.length > 0 ? (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <div style={{fontSize: labelSize, color: C.label, paddingBottom: 6}}>What I built</div>
          {built.map((item, i) => (
            <div
              key={item.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr',
                padding: '8px 0',
                borderTop: `1px solid ${C.rule}`,
                fontSize: compact ? 13 : 14,
              }}
            >
              <div style={{fontFamily: FONT.mono, fontSize: 11, color: C.dim, paddingTop: 2}}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>{item.text}</div>
            </div>
          ))}
        </div>
      ) : null}
      {project.tech?.length ? (
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          <div style={{fontSize: labelSize, color: C.label}}>Stack</div>
          <div style={{fontSize: compact ? 13 : 14}}>{project.tech.join(' · ')}</div>
        </div>
      ) : null}
    </>
  )
}

/** The pager on a project page: ‹ 01 / 06 ›. No wrap — the end arrows go dark. */
export function Pager({count, size, fontSize}: {count: number; size: number; fontSize: number}) {
  const C = usePalette()
  const index = useConsole((state) => state.gameIndex)
  const moveGame = useConsole((state) => state.moveGame)
  const arrow = (delta: number, enabled: boolean, glyph: string) => (
    <Tap
      className={enabled ? 'scr-tab' : undefined}
      onTap={() => moveGame(delta, count)}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        ...row,
        justifyContent: 'center',
        fontSize: 14,
        color: enabled ? C.ink : C.off,
        cursor: enabled ? 'pointer' : 'default',
      }}
    >
      {glyph}
    </Tap>
  )

  return (
    <div style={{...row, gap: 2, fontFamily: FONT.mono, fontSize, color: C.muted}}>
      {arrow(-1, index > 0, '‹')}
      {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
      {arrow(1, index < count - 1, '›')}
    </div>
  )
}

/** "‹ Games" — back, as a tap. */
export function BackToGames({height, padding}: {height: number; padding: string}) {
  const C = usePalette()
  const back = useConsole((state) => state.back)
  return (
    <Tap
      className="scr-tab"
      onTap={back}
      style={{
        height,
        padding,
        borderRadius: height / 2,
        ...row,
        gap: 8,
        fontSize: 13.5,
        color: C.soft,
      }}
    >
      <span className="scr-nudge" style={{color: C.ink}}>
        ‹
      </span>{' '}
      Games
    </Tap>
  )
}

/**
 * The scrolling part of a page. Native scrolling — a wheel, a finger, a
 * trackpad — plus the D-pad's up and down, which `ConsoleStage` sends to the one
 * `[data-scroll]` on the glass.
 */
export function Scroll({style, children}: {style?: CSSProperties; children: ReactNode}) {
  return (
    <div
      data-scroll=""
      style={{
        position: 'relative',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        scrollbarWidth: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Keeps the highlighted row of a list in view as the D-pad walks it. By hand,
 * for the same reason the shelf is.
 */
function useRowInView(index: number) {
  useEffect(() => {
    const target = document.querySelector(`[data-row="${index}"]`)
    const box = target?.closest('[data-scroll]')
    if (!(target instanceof HTMLElement) || !(box instanceof HTMLElement)) return
    const top = target.offsetTop - 12
    const bottom = target.offsetTop + target.offsetHeight + 12 - box.clientHeight
    const next = Math.min(Math.max(box.scrollTop, bottom), top)
    if (next !== box.scrollTop) box.scrollTo({top: next, behavior: 'smooth'})
  }, [index])
}

/** A round portrait. Collapses when there is no photo. */
export function Avatar({url, size}: {url: string | null | undefined; size: number}) {
  if (!url) return null
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- see media.tsx */
    <img
      alt=""
      height={size}
      src={`${url}?w=${size * 2}&h=${size * 2}&fit=crop&auto=format`}
      style={{width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0}}
      width={size}
    />
  )
}

/**
 * The marks on About's icon links, as inline path data — the owners' own marks,
 * linking to Yash's profiles. Inline rather than the design's icon CDN, which
 * the CSP does not allow. Each path's own box, so every mark draws the same size.
 */
const ICONS: Record<NonNullable<ProfileLink['icon']>, {path: string; box: number}> = {
  github: {
    box: 24,
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  itch: {
    box: 24,
    path: 'M3.13 1.338C2.08 1.96.02 4.328 0 4.95v1.03c0 1.303 1.22 2.45 2.325 2.45 1.33 0 2.436-1.102 2.436-2.41 0 1.308 1.07 2.41 2.4 2.41 1.328 0 2.362-1.102 2.362-2.41 0 1.308 1.137 2.41 2.466 2.41h.024c1.33 0 2.466-1.102 2.466-2.41 0 1.308 1.034 2.41 2.363 2.41 1.33 0 2.4-1.102 2.4-2.41 0 1.308 1.106 2.41 2.435 2.41C22.78 8.43 24 7.282 24 5.98V4.95c-.02-.62-2.082-2.99-3.13-3.612-3.253-.114-5.508-.134-8.87-.133-3.362 0-7.945.053-8.87.133zm6.376 6.477a2.74 2.74 0 0 1-.468.602c-.5.49-1.19.795-1.947.795a2.786 2.786 0 0 1-1.95-.795c-.182-.178-.32-.37-.446-.59-.127.222-.303.412-.486.59a2.788 2.788 0 0 1-1.95.795c-.092 0-.187-.025-.264-.052-.107 1.113-.152 2.176-.168 2.95v.005l-.006 1.167c.02 2.334-.23 7.564 1.03 8.85 1.952.454 5.545.662 9.15.663 3.605 0 7.198-.21 9.15-.664 1.26-1.284 1.01-6.514 1.03-8.848l-.006-1.167v-.004c-.016-.775-.06-1.838-.168-2.95-.077.026-.172.052-.263.052a2.788 2.788 0 0 1-1.95-.795c-.184-.178-.36-.368-.486-.59-.127.22-.265.412-.447.59a2.786 2.786 0 0 1-1.95.794c-.76 0-1.446-.303-1.948-.793a2.74 2.74 0 0 1-.468-.602 2.738 2.738 0 0 1-.463.602 2.787 2.787 0 0 1-1.95.794h-.16a2.787 2.787 0 0 1-1.95-.793 2.738 2.738 0 0 1-.464-.602zm-2.004 2.59v.002c.795.002 1.5 0 2.373.953.687-.072 1.406-.108 2.125-.107.72 0 1.438.035 2.125.107.873-.953 1.578-.95 2.372-.953.376 0 1.876 0 2.92 2.934l1.123 4.028c.832 2.995-.266 3.068-1.636 3.07-2.03-.075-3.156-1.55-3.156-3.025-1.124.184-2.436.276-3.748.277-1.312 0-2.624-.093-3.748-.277 0 1.475-1.125 2.95-3.156 3.026-1.37-.004-2.468-.077-1.636-3.072l1.122-4.027c1.045-2.934 2.545-2.934 2.92-2.934zM12 12.714c-.002.002-2.14 1.964-2.523 2.662l1.4-.056v1.22c0 .056.56.033 1.123.007.562.026 1.124.05 1.124-.008v-1.22l1.4.055C14.138 14.677 12 12.713 12 12.713z',
  },
  linkedin: {
    box: 16,
    path: 'M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z',
  },
  twitter: {
    box: 24,
    path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  },
  email: {
    box: 24,
    path: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
  },
}

/** About's links, icons only (design turn 6): 44px discs, one tap each. */
export function LinkIcons({content}: {content: ConsoleContent}) {
  const C = usePalette()
  const links = profileLinks(content)
  if (links.length === 0) return null

  return (
    <div style={{display: 'flex', gap: 6}}>
      {links.map((link) => {
        const icon = link.icon ? ICONS[link.icon] : null
        return (
          <Tap
            className="scr-icon"
            key={link.key}
            onTap={() => openLink(link.href)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              ...row,
              justifyContent: 'center',
              color: C.inkStrong,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {icon ? (
              <svg
                fill="currentColor"
                height={18}
                viewBox={`0 0 ${icon.box} ${icon.box}`}
                width={18}
              >
                <path d={icon.path} />
              </svg>
            ) : (
              link.label.slice(0, 1)
            )}
          </Tap>
        )
      })}
    </div>
  )
}

/**
 * The timeline, as About's Experience index (design turn 6): years, role,
 * company and place in fixed columns, and only the open row says what was done.
 * The D-pad's up and down move the open row; a tap opens the row tapped.
 */
export function Experience({content, compact}: {content: ConsoleContent; compact: boolean}) {
  const C = usePalette()
  const index = useConsole((state) => state.rowIndex)
  const setRowIndex = useConsole((state) => state.setRowIndex)
  useRowInView(index)
  const entries = content.timeline
  if (entries.length === 0) return null

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: compact ? '6px 0 10px' : '0 0 14px 22px',
        }}
      >
        <div style={{fontSize: compact ? 12.5 : 13, color: C.label}}>Experience</div>
        <div style={{fontFamily: FONT.mono, fontSize: compact ? 10.5 : 11.5, color: C.dim}}>
          {index + 1} / {entries.length}
        </div>
      </div>
      {entries.map((entry, i) => {
        const open = i === index
        const years = (
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: compact ? 11 : 12.5,
              color: compact ? C.hint : C.label,
            }}
          >
            {entryYears(entry)}
          </div>
        )
        return (
          <Tap
            className={open ? undefined : 'scr-row'}
            dataRow={i}
            key={entry._id}
            onTap={() => setRowIndex(i)}
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '18px minmax(0,1fr)' : '22px 104px minmax(0,1fr)',
              alignItems: compact ? undefined : 'baseline',
              padding: compact ? '14px 0' : '18px 0',
              minHeight: 44,
              boxSizing: 'border-box',
              borderTop: `1px solid ${C.rule}`,
            }}
          >
            <div
              className={open ? 'scr-in' : undefined}
              style={{
                color: C.accent,
                fontSize: compact ? 10 : 11,
                paddingTop: compact ? 4 : undefined,
              }}
            >
              {open ? '▶︎' : null}
            </div>
            {compact ? null : years}
            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <div style={{fontSize: compact ? 15.5 : 18, fontWeight: 600}}>{entry.role}</div>
              <div style={{fontSize: compact ? 13 : 14, color: C.label}}>
                {[entry.organisation, entry.location].filter(Boolean).join(' · ')}
              </div>
              {compact ? years : null}
              {open && entry.summary ? (
                <div
                  className="scr-in"
                  style={{
                    fontSize: compact ? 13.5 : 14.5,
                    lineHeight: compact ? 1.5 : 1.55,
                    color: C.soft,
                    maxWidth: compact ? undefined : 470,
                    textWrap: 'pretty',
                    paddingTop: 4,
                    ...stagger(1),
                  }}
                >
                  {entry.summary}
                </div>
              ) : null}
              {open && entry.highlights?.length ? (
                <div
                  className="scr-in"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    paddingTop: 2,
                    ...stagger(2),
                  }}
                >
                  {entry.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '14px 1fr',
                        fontSize: compact ? 12.5 : 13.5,
                        color: C.soft,
                      }}
                    >
                      <span style={{color: C.dim}}>–</span>
                      {highlight}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Tap>
        )
      })}
      <div style={{borderTop: `1px solid ${C.rule}`}} />
    </div>
  )
}

/**
 * The power-on, the one orchestrated moment: a hairline draws across the dark
 * glass, the name rises into it as its tracking settles, the title follows, a
 * thin bar fills, and the black lifts off Games. Every time is in the tune
 * (`boot*`). Pointer-transparent, so a visitor quick off the mark is not
 * blocked by it; skipped outright under reduced motion or with `bootOn` off.
 */
export function Boot({
  name,
  title,
  compact,
}: {
  name: string | null | undefined
  title: string | null | undefined
  compact: boolean
}) {
  const t = useT()
  const C = usePalette()
  const isBooting = useConsole((state) => state.isBooting)
  const endBoot = useConsole((state) => state.endBoot)
  const reducedMotion = useReducedMotion()
  const skip = reducedMotion || !t.bootOn

  useEffect(() => {
    if (isBooting && skip) endBoot()
  }, [isBooting, skip, endBoot])

  if (!isBooting || skip) return null

  const ease = 'cubic-bezier(.2,.7,.2,1)'
  const rise = (delay: number): CSSProperties => ({
    animation: `boot-rise ${t.bootRevealMs}ms ${ease} ${delay}ms both`,
  })

  return (
    <div
      data-boot=""
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) endBoot()
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: '#000',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 8 : 10,
        animation: `boot-out ${t.bootFadeMs}ms ease ${t.bootHoldMs}ms forwards`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1,
          background: t.bootNameColor,
          animation: `screen-line ${t.bootLineMs}ms ${ease} forwards`,
        }}
      />
      {name ? (
        <div
          style={
            {
              ...titleStyle(compact ? t.bootHhNameSize : t.bootDeskNameSize, 0.9),
              color: t.bootNameColor,
              letterSpacing: `${t.bootTracking}em`,
              '--track-from': `${t.bootTrackingFrom}em`,
              '--track-to': `${t.bootTracking}em`,
              animation: `boot-name ${t.bootRevealMs * 1.6}ms ${ease} ${t.bootNameDelayMs}ms both`,
            } as CSSProperties
          }
        >
          {name}
        </div>
      ) : null}
      {title ? (
        <div
          style={{
            fontSize: compact ? t.bootHhTitleSize : t.bootDeskTitleSize,
            color: t.bootTitleColor,
            ...rise(t.bootTitleDelayMs),
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          width: t.bootBarWidth,
          height: 1,
          marginTop: compact ? 10 : 14,
          background: `rgba(${C.inkRgb},.12)`,
          overflow: 'hidden',
          ...rise(t.bootTitleDelayMs),
        }}
      >
        <div
          style={{
            height: '100%',
            background: t.bootBarColor,
            transformOrigin: 'left',
            animation: `boot-bar ${Math.max(t.bootHoldMs - t.bootTitleDelayMs, 0)}ms ease-in-out ${t.bootTitleDelayMs}ms both`,
          }}
        />
      </div>
    </div>
  )
}

/**
 * The glass itself: the authored-size panel every screen draws into. It stops
 * `pointerdown` and `click` at its root — this DOM is mounted inside R3F's own
 * event target, and a tap on the glass would otherwise raycast the shell behind
 * it and start a drag-to-rotate.
 *
 * It also hands the tune's motion values to the CSS as custom properties.
 */
export function Glass({
  width,
  height,
  radius,
  compact,
  settings,
  children,
}: {
  width: number
  height: number
  radius: number
  /** The handheld's smaller boot type. */
  compact: boolean
  settings: ConsoleContent['settings']
  children: ReactNode
}) {
  const t = useT()
  const C = usePalette()
  return (
    <div
      aria-hidden
      data-glass=""
      data-motion={t.motionOn ? undefined : 'off'}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={
        {
          position: 'relative',
          width,
          height,
          borderRadius: radius,
          overflow: 'hidden',
          background: C.screen,
          color: C.ink,
          fontFamily: FONT.ui,
          WebkitFontSmoothing: 'antialiased',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          lineHeight: 1.2,
          '--ink': C.ink,
          '--ink-rgb': C.inkRgb,
          '--m-dur': `${t.motionMs}ms`,
          '--m-rise': `${t.motionRise}px`,
          '--m-stagger': `${t.motionStagger}ms`,
          '--m-fade': `${t.motionFadeMs}ms`,
          '--m-hover': `${t.motionHoverMs}ms`,
          '--m-lift': `${t.motionHoverLift}px`,
          '--m-bright': t.motionHoverBright,
          '--m-tile': t.motionTileScale,
        } as CSSProperties
      }
    >
      {children}
      <Boot compact={compact} name={settings?.fullName} title={settings?.title} />
    </div>
  )
}

/** The title face: Archivo, narrowed to 72%, heavy, in caps. Tracking in em. */
export function titleStyle(size: number, lineHeight: number, tracking = 0): CSSProperties {
  return {
    fontFamily: FONT.display,
    fontStretch: '72%',
    fontWeight: 800,
    fontSize: size,
    lineHeight,
    letterSpacing: tracking ? `${tracking}em` : undefined,
    textTransform: 'uppercase',
    margin: 0,
  }
}
