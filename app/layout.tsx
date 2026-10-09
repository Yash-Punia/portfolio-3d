import type {Metadata, Viewport} from 'next'
import {Archivo, JetBrains_Mono, Schibsted_Grotesk} from 'next/font/google'

import {siteUrl} from '@/app/site'
import {client} from '@/sanity/lib/client'
import {siteSettingsQuery} from '@/sanity/lib/queries'

import './globals.css'

/**
 * The handheld v2 design's three families (HANDHELD_V2.md): Archivo, narrowed
 * through its width axis, for titles; Schibsted Grotesk for everything a
 * visitor reads; JetBrains Mono for the small counters and the legends printed
 * on the shells — which the 3D side draws into canvases through these same
 * variables.
 */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-schibsted',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

/**
 * `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)` report anything
 * other than zero — the mobile control overlay pads itself off the notch and the
 * home indicator with it (SPEC §6).
 *
 * No `maximumScale` and no `userScalable: false`: the page does not scroll, but
 * blocking pinch-zoom is an accessibility failure (SPEC §11).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * SPEC §11.7. Everything an editor owns comes from `siteSettings`; the shape of
 * the card around it is code.
 *
 * `images` is only set when Yash has uploaded a sharing image in the Studio.
 * Left undefined, Next fills it from `app/opengraph-image.tsx` — so the site
 * always has a card, and a real screenshot replaces the generated one the moment
 * one is published. Twitter inherits the same image for the same reason.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await client.fetch(
    siteSettingsQuery,
    {},
    {cache: 'force-cache', next: {tags: ['siteSettings']}},
  )

  const name = settings?.fullName
  const role = settings?.title
  const title =
    settings?.seo?.metaTitle ?? (name && role ? `${name} — ${role}` : (name ?? undefined))
  const description = settings?.seo?.metaDescription ?? settings?.aboutBody ?? undefined
  const ogImage = settings?.ogImage?.url
    ? [
        {
          url: settings.ogImage.url,
          width: settings.ogImage.width ?? undefined,
          height: settings.ogImage.height ?? undefined,
          alt: title ?? '',
        },
      ]
    : undefined

  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: {canonical: '/'},
    openGraph: {
      type: 'profile',
      url: '/',
      siteName: name ?? undefined,
      title,
      description,
      locale: 'en_GB',
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage,
    },
  }
}

/**
 * The site without JavaScript (SPEC §11.2).
 *
 * The whole portfolio is already in the page — the `.sr-only` landmark carries
 * every project, every timeline entry and every link as real markup, because a
 * crawler and a screen reader need it there. So this is not a second copy of the
 * site: it un-clips the one that is already rendered, lets the page scroll
 * (`body` is `overflow: hidden` for the console's sake), and hides the stage,
 * which without React is an empty gradient.
 */
const NOSCRIPT_CSS = `
  body { overflow: auto; background: #0d0d0c; }
  [role='application'] { display: none; }
  main.sr-only {
    position: static; width: auto; height: auto; margin: 0 auto; padding: 48px 24px 96px;
    max-width: 68ch; clip: auto; clip-path: none; overflow: visible; white-space: normal;
    color: #edece8; font-family: var(--font-schibsted), system-ui, sans-serif; line-height: 1.6;
  }
  main.sr-only a { color: #5fd35a; }
  main.sr-only button { all: unset; font-weight: 600; }
  main.sr-only h1 { font-size: 2rem; margin: 0 0 4px; }
  main.sr-only h2 { font-size: 1.25rem; margin: 40px 0 8px; }
  main.sr-only h3 { font-size: 1rem; margin: 24px 0 4px; }
  main.sr-only dt { color: #8f8d87; font-size: 0.8rem; }
  main.sr-only dd { margin: 0 0 4px; }
`

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${schibsted.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <noscript>
          <style dangerouslySetInnerHTML={{__html: NOSCRIPT_CSS}} />
        </noscript>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
