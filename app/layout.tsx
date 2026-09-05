import type {Metadata} from 'next'
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

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${archivo.variable} ${martianMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
