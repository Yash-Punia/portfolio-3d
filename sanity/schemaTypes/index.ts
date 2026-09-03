import type {SchemaTypeDefinition} from 'sanity'

import {project} from './project'
import {siteSettings} from './siteSettings'
import {socialLink} from './socialLink'
import {timelineEntry} from './timelineEntry'

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  socialLink,
  project,
  timelineEntry,
]
