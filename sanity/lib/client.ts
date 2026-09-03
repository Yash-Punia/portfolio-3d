import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '@/sanity/env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Published content is served through Next's own cache and invalidated by the
  // Sanity webhook, so the Sanity CDN would only add a second layer of staleness.
  useCdn: false,
})
