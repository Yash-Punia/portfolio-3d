import type {Metadata} from 'next'

import {client} from '@/sanity/lib/client'
import {siteSettingsQuery} from '@/sanity/lib/queries'

import './globals.css'

// Fonts land in Phase 4 with the firmware UI: Archivo for display, Martian Mono
// for data (SPEC §10). No family is loaded until something on screen uses one.

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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
