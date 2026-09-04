import {defineArrayMember, defineField, defineType} from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',

  groups: [
    {name: 'main', title: 'Main', default: true},
    {name: 'details', title: 'Details'},
    {name: 'media', title: 'Media'},
    {name: 'links', title: 'Links'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'main',
      description: 'The name of the game or project.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'main',
      options: {source: 'title', maxLength: 96},
      description: 'Click Generate to build this from the title. Used in links to this project.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Position in the library',
      type: 'number',
      group: 'main',
      description:
        'Lower numbers sit closer to the About tile, so 1 is the first project a visitor sees.',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'blurb',
      title: 'Short description',
      type: 'text',
      rows: 3,
      group: 'main',
      description:
        'The two or three lines shown next to the selected tile. Between 90 and 200 characters — shorter looks empty, longer overflows the screen.',
      validation: (rule) => rule.required().min(90).max(200),
    }),
    defineField({
      name: 'description',
      title: 'Full description',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'block'})],
      description: 'Optional longer write-up shown when the project is opened.',
    }),
    defineField({
      name: 'role',
      title: 'Your role',
      type: 'string',
      group: 'details',
      description: 'What you did on this project, e.g. "Gameplay Programmer" or "Solo Developer".',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'string',
      group: 'details',
      description: 'When you worked on it, e.g. "2024" or "2023–24".',
    }),
    defineField({
      name: 'engine',
      title: 'Engine',
      type: 'string',
      group: 'details',
      options: {
        list: [
          {title: 'Unity', value: 'Unity'},
          {title: 'Unreal', value: 'Unreal'},
          {title: 'Godot', value: 'Godot'},
          {title: 'Custom engine', value: 'Custom'},
          {title: 'Other', value: 'Other'},
        ],
      },
      description: 'What the project was built in.',
    }),
    defineField({
      name: 'tech',
      title: 'Technology',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      description:
        'Languages, systems and techniques, one per tag, e.g. C#, DOTS, Netcode, Behaviour Trees.',
    }),
    defineField({
      name: 'platforms',
      title: 'Platforms',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'string'})],
      options: {
        list: [
          {title: 'PC', value: 'PC'},
          {title: 'Web', value: 'Web'},
          {title: 'Android', value: 'Android'},
          {title: 'iOS', value: 'iOS'},
          {title: 'Console', value: 'Console'},
        ],
      },
      description: 'Where the project can be played.',
    }),
    defineField({
      name: 'cover',
      title: 'Cover image',
      type: 'image',
      group: 'media',
      options: {hotspot: true},
      description:
        'The tile artwork. Landscape, at least 1200×675 pixels. Use the crop tool to choose what stays visible when the tile is small.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
      description: 'Optional extra screenshots shown when the project is opened.',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Trailer',
      type: 'url',
      group: 'media',
      description: 'Optional YouTube or Vimeo link.',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      group: 'links',
      description: 'Itch page, GitHub repository, store page, devlog — anything worth linking to.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'projectLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What the link says, e.g. "Play on itch.io".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Link address',
              type: 'url',
              description: 'The full address, including https://',
              validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
            }),
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        }),
      ],
    }),
    defineField({
      name: 'teamSize',
      title: 'Team size',
      type: 'number',
      group: 'details',
      description: 'How many people worked on it. Leave empty to hide.',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'main',
      initialValue: false,
      description: 'Mark your strongest work. Featured projects can be highlighted on the screen.',
    }),
  ],
  orderings: [
    {
      title: 'Library position',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'title', subtitle: 'role', media: 'cover', order: 'order'},
    prepare({title, subtitle, media, order}) {
      return {
        title: typeof order === 'number' ? `${order}. ${title}` : title,
        subtitle,
        media,
      }
    },
  },
})
