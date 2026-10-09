'use client'

import {useEffect, useRef, type CSSProperties, type ReactNode} from 'react'

import {
  contactRows,
  descriptionParagraphs,
  entryDates,
  openLink,
  openRow,
  projectFacts,
  trailerOf,
  type ConsoleContent,
  type Project,
} from '@/components/console/content'
import {SCREEN_LABELS} from '@/components/console/device'
import {useConsole, type Screen} from '@/components/console/store'
import {C, FONT} from '@/components/console/tokens'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {Cover} from '@/components/screen/media'

/**
 * The pieces both screens are built from. Every size is the design's own px,
 * passed in by the screen that knows which device it is on — the desk and the
 * handheld draw the same parts at different sizes, never a scaled copy.
 *
 * Everything here is inside the screen's `aria-hidden` tree, so nothing is a
 * `<button>` or an `<a>`: a focusable element inside `aria-hidden` is a trap.
 * The page's hidden landmark and `ConsoleControls` are the accessible copies.
 */

export const row: CSSProperties = {display: 'flex', alignItems: 'center'}

/** A tap target. One tap, one action: it fires on the click, which is the release. */
export function Tap({
  onTap,
  style,
  dataRow,
  children,
}: {
  onTap: () => void
  style?: CSSProperties
  /** Marks a row the D-pad walks, so it can be kept in view. */
  dataRow?: number
  children: ReactNode
}) {
  return (
    <div
      data-row={dataRow}
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

/** The little A disc the design sets inside "Watch trailer" and over the trailer. */
export function ABadge({
  size,
  fontSize,
  light = false,
}: {
  size: number
  fontSize: number
  light?: boolean
}) {
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

const PILL: Record<PillKind, CSSProperties> = {
  primary: {background: C.ink, color: C.screen, fontWeight: 600},
  ghost: {background: 'rgba(237,236,232,.12)'},
  outline: {border: `1px solid ${C.outline}`, background: C.screen},
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
  return (
    <Tap
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
        ...PILL[kind],
        ...style,
      }}
    >
      {children}
    </Tap>
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
  const screen = useConsole((state) => state.screen)
  const isProjectOpen = useConsole((state) => state.isProjectOpen)
  const setScreen = useConsole((state) => state.setScreen)

  return (
    <div style={{...row, gap: 2, fontSize}}>
      {screens.map((tab) => {
        const active = tab === screen && !isProjectOpen
        return (
          <Tap
            key={tab}
            onTap={() => setScreen(tab)}
            style={{
              height,
              padding: active ? activePadding : idlePadding,
              borderRadius: height / 2,
              ...row,
              ...(active
                ? {background: 'rgba(237,236,232,.92)', color: C.screen, fontWeight: 600}
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
 * selects it; a tap on the selected one opens its page.
 */
export function Shelf({projects, size}: {projects: Project[]; size: ShelfSize}) {
  const index = useConsole((state) => state.gameIndex)
  const setGameIndex = useConsole((state) => state.setGameIndex)
  const openProject = useConsole((state) => state.openProject)
  const reducedMotion = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const pad = size.outlineOffset + 3

  /*
    Scrolled by hand rather than with `scrollIntoView`, which would also scroll
    every ancestor it can — and `body`, though `overflow: hidden`, is one.
  */
  useEffect(() => {
    const el = box.current
    const tile = el?.children[index]
    if (!el || !(tile instanceof HTMLElement)) return
    const left = tile.offsetLeft - pad
    const right = tile.offsetLeft + size.selectedWidth + pad - el.clientWidth
    const target = Math.min(Math.max(el.scrollLeft, right), left)
    if (target !== el.scrollLeft) {
      el.scrollTo({left: target, behavior: reducedMotion ? 'auto' : 'smooth'})
    }
  }, [index, pad, size.selectedWidth, reducedMotion])

  return (
    <div
      ref={box}
      style={{
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
            key={project._id}
            onTap={() => (selected ? openProject() : setGameIndex(i))}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: size.labelGap,
              flexShrink: 0,
              opacity: selected ? 1 : 0.7,
              transition: reducedMotion ? undefined : 'opacity 160ms ease',
            }}
          >
            <div
              style={{
                position: 'relative',
                width,
                height,
                borderRadius: 5,
                overflow: 'hidden',
                outline: selected ? `2px solid ${C.accent}` : '2px solid transparent',
                outlineOffset: size.outlineOffset,
                transition: reducedMotion ? undefined : 'width 160ms ease, height 160ms ease',
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
  const playing = useConsole((state) => state.isTrailerPlaying)
  const playTrailer = useConsole((state) => state.playTrailer)
  const trailer = trailerOf(project)

  if (playing && trailer && trailer.kind !== 'link') {
    return (
      <div style={{position: 'relative', width, height, background: '#000'}}>
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
      onTap={trailer ? play : () => {}}
      style={{position: 'relative', width, height, cursor: trailer ? 'pointer' : 'default'}}
    >
      <Cover eager height={height} project={project} width={width} />
      {trailer ? (
        <div
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
}: {
  project: Project
  /** `inline` on the home screen, `grid` on the desk project page, `stacked` on the handheld's. */
  variant: 'inline' | 'grid' | 'stacked'
}) {
  const facts = projectFacts(project)
  if (facts.length === 0) return null

  if (variant === 'inline') {
    return (
      <div style={{display: 'flex', gap: 24, fontSize: 13}}>
        {facts.map(([label, value]) => (
          <div key={label} style={{display: 'flex', flexDirection: 'column', gap: 3}}>
            <div style={{color: C.label, fontSize: 11.5}}>{label}</div>
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
  const index = useConsole((state) => state.gameIndex)
  const moveGame = useConsole((state) => state.moveGame)
  const arrow = (delta: number, enabled: boolean, glyph: string) => (
    <Tap
      onTap={() => moveGame(delta, count)}
      style={{
        width: size,
        height: size,
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
  const back = useConsole((state) => state.back)
  return (
    <Tap onTap={back} style={{height, padding, ...row, gap: 8, fontSize: 13.5, color: C.soft}}>
      <span style={{color: C.ink}}>‹</span> Games
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

/**
 * The résumé and the links (design M3): the résumé as the light pill, the links
 * as 44px rows with ↗. The highlighted row is the D-pad's — the green bar is
 * the design's one colour for "selected".
 */
export function ContactList({content, linkSize}: {content: ConsoleContent; linkSize: number}) {
  const index = useConsole((state) => state.rowIndex)
  const setRowIndex = useConsole((state) => state.setRowIndex)
  const rows = contactRows(content)
  useRowInView(index)

  const links = rows.filter((entry) => entry.kind === 'link')
  const offset = rows.length - links.length

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
      {rows[0]?.kind === 'resume' ? (
        <div
          data-row={0}
          style={{
            borderRadius: 24,
            padding: 2,
            margin: -2,
            outline: index === 0 ? `2px solid ${C.accent}` : undefined,
          }}
        >
          <Pill
            fontSize={14.5}
            height={44}
            kind="primary"
            onTap={() => {
              setRowIndex(0)
              openRow(rows[0]!)
            }}
          >
            {rows[0].label} ↓
          </Pill>
        </div>
      ) : null}
      {links.length > 0 ? (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          {links.map((link, i) => {
            const at = i + offset
            const selected = at === index
            return (
              <Tap
                dataRow={at}
                key={link.key}
                onTap={() => {
                  setRowIndex(at)
                  openRow(link)
                }}
                style={{
                  height: 44,
                  ...row,
                  justifyContent: 'space-between',
                  borderTop: `1px solid ${C.rule}`,
                  borderBottom: i === links.length - 1 ? `1px solid ${C.rule}` : undefined,
                  fontSize: linkSize,
                  paddingLeft: selected ? 10 : 0,
                  boxShadow: selected ? `inset 2px 0 0 ${C.accent}` : undefined,
                  transition: 'padding-left 120ms ease',
                }}
              >
                <span>{link.label}</span>
                <span style={{color: selected ? C.accent : C.dim}}>↗</span>
              </Tap>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/** The timeline, as About's "Experience": role, organisation, dates, and what was done. */
export function Experience({content, compact}: {content: ConsoleContent; compact: boolean}) {
  if (content.timeline.length === 0) return null

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div style={{fontSize: compact ? 12 : 12.5, color: C.label, paddingBottom: 6}}>
        Experience
      </div>
      {content.timeline.map((entry) => (
        <div
          key={entry._id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '10px 0',
            borderTop: `1px solid ${C.rule}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'baseline',
            }}
          >
            <div style={{fontSize: compact ? 13.5 : 14.5, fontWeight: 600}}>{entry.role}</div>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: compact ? 10 : 11,
                color: C.dim,
                whiteSpace: 'nowrap',
              }}
            >
              {entryDates(entry)}
            </div>
          </div>
          <div style={{fontSize: compact ? 12.5 : 13, color: C.label}}>
            {[entry.organisation, entry.location].filter(Boolean).join(' · ')}
          </div>
          {entry.summary ? (
            <div
              style={{
                fontSize: compact ? 13 : 13.5,
                lineHeight: 1.45,
                color: C.inkStrong,
                paddingTop: 2,
              }}
            >
              {entry.summary}
            </div>
          ) : null}
          {entry.highlights?.length ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2}}>
              {entry.highlights.map((highlight) => (
                <div
                  key={highlight}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '14px 1fr',
                    fontSize: compact ? 12.5 : 13,
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
      ))}
    </div>
  )
}

/**
 * The power-on: the glass lights from a line across its middle and the home
 * screen fades up behind it. Pointer-transparent, so a visitor quick off the
 * mark is not blocked by it; skipped outright under reduced motion.
 */
export function Boot() {
  const isBooting = useConsole((state) => state.isBooting)
  const endBoot = useConsole((state) => state.endBoot)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (isBooting && reducedMotion) endBoot()
  }, [isBooting, reducedMotion, endBoot])

  if (!isBooting || reducedMotion) return null

  return (
    <div
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) endBoot()
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: '#000',
        pointerEvents: 'none',
        animation: 'screen-boot 760ms ease-in forwards',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 2,
          background: C.ink,
          animation: 'screen-line 420ms ease-out forwards',
        }}
      />
    </div>
  )
}

/**
 * The glass itself: the authored-size panel every screen draws into. It stops
 * `pointerdown` and `click` at its root — this DOM is mounted inside R3F's own
 * event target, and a tap on the glass would otherwise raycast the shell behind
 * it and start a drag-to-rotate.
 */
export function Glass({
  width,
  height,
  radius,
  children,
}: {
  width: number
  height: number
  radius: number
  children: ReactNode
}) {
  return (
    <div
      aria-hidden
      data-glass=""
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
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
      }}
    >
      {children}
      <Boot />
    </div>
  )
}

/** The title face: Archivo, narrowed to 72%, heavy, in caps. */
export function titleStyle(size: number, lineHeight: number): CSSProperties {
  return {
    fontFamily: FONT.display,
    fontStretch: '72%',
    fontWeight: 800,
    fontSize: size,
    lineHeight,
    textTransform: 'uppercase',
    margin: 0,
  }
}
