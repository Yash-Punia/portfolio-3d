import type {Metadata, Viewport} from 'next'
import {Archivo, Martian_Mono} from 'next/font/google'

import {client} from '@/sanity/lib/client'
import {siteSettingsQuery} from '@/sanity/lib/queries'

import './globals.css'

/**
 * SPEC §10's two families, and only these two. Archivo carries display and UI —
 * its width axis is why it is here — and Martian Mono carries data. They arrive
 * in Phase 3 rather than Phase 4 because the info monitor on the left flap is
 * the first surface with text on it.
 */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const martianMono = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian-mono',
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await client.fetch(
    siteSettingsQuery,
    {},
    {cache: 'force-cache', next: {tags: ['siteSettings']}},
  )

  const name = settings?.fullName
  const role = settings?.title

  return {
    title: settings?.seo?.metaTitle ?? (name && role ? `${name} — ${role}` : (name ?? undefined)),
    description: settings?.seo?.metaDescription ?? settings?.aboutBody ?? undefined,
  }
}

/**
 * The stored theme, applied before the first paint.
 *
 * The stage is painted from `--stage` in CSS and `ConsoleStage` sets
 * `data-stage` from the store — but that is a hydration away, so a returning
 * visitor who chose light used to see one dark frame first. This reads the same
 * key the store persists to and stamps the attribute while the parser is still
 * in the head.
 *
 * Only the stage. The screen's palette lives inside the canvas, which does not
 * exist before hydration, and `useTheme()` remains the source of truth for it.
 */
const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem('console')).state.theme;if(t==='dark'||t==='light')document.documentElement.dataset.stage=t}catch(e){}`

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${archivo.variable} ${martianMono.variable} h-full antialiased`}>
      <head>
        {/* Blocking on purpose: after the first paint it would be too late. */}
        <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT}} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
