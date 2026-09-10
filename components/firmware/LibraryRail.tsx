'use client'

import {useState, type CSSProperties, type ReactNode} from 'react'

import type {ConsoleContent, Project} from '@/components/console/content'
import {useIsMobile} from '@/components/console/mobile'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {cover, placeholder} from '@/components/firmware/cover'
import {useFirmwareLayout} from '@/components/firmware/layout'
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
  const lift = selected ? 6 : hovered ? 3 : 0

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
        outlineOffset: '3px',
        ...transition(reducedMotion, 'transform, outline-color'),
      }}
    >
      {children(hovered)}
    </div>
  )
}

/**
 * A project's cover, or — when the field is empty — a solid accent-tinted tile
 * with the title set in Archivo Expanded. Deliberate, not a broken image
 * (SPEC §3.2).
 */
function ProjectFace({
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
  /** The first two tiles, which are the ones on the glass when it opens. */
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
    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
      {/* The padding is the headroom the selected tile's scale and lift need. */}
      <div
        {...drag.handlers}
        style={{
          overflow: 'hidden',
          padding: `${layout.railTop}px 0 14px`,
          // The rail owns the sideways gesture; nothing else may claim it.
          touchAction: 'none',
          cursor: drag.dragging ? 'grabbing' : 'grab',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: `${layout.tileGap}px`,
            paddingLeft: `${layout.railX}px`,
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
