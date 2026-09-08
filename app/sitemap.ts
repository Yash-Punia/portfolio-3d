import type {MetadataRoute} from 'next'

import {siteUrl} from '@/app/site'

/**
 * SPEC §11.8. The site is one page: the console holds every project and every
 * timeline entry, and none of them has a URL of its own. So the sitemap has one
 * entry, and it is honest — listing routes that do not exist is how a sitemap
 * starts costing crawl budget instead of saving it.
 *
 * `/studio` is deliberately absent, and `robots.ts` disallows it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl()}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
