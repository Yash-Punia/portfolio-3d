'use client'

import type {CSSProperties, ReactNode} from 'react'

import type {ConsoleContent, Project} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {urlFor} from '@/sanity/lib/image'

/**
 * The Library rail (SPEC §8). One horizontal row: the About tile at index 0,
 * then the projects in `order`. Moving right from About enters the games, which
 * is what makes About prompt you to go across rather than sitting on a screen of
 * its own (SPEC §16.1, confirmed).
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

function coverUrl(project: Project): string | null {
  if (!project.cover?.asset) return null
  return urlFor(project.cover).width(720).height(405).fit('crop').auto('format').url()
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
  children: ReactNode
}) {
  const layout = useFirmwareLayout()

  return (
    <div
      onClick={onSelect}
      style={{
        flex: '0 0 auto',
        width: `${layout.tileWidth}px`,
        height: `${layout.tileHeight}px`,
        cursor: 'pointer',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        transformOrigin: 'center bottom',
        transform: selected ? `scale(${layout.selectedScale}) translateY(-6px)` : 'scale(1)',
        opacity: selected ? 1 : layout.unselectedOpacity,
        filter: selected ? 'none' : 'saturate(0.35)',
        outline: selected ? '2px solid var(--screen-accent)' : '1px solid transparent',
        outlineOffset: '3px',
        ...transition(reducedMotion, 'transform, opacity, filter, outline-color'),
      }}
    >
      {children}
    </div>
  )
}

/**
 * Index 0: no cover art (SPEC §8). It carries the name, not the headline — the
 * headline is already the heading directly below the rail when this tile is
 * selected, and a tile that repeats the sentence under it reads as a bug.
 */
function AboutFace({settings}: {settings: ConsoleContent['settings']}) {
  const layout = useFirmwareLayout()

  return (
    <div
      style={{
        height: '100%',
        padding: '18px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'color-mix(in srgb, var(--screen-accent) 14%, var(--screen-bg))',
        border: '1px solid color-mix(in srgb, var(--screen-accent) 55%, transparent)',
        borderRadius: '4px',
      }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--screen-fg)',
          fontSize: `${layout.tileFont}px`,
          fontStretch: '118%',
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {settings?.fullName ?? 'About'}
      </p>
    </div>
  )
}

/**
 * A project's cover, or — when the field is empty — a solid accent-tinted tile
 * with the title set in Archivo Expanded. Deliberate, not a broken image
 * (SPEC §3.2).
 */
function ProjectFace({project}: {project: Project}) {
  const layout = useFirmwareLayout()
  const cover = coverUrl(project)

  if (!cover) {
    return (
      <div
        style={{
          height: '100%',
          padding: '18px 20px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-end',
          background: 'color-mix(in srgb, var(--screen-accent) 24%, var(--screen-bg))',
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
    /* eslint-disable-next-line @next/next/no-img-element -- this element lives
       inside a drei <Html> subtree in the canvas, and Sanity's CDN already does
       the resizing and format negotiation next/image would add. */
    <img
      alt=""
      src={cover}
      style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover'}}
    />
  )
}

export function LibraryRail({content}: {content: ConsoleContent}) {
  const index = useConsole((state) => state.libraryIndex)
  const setLibraryIndex = useConsole((state) => state.setLibraryIndex)
  const openDetail = useConsole((state) => state.openDetail)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()

  const {settings, projects} = content
  const selected = index > 0 ? (projects[index - 1] ?? null) : null

  /** A click selects; a click on what is already selected drills in. */
  const select = (target: number) => {
    if (target === index && target > 0) {
      openDetail()
      return
    }
    setLibraryIndex(target)
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
      {/* The bottom padding is the headroom the selected tile's scale needs. */}
      <div style={{overflow: 'hidden', padding: `${layout.railTop}px 0 10px`}}>
        <div
          style={{
            display: 'flex',
            gap: `${layout.tileGap}px`,
            paddingLeft: `${layout.railX}px`,
            transform: `translateX(${-index * (layout.tileWidth + layout.tileGap)}px)`,
            ...transition(reducedMotion, 'transform'),
          }}
        >
          <Tile selected={index === 0} reducedMotion={reducedMotion} onSelect={() => select(0)}>
            <AboutFace settings={settings} />
          </Tile>

          {projects.map((project, position) => (
            <Tile
              key={project._id}
              selected={index === position + 1}
              reducedMotion={reducedMotion}
              onSelect={() => select(position + 1)}
            >
              <ProjectFace project={project} />
            </Tile>
          ))}
        </div>
      </div>

      {/*
        The description below the rail. Keyed on the selection so the block
        crossfades as a whole rather than the words changing under a static
        heading.
      */}
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
          {selected ? selected.title : (settings?.aboutHeadline ?? settings?.fullName)}
        </h2>

        {selected ? (
          <p
            style={{
              margin: `${Math.round(layout.textGap * 0.85)}px 0 0`,
              color: 'var(--screen-muted)',
              fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
              fontSize: `${layout.metaFont}px`,
              letterSpacing: '0.08em',
            }}
          >
            {[selected.year, selected.role, selected.engine].filter(Boolean).join('   /   ')}
          </p>
        ) : null}

        <p
          style={{
            margin: `${layout.textGap}px 0 0`,
            color: 'var(--screen-fg)',
            fontSize: `${layout.bodyFont}px`,
            lineHeight: 1.5,
          }}
        >
          {selected ? selected.blurb : settings?.aboutBody}
        </p>

        {/* Says what happens, not marketing copy (SPEC §10). */}
        {selected ? (
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
        ) : null}
      </div>
    </div>
  )
}
