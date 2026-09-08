import type {MetadataRoute} from 'next'

import {siteUrl} from '@/app/site'

/**
 * SPEC §11.8. Everything is open except the Studio, which is Yash's editor: it
 * is behind a Sanity login, it has nothing a searcher wants, and a crawler
 * walking it only wastes requests on a login screen. The Studio route also sets
 * `robots: {index: false}` in its own metadata, so it says the same thing twice
 * — a `Disallow` is a request, and the meta tag is what a crawler that ignores
 * one still has to honour.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{userAgent: '*', allow: '/', disallow: '/studio'}],
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
