'use client'

import {useEffect, useState, type CSSProperties, type ReactNode} from 'react'

import type {ConsoleContent, Project} from '@/components/console/content'
import {useIsMobile} from '@/components/console/mobile'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {cover, placeholder} from '@/components/firmware/cover'
import {useFirmwareLayout, type FirmwareLayout} from '@/components/firmware/layout'
import {useRailDrag} from '@/components/firmware/useRailDrag'

/**
 * The Library rail (SPEC §8). One horizontal row of projects in `order`.
 *
 * The About tile that used to sit at index 0 is gone: that information belongs
 * on the left flap's info monitor, where it is visible whatever the screen is
 * showing, so the rail is projects and nothing else.
 *
 * The rail translates so the selected tile always sits at the same place. The
 * screen is close to square, so only two or three tiles are ever in frame and
 * the description below them carries the weight.
 *
 * Every size here comes from the tuning values through `useFirmwareLayout()`,
 * so the rail is dialled in against the real screen behind `?tune` rather than
 * guessed at in this file.
 */

/** SPEC §8: the whole transition under 320ms. Reduced motion crossfades (§11.5). */
export function transition(reducedMotion: boolean, properties: string): CSSProperties {
  return {
    transition: reducedMotion
      ? 'opacity 100ms linear'
      : `${properties} 280ms cubic-bezier(0.2, 0.9, 0.25, 1)`,
  }
}

/** The tile's cover, at the size a tile draws it. */
function tileCover(project: Project) {
  return cover(project, 720, 405)
}

/**
 * What a tile does when it is picked, in pixels above its own box: it lifts,
 * and it wears a ring at `outlineOffset` plus the outline's own width.
 *
 * The scale is a tuning value and the row is `overflow: hidden`, so the
 * headroom above the row has to be derived from all three rather than left as
 * a number that happened to be enough at the width it was authored at. It was
 * not enough on a phone, where the tile is 84px tall and the gap above it 14.
 */
const SELECTED_LIFT = 6
const HOVER_LIFT = 3
const SELECTED_RING = 5

function railHeadroom(layout: FirmwareLayout): number {
  // The ring hangs off the *scaled* box, so it scales with it. The 2px is
  // slack: the panel is drawn through a transform, and landing the ring exactly
  // on the clip edge is one rounding away from shaving it.
  const grown = layout.tileHeight * (layout.selectedScale - 1)
  return Math.ceil(grown + SELECTED_LIFT + SELECTED_RING * layout.selectedScale) + 2
}

function Tile({
  selected,
  reducedMotion,
  onSelect,
  children,
}: {
  selected: boolean
  reducedMotion: boolean
  onSelect: () => void
  children: (hovered: boolean) => ReactNode
}) {
  const layout = useFirmwareLayout()
  const [hovered, setHovered] = useState(false)

  /*
    The tile carries the geometry — the scale, the lift and the selection
    outline — and its face carries the dimming, because SPEC §8's reduced
    opacity on an unselected tile is right for a cover image and wrong for the
    title on a tile that has no cover: text under it lands beneath §9's 4.5:1.

    Hovering an unselected tile lifts it a little. It is the same idea wherever
    a hover state appears on this screen — what is under the pointer comes
    forward slightly, and no further. This is a menu (SPEC §10).
  */
  const lift = selected ? SELECTED_LIFT : hovered ? HOVER_LIFT : 0

  return (
    <div
      onClick={onSelect}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        flex: '0 0 auto',
        width: `${layout.tileWidth}px`,
        height: `${layout.tileHeight}px`,
        cursor: 'pointer',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        transformOrigin: 'center bottom',
        transform: `scale(${selected ? layout.selectedScale : 1}) translateY(${-lift}px)`,
        outline: selected ? '2px solid var(--screen-accent)' : '1px solid transparent',
        outlineOffset: `${SELECTED_RING - 2}px`,
        ...transition(reducedMotion, 'transform, outline-color'),
      }}
    >
      {children(hovered)}
    </div>
  )
}

/**
 * A project's gameplay clip, laid over its cover once the selection has rested
 * on it (`fwPreviewDelayMs`).
 *
 * It is invisible until it has a frame to show and then fades in, so a slow
 * GIF never blanks the tile — the cover is still underneath until it does. A
 * GIF is an image and a video is a video; Sanity's `mimeType` says which.
 * Muted and `playsInline`, which is what lets a phone autoplay it at all.
 */
function PreviewClip({url, mimeType}: {url: string; mimeType: string | null}) {
  const [shown, setShown] = useState(false)
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: shown ? 1 : 0,
    transition: 'opacity 300ms ease-out',
  }

  if (mimeType?.startsWith('video/')) {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        src={url}
        onLoadedData={() => setShown(true)}
        style={style}
      />
    )
  }

  /* eslint-disable-next-line @next/next/no-img-element -- see cover.ts. An
     animated GIF also has to arrive untouched: an optimiser would hand back its
     first frame. */
  return <img alt="" src={url} onLoad={() => setShown(true)} style={style} />
}

/**
 * A project's cover, or — when the field is empty — a solid accent-tinted tile
 * with the title set in Archivo Expanded. Deliberate, not a broken image
 * (SPEC §3.2). With `previewing` set, its clip plays over whichever it is.
 */
function ProjectFace(props: {
  project: Project
  selected: boolean
  hovered: boolean
  reducedMotion: boolean
  /** The first two tiles, which are the ones on the glass when it opens. */
  eager: boolean
  previewing: boolean
}) {
  const clip = props.previewing ? props.project.preview : null

  return (
    <>
      <CoverFace {...props} />
      {clip?.url ? <PreviewClip url={clip.url} mimeType={clip.mimeType} /> : null}
    </>
  )
}

function CoverFace({
  project,
  selected,
  hovered,
  reducedMotion,
  eager,
}: {
  project: Project
  selected: boolean
  hovered: boolean
  reducedMotion: boolean
  eager: boolean
}) {
  const layout = useFirmwareLayout()
  const art = tileCover(project)
  const quiet = !selected && !hovered

  if (!art) {
    return (
      <div
        style={{
          height: '100%',
          padding: '18px 20px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-end',
          // The tint goes quiet where a cover would dim; the title does not.
          background: `color-mix(in srgb, var(--screen-accent) ${quiet ? 12 : 24}%, var(--screen-bg))`,
          ...transition(reducedMotion, 'background-color'),
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--screen-fg)',
            fontSize: `${layout.tileFont}px`,
            fontStretch: '125%',
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {project.title}
        </p>
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- see cover.ts: this
       lives inside a drei <Html> subtree and Sanity's CDN already sizes and
       re-formats it. */
    <img
      alt=""
      src={art.src}
      width={art.width}
      height={art.height}
      // SPEC §12 wants the first two rail items eager and the rest deferred.
      // Only the first two are on the glass when the Library opens; the rest are
      // off the right-hand edge, waiting for a move that may never come.
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        opacity: quiet ? layout.unselectedOpacity : 1,
        filter: quiet ? 'saturate(0.35)' : 'none',
        ...placeholder(art.lqip),
        ...transition(reducedMotion, 'opacity, filter'),
      }}
    />
  )
}

export function LibraryRail({content}: {content: ConsoleContent}) {
  const index = useConsole((state) => state.libraryIndex)
  const setLibraryIndex = useConsole((state) => state.setLibraryIndex)
  const openDetail = useConsole((state) => state.openDetail)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()
  const mobile = useIsMobile()

  const {projects} = content
  const selected = projects[index] ?? null

  const step = layout.tileWidth + layout.tileGap
  const drag = useRailDrag({step, index, count: projects.length, setIndex: setLibraryIndex})

  /*
    The clip waits for the selection to settle: a visitor running the stick
    along the rail should see covers go by, not a clip start loading under
    every one. Which tile it settled on is the state, so moving away ends the
    clip without anything having to reset it. No clip at all under reduced
    motion (SPEC §11.5) — autoplaying footage is exactly what that asks for
    less of.
  */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const hasClip = Boolean(selected?.preview?.url) && !reducedMotion

  useEffect(() => {
    if (!hasClip) return
    const id = setTimeout(() => setPreviewIndex(index), layout.previewDelayMs)
    return () => {
      clearTimeout(id)
      setPreviewIndex(null)
    }
  }, [hasClip, index, layout.previewDelayMs])

  /*
    The selection sits in the middle of the panel rather than against its left
    edge, so a tile has a neighbour either side of it and the rail reads as
    something with a before and an after. The lead-in is what puts it there:
    the row still translates by whole steps, so the drag maths is untouched.
  */
  const railLead = Math.round((layout.panelWidth - layout.tileWidth) / 2)
  const headroom = railHeadroom(layout)

  /** A click selects; a click on what is already selected drills in. */
  const select = (target: number) => {
    // The end of a drag is not a tap on whatever the finger happened to lift
    // over.
    if (drag.moved()) return
    if (target === index) {
      openDetail()
      return
    }
    setLibraryIndex(target)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        /*
          On a phone the section is a cover, a title and a year — a third of
          the glass. Left at the top it reads as a page that failed to load
          the rest of itself, so it sits in the middle of the screen instead.
          The desktop panel is full, and centring there would only float the
          rail away from the status bar.
        */
        justifyContent: mobile ? 'center' : 'flex-start',
      }}
    >
      {/* The padding is the headroom the selected tile's scale and lift need. */}
      <div
        {...drag.handlers}
        style={{
          overflow: 'hidden',
          padding: `${Math.max(layout.railTop, headroom)}px 0 ${headroom}px`,
          // The rail owns the sideways gesture; nothing else may claim it.
          touchAction: 'none',
          cursor: drag.dragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: `${layout.tileGap}px`,
            paddingLeft: `${railLead}px`,
            transform: `translateX(${-index * step + drag.offset}px)`,
            // Under the finger the rail *is* the finger: an eased transition
            // would lag behind it.
            ...(drag.dragging ? undefined : transition(reducedMotion, 'transform')),
          }}
        >
          {projects.map((project, position) => (
            <Tile
              key={project._id}
              selected={index === position}
              reducedMotion={reducedMotion}
              onSelect={() => select(position)}
            >
              {(hovered) => (
                <ProjectFace
                  project={project}
                  selected={index === position}
                  hovered={hovered}
                  reducedMotion={reducedMotion}
                  eager={position < 2}
                  previewing={position === previewIndex && !drag.dragging}
                />
              )}
            </Tile>
          ))}
        </div>
      </div>

      {/*
        The description below the rail. Keyed on the selection so the block
        crossfades as a whole rather than the words changing under a static
        heading.
      */}
      {selected ? (
        <div
          key={index}
          style={{
            padding: `${layout.blockGap}px ${layout.railX}px 0`,
            maxWidth: '62ch',
            animation: reducedMotion ? undefined : 'firmware-fade 240ms ease-out',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: 'var(--screen-fg)',
              fontSize: `${layout.titleFont}px`,
              fontStretch: '125%',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              lineHeight: 1.02,
            }}
          >
            {selected.title}
          </h2>

          <p
            style={{
              margin: `${Math.round(layout.textGap * 0.85)}px 0 0`,
              color: 'var(--screen-muted)',
              fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
              fontSize: `${layout.metaFont}px`,
              letterSpacing: '0.08em',
            }}
          >
            {/*
              A 320px panel is a caption, not a page. On a phone the tile keeps
              its cover, its title and the one fact that dates it; the role, the
              engine, the blurb and the affordance line below are all a tap
              away in the detail view, and stacked on the glass they were what
              made the rail read as a wall of text.
            */}
            {mobile
              ? selected.year
              : [selected.year, selected.role, selected.engine].filter(Boolean).join('   /   ')}
          </p>

          {mobile ? null : (
            <>
              <p
                style={{
                  margin: `${layout.textGap}px 0 0`,
                  color: 'var(--screen-fg)',
                  fontSize: `${layout.bodyFont}px`,
                  lineHeight: 1.5,
                }}
              >
                {selected.blurb}
              </p>

              {/* Says what happens, not marketing copy (SPEC §10). */}
              <p
                style={{
                  margin: `${Math.round(layout.textGap * 1.5)}px 0 0`,
                  color: 'var(--screen-accent)',
                  fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
                  fontSize: `${layout.metaFont - 1}px`,
                  letterSpacing: '0.16em',
                }}
              >
                ENTER — DETAILS
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
