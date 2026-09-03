'use client'

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {dataset, projectId} from '@/sanity/env'
import {schemaTypes} from '@/sanity/schemaTypes'

/** There is exactly one of these, edited in place rather than created. */
const SINGLETON = 'siteSettings'

export default defineConfig({
  name: 'default',
  title: 'Yash Punia — Portfolio',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Keep "Site settings" out of the global create menu — there is only ever one.
    templates: (prev) => prev.filter((template) => template.schemaType !== SINGLETON),
  },
  document: {
    newDocumentOptions: (prev) => prev.filter((item) => item.templateId !== SINGLETON),
  },
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site settings')
              .id(SINGLETON)
              .child(S.document().schemaType(SINGLETON).documentId(SINGLETON)),
            S.divider(),
            S.documentTypeListItem('project').title('Projects'),
            S.documentTypeListItem('timelineEntry').title('Timeline'),
            S.documentTypeListItem('socialLink').title('Social links'),
          ]),
    }),
  ],
})
