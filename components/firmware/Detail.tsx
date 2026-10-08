'use client'

import {useState} from 'react'

import {
  descriptionParagraphs,
  openLink,
  projectMeta,
  type Project,
} from '@/components/console/content'
import {GLYPHS, VIEWBOX, type GlyphName} from '@/components/console/glyphs'
import {useIsMobile} from '@/components/console/mobile'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {cover, placeholder} from '@/components/firmware/cover'
import {scrollBox, scrollFade} from '@/components/firmware/edges'
import {useFirmwareLayout} from '@/components/firmware/layout'

/**
 * The expanded project view (SPEC §16.3, confirmed): `Enter` on a tile opens it
 * in place over the rail, `Escape` closes it, and only then does `Escape` close
 * the console (SPEC §8).
 *
 * Laid out the way a store page is: the cover on the left at about three fifths
 * of the width with the facts beside it, and the ways to go and play it as
 * buttons directly under the cover — the thing a visitor is most likely to want
 * next sits next to the thing that made them want it. The write-up runs full
 * width below. A full-width cover above everything else pushed all of that a
 * screen down.
 *
 * Every optional field collapses on its own (SPEC §3.2) — most projects have no
 * `description`, `gallery` or `videoUrl`, and none of those may leave a heading
 * with nothing under it.
 *
 * The spec rows and the Portable Text flattening both live in `content.ts`, so
 * this view and the page's hidden landmark render the same set of facts
 * (SPEC §11.1).
 */
function Description({blocks}: {blocks: Project['description']}) {
  const layout = useFirmwareLayout()

  return (
    <>
      {descriptionParagraphs(blocks).map(({key, text, heading}) => (
        <p
          key={key}
          style={{
            margin: `0 0 ${Math.round(layout.textGap * 0.85)}px`,
            color: heading ? 'var(--screen-fg)' : 'var(--screen-muted)',
            fontSize: `${heading ? layout.bodyFont + 3 : layout.bodyFont - 1}px`,
            fontWeight: heading ? 600 : 400,
            lineHeight: 1.55,
          }}
        >
          {text}
        </p>
      ))}
    </>
  )
}

/** Which mark a link's button wears, read off where it goes. */
function glyphFor(url: string): GlyphName {
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return 'external'
  }
  if (host.endsWith('github.com')) return 'github'
  if (host.endsWith('itch.io')) return 'itch'
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) return 'play'
  if (host === 'play.google.com' || host === 'apps.apple.com') return 'store'
  return 'external'
}

export function Detail({project}: {project: Project}) {
  const closeDetail = useConsole((state) => state.closeDetail)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()
  const mobile = useIsMobile()

  const art = cover(project, 960, 540)
  // The trailer is a link like the others, and the one most worth pressing.
  const links = [
    ...(project.videoUrl ? [{label: 'Trailer', url: project.videoUrl}] : []),
    ...(project.links ?? []).flatMap((link) =>
      link.url ? [{label: link.label ?? link.url, url: link.url}] : [],
    ),
  ]
  const meta = projectMeta(project)
  const gap = Math.round(layout.railX * 0.6)

  return (
    <div
      style={{
        position: 'absolute',
        inset: `${layout.statusHeight}px 0 0`,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--screen-bg)',
        animation: reducedMotion ? undefined : 'firmware-fade 200ms ease-out',
      }}
    >
      <div
        data-console-scroll
        // What the stick scrolls while this is open (`useRailInput`).
        data-detail-scroll
        style={{...scrollBox(mobile), padding: `${layout.railTop / 2}px ${layout.railX}px 48px`}}
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
          {project.title}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            columnGap: `${gap}px`,
            alignItems: 'start',
            margin: `${layout.blockGap / 2}px 0 0`,
          }}
        >
          <div style={{minWidth: 0}}>
            {art ? (
              /* eslint-disable-next-line @next/next/no-img-element -- see cover.ts:
                 inside a drei <Html> subtree; Sanity's CDN already sizes and
                 re-formats it. */
              <img
                alt=""
                src={art.src}
                width={art.width}
                height={art.height}
                // The detail view only exists once someone has asked for it, so
                // its cover is never a deferred load — it is what they asked for.
                decoding="async"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '16 / 9',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  ...placeholder(art.lqip),
                }}
              />
            ) : null}

            {links.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${Math.round(gap * 0.5)}px`,
                  margin: art ? `${Math.round(gap * 0.6)}px 0 0` : 0,
                }}
              >
                {links.map((link) => (
                  <LinkButton key={link.url} label={link.label} url={link.url} />
                ))}
              </div>
            ) : null}
          </div>

          {/*
            Stacked label over value rather than the two-column list it used to
            be: two fifths of a phone's panel is about a hundred pixels, and a
            label column would take half of it.
          */}
          <dl
            style={{
              margin: 0,
              display: 'grid',
              rowGap: `${Math.round(layout.textGap * 0.7)}px`,
              fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
              fontSize: `${layout.metaFont - 1}px`,
              lineHeight: 1.4,
              minWidth: 0,
            }}
          >
            {meta.map(([label, value]) => (
              <div key={label}>
                <dt style={{color: 'var(--screen-muted)', letterSpacing: '0.16em'}}>{label}</dt>
                <dd style={{margin: 0, color: 'var(--screen-fg)', overflowWrap: 'anywhere'}}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={{margin: `${layout.blockGap * 0.6}px 0 0`, maxWidth: '62ch'}}>
          {project.description?.length ? (
            <Description blocks={project.description} />
          ) : (
            <p
              style={{
                margin: 0,
                color: 'var(--screen-fg)',
                fontSize: `${layout.bodyFont}px`,
                lineHeight: 1.55,
              }}
            >
              {project.blurb}
            </p>
          )}
        </div>

        <p
          onClick={closeDetail}
          style={{
            margin: `${Math.round(layout.blockGap * 0.8)}px 0 0`,
            color: 'var(--screen-accent)',
            cursor: 'pointer',
            fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
            fontSize: `${layout.metaFont - 1}px`,
            letterSpacing: '0.16em',
          }}
        >
          {/* A phone has no Escape key; the tap is the whole affordance there. */}
          {mobile ? 'BACK' : 'ESC — BACK'}
        </p>
      </div>

      {/*
        The panel scrolls whenever a project has more than a screen of copy, and
        on a phone there is no scrollbar at rest to say so. A sibling of the
        scrolling box, not a child — inside it, it would scroll away.
      */}
      <div style={scrollFade(Math.round(layout.blockGap * 0.8))} />
    </div>
  )
}

/**
 * A way out to the game: a store page, a repository, a trailer.
 *
 * Drawn as a button — a tinted pill with the destination's mark — because it
 * is the one thing on this screen that should be pressed, and underlined text
 * read as a footnote. It lights on hover and darkens while a finger is on it,
 * the vocabulary the caps on the flaps use.
 *
 * A span, not an anchor: the firmware is `aria-hidden` because the page's
 * `.sr-only` landmark already carries every one of these links as a real anchor,
 * and a focusable element inside an `aria-hidden` subtree is a focus trap. The
 * same reasoning the info monitor's icons run on.
 */
function LinkButton({label, url}: {label: string; url: string}) {
  const layout = useFirmwareLayout()
  const [hovered, setHovered] = useState(false)
  const [held, setHeld] = useState(false)
  const glyph = glyphFor(url)
  const box = VIEWBOX[glyph]
  const font = layout.metaFont - 1
  const tint = held ? 34 : hovered ? 24 : 14

  return (
    <span
      onClick={() => {
        setHeld(false)
        openLink(url)
      }}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false)
        setHeld(false)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(font * 0.6)}px`,
        padding: `${Math.round(font * 0.65)}px ${Math.round(font * 1.1)}px`,
        borderRadius: '6px',
        border: '1px solid var(--screen-accent)',
        background: `color-mix(in srgb, var(--screen-accent) ${tint}%, var(--screen-bg))`,
        color: 'var(--screen-fg)',
        cursor: 'pointer',
        fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
        fontSize: `${font}px`,
        letterSpacing: '0.04em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <svg
        aria-hidden
        fill="var(--screen-accent)"
        height={Math.round(font * 1.35)}
        viewBox={`0 0 ${box} ${box}`}
        width={Math.round(font * 1.35)}
      >
        <path d={GLYPHS[glyph]} />
      </svg>
      {label}
    </span>
  )
}
