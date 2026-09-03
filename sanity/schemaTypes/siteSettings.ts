import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'identity', title: 'Identity', default: true},
    {name: 'about', title: 'About tile'},
    {name: 'resume', title: 'Resume'},
    {name: 'seo', title: 'Search & sharing'},
  ],
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full name',
      type: 'string',
      group: 'identity',
      description: 'Your name, shown on the small monitor inside the left flap.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Job title',
      type: 'string',
      group: 'identity',
      description: 'Shown under your name, e.g. "Gameplay Programmer".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'statusLine',
      title: 'Status line',
      type: 'string',
      group: 'identity',
      description:
        'Optional short line on the monitor, e.g. "Open to work". Leave empty to hide it.',
    }),
    defineField({
      name: 'aboutHeadline',
      title: 'About headline',
      type: 'string',
      group: 'about',
      description:
        'Optional one-line headline at the top of the About tile. Maximum 60 characters. Leave empty and the tile shows the about text on its own.',
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: 'aboutBody',
      title: 'About text',
      type: 'text',
      rows: 5,
      group: 'about',
      description:
        'Two or three sentences about you. Maximum 320 characters — anything longer will not fit the About tile on the screen.',
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: 'resumeFile',
      title: 'Resume PDF',
      type: 'file',
      group: 'resume',
      options: {accept: '.pdf'},
      description:
        'Upload a PDF to replace the one bundled with the site. You can swap this any time without a redeploy.',
    }),
    defineField({
      name: 'resumeLabel',
      title: 'Resume button label',
      type: 'string',
      group: 'resume',
      initialValue: 'Download CV',
      description: 'Text on the resume button inside the left flap.',
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      group: 'identity',
      options: {hotspot: true},
      description: 'Optional photo. Click the crop tool to choose which part stays visible.',
    }),
    defineField({
      name: 'seo',
      title: 'Search & sharing',
      type: 'object',
      group: 'seo',
      description: 'How the site appears in Google results and when the link is shared.',
      fields: [
        defineField({
          name: 'metaTitle',
          title: 'Page title',
          type: 'string',
          description: 'Shown in the browser tab and as the headline in search results.',
        }),
        defineField({
          name: 'metaDescription',
          title: 'Page description',
          type: 'text',
          rows: 3,
          description:
            'The paragraph under the title in search results. Aim for 150–160 characters.',
          validation: (rule) => rule.max(160),
        }),
        defineField({
          name: 'ogImage',
          title: 'Sharing image',
          type: 'image',
          description:
            'Optional image used when the link is shared on social media. Landscape, at least 1200×630.',
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'fullName', subtitle: 'title', media: 'avatar'},
  },
})
