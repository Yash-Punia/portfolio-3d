'use client'

import {openLink, type Project} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {urlFor} from '@/sanity/lib/image'

/**
 * The expanded project view (SPEC §16.3, confirmed): `Enter` on a tile opens it
 * in place over the rail, `Escape` closes it, and only then does `Escape` close
 * the console (SPEC §8).
 *
 * Every optional field collapses on its own (SPEC §3.2) — most projects have no
 * `description`, `gallery` or `videoUrl`, and none of those may leave a heading
 * with nothing under it.
 */
const META_LABELS: Array<[string, (project: Project) => string | null]> = [
  ['ROLE', (project) => project.role],
  ['YEAR', (project) => project.year],
  ['ENGINE', (project) => project.engine],
  ['TEAM', (project) => (project.teamSize ? `${project.teamSize}` : null)],
  ['PLATFORMS', (project) => project.platforms?.join(', ') ?? null],
  ['TECH', (project) => project.tech?.join(', ') ?? null],
]

/**
 * Portable Text, rendered as paragraphs and nothing else.
 *
 * `@portabletext/react` exists for this, but it is a dependency added for a
 * field no published project fills in yet, and blocks with spans are the whole
 * of what the schema's editor can produce here. If the field grows lists, links
 * or marks that matter, swap this for the library rather than growing it.
 */
function Description({blocks}: {blocks: NonNullable<Project['description']>}) {
  const layout = useFirmwareLayout()

  return (
    <>
      {blocks.map((block) => {
        const text = block.children?.map((span) => span.text ?? '').join('') ?? ''
        if (!text) return null

        const heading = block.style && block.style !== 'normal' && block.style !== 'blockquote'

        return (
          <p
            key={block._key}
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
        )
      })}
    </>
  )
}

export function Detail({project}: {project: Project}) {
  const closeDetail = useConsole((state) => state.closeDetail)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()

  const cover = project.cover?.asset
    ? urlFor(project.cover).width(1100).height(440).fit('crop').auto('format').url()
    : null
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
      <div style={{overflowY: 'auto', padding: `0 ${layout.railX}px 48px`}}>
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element -- inside a drei
             <Html> subtree; Sanity's CDN already sizes and re-formats it. */
          <img
            alt=""
            src={cover}
            style={{
              display: 'block',
              width: '100%',
              height: `${layout.detailCoverHeight}px`,
              objectFit: 'cover',
              marginTop: `${layout.railTop}px`,
              borderRadius: '4px',
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
          {META_LABELS.map(([label, read]) => {
            const value = read(project)
            if (!value) return null

            return (
              <div key={label} style={{display: 'contents'}}>
                <dt style={{color: 'var(--screen-muted)', letterSpacing: '0.16em'}}>{label}</dt>
                <dd style={{margin: 0, color: 'var(--screen-fg)'}}>{value}</dd>
              </div>
            )
          })}
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
          ESC — BACK
        </p>
      </div>
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
