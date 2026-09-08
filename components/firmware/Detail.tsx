'use client'

import {
  descriptionParagraphs,
  openLink,
  projectMeta,
  type Project,
} from '@/components/console/content'
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

export function Detail({project}: {project: Project}) {
  const closeDetail = useConsole((state) => state.closeDetail)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()
  const mobile = useIsMobile()

  const art = cover(project, 1100, 440)
  const links = project.links?.filter((link) => link.url) ?? []

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
      <div data-console-scroll style={{...scrollBox(mobile), padding: `0 ${layout.railX}px 48px`}}>
        {art ? (
          /* eslint-disable-next-line @next/next/no-img-element -- see cover.ts:
             inside a drei <Html> subtree; Sanity's CDN already sizes and
             re-formats it. */
          <img
            alt=""
            src={art.src}
            width={art.width}
            height={art.height}
            // The detail view only exists once someone has asked for it, so its
            // cover is never a deferred load — it is the thing they asked for.
            decoding="async"
            style={{
              display: 'block',
              width: '100%',
              height: `${layout.detailCoverHeight}px`,
              objectFit: 'cover',
              marginTop: `${layout.railTop}px`,
              borderRadius: '4px',
              ...placeholder(art.lqip),
            }}
          />
        ) : null}

        <h2
          style={{
            margin: `${layout.blockGap}px 0 0`,
            color: 'var(--screen-fg)',
            fontSize: `${layout.titleFont + 4}px`,
            fontStretch: '125%',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            lineHeight: 1.02,
          }}
        >
          {project.title}
        </h2>

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: '22px',
            rowGap: '8px',
            margin: `${layout.blockGap}px 0 0`,
            fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
            fontSize: `${layout.metaFont - 1}px`,
            lineHeight: 1.5,
          }}
        >
          {projectMeta(project).map(([label, value]) => (
            <div key={label} style={{display: 'contents'}}>
              <dt style={{color: 'var(--screen-muted)', letterSpacing: '0.16em'}}>{label}</dt>
              <dd style={{margin: 0, color: 'var(--screen-fg)'}}>{value}</dd>
            </div>
          ))}
        </dl>

        <div style={{margin: `${Math.round(layout.blockGap * 1.15)}px 0 0`, maxWidth: '62ch'}}>
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

        {project.videoUrl ? (
          <p style={{margin: `${Math.round(layout.textGap * 1.35)}px 0 0`}}>
            <Link label="Watch the trailer" url={project.videoUrl} />
          </p>
        ) : null}

        {links.length > 0 ? (
          <ul
            style={{
              margin: `${layout.blockGap}px 0 0`,
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gap: '10px',
            }}
          >
            {links.map((link) => (
              <li key={link.url}>
                <Link label={link.label ?? link.url ?? ''} url={link.url as string} />
              </li>
            ))}
          </ul>
        ) : null}

        <p
          onClick={closeDetail}
          style={{
            margin: `${Math.round(layout.blockGap * 1.45)}px 0 0`,
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
 * A span, not an anchor: the firmware is `aria-hidden` because the page's
 * `.sr-only` landmark already carries every one of these links as a real anchor,
 * and a focusable element inside an `aria-hidden` subtree is a focus trap. The
 * same reasoning the info monitor's resume link runs on.
 */
function Link({label, url}: {label: string; url: string}) {
  const layout = useFirmwareLayout()

  return (
    <span
      onClick={() => openLink(url)}
      style={{
        color: 'var(--screen-fg)',
        cursor: 'pointer',
        fontSize: `${layout.bodyFont - 2}px`,
        textDecoration: 'underline',
        textDecorationColor: 'var(--screen-accent)',
        textUnderlineOffset: '5px',
      }}
    >
      {label}
    </span>
  )
}
