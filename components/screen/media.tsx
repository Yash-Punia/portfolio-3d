'use client'

import {useEffect, useState, type CSSProperties} from 'react'

import type {Project} from '@/components/console/content'
import {useT} from '@/components/console/tune'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {urlFor} from '@/sanity/lib/image'

/**
 * Images on the screen.
 *
 * `next/image` is deliberately not used: these elements live inside a drei
 * `<Html>` subtree in the canvas, and Sanity's CDN already does the resizing and
 * format negotiation the optimiser would add. What is kept from it is the LQIP
 * placeholder and an explicit intrinsic size. Everything is requested at twice
 * its authored size, because the panel is drawn at up to 2× on a retina glass.
 */
type Source = Parameters<typeof urlFor>[0]

function imageUrl(source: Source, width: number, height: number): string {
  return urlFor(source)
    .width(width * 2)
    .height(height * 2)
    .fit('crop')
    .auto('format')
    .url()
}

const FILL: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

/**
 * A project's cover at a given authored size, or a quiet panel with nothing on
 * it when the field is empty — the title is always set beside it, so a blank
 * frame is not a broken one.
 */
export function Cover({
  project,
  width,
  height,
  eager = false,
}: {
  project: Project
  width: number
  height: number
  eager?: boolean
}) {
  if (!project.cover?.asset) {
    return <div style={{...FILL, background: 'linear-gradient(160deg, #262625, #121211)'}} />
  }

  const lqip = project.cover.lqip
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- see above */
    <img
      alt=""
      decoding="async"
      draggable={false}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      src={imageUrl(project.cover, width, height)}
      style={{...FILL, ...(lqip ? {background: `url(${lqip}) center / cover no-repeat`} : {})}}
      width={width}
    />
  )
}

/** One image from a project's gallery. */
export function GalleryImage({
  image,
  width,
  height,
}: {
  image: NonNullable<Project['gallery']>[number]
  width: number
  height: number
}) {
  if (!image.asset) return null
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- see above */
    <img
      alt=""
      decoding="async"
      draggable={false}
      height={height}
      loading="lazy"
      src={imageUrl(image, width, height)}
      style={FILL}
      width={width}
    />
  )
}

/**
 * Whether the selection has rested on a game long enough for its preview clip
 * to play. Any move restarts the wait, and reduced motion never plays it — the
 * clip is decoration, the cover already says what the game is.
 */
export function useDwell(key: string | undefined, enabled: boolean): boolean {
  const reducedMotion = useReducedMotion()
  const delay = useT().scrPreviewDelayMs
  const [rested, setRested] = useState<string | null>(null)

  useEffect(() => {
    if (!key || !enabled || reducedMotion) return
    const timer = setTimeout(() => setRested(key), delay)
    return () => clearTimeout(timer)
  }, [key, enabled, reducedMotion, delay])

  return enabled && !reducedMotion && rested === key
}

/**
 * The key art: the cover, full-bleed, and — once the selection has rested on it
 * — the project's preview clip fading in over it. A GIF is an `<img>`, anything
 * else a muted looping `<video>`. It fades in only once it has frames, so a slow
 * clip never blanks the cover.
 */
export function KeyArt({
  project,
  width,
  height,
}: {
  project: Project
  width: number
  height: number
}) {
  const clip = project.preview?.url ? project.preview : null
  const playing = useDwell(project._id, Boolean(clip))

  return (
    <>
      <Cover eager height={height} project={project} width={width} />
      {playing && clip?.url ? (
        <Clip key={clip.url} mimeType={clip.mimeType} url={clip.url} />
      ) : null}
    </>
  )
}

function Clip({url, mimeType}: {url: string; mimeType: string | null}) {
  const [shown, setShown] = useState(false)
  const style: CSSProperties = {
    ...FILL,
    opacity: shown ? 1 : 0,
    transition: 'opacity 400ms ease',
  }

  if (mimeType !== 'image/gif') {
    return (
      <video
        autoPlay
        loop
        muted
        onLoadedData={() => setShown(true)}
        playsInline
        src={url}
        style={style}
      />
    )
  }

  /* eslint-disable-next-line @next/next/no-img-element -- an optimiser would hand
     back a GIF's first frame. */
  return <img alt="" onLoad={() => setShown(true)} src={url} style={style} />
}
