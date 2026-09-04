import {defineArrayMember, defineField, defineType} from 'sanity'

export const timelineEntry = defineType({
  name: 'timelineEntry',
  title: 'Timeline entry',
  type: 'document',

  fields: [
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      description:
        'Whether this is a job or a qualification. Work entries come first on the timeline.',
      options: {
        list: [
          {title: 'Work', value: 'work'},
          {title: 'Education', value: 'education'},
        ],
        layout: 'radio',
      },
      initialValue: 'work',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'organisation',
      title: 'Studio or institution',
      type: 'string',
      description: 'Where this happened, e.g. the studio or university name.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role or degree',
      type: 'string',
      description: 'Your job title, or the name of the qualification.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start',
      type: 'date',
      options: {dateFormat: 'YYYY-MM'},
      description: 'Month and year you started.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End',
      type: 'date',
      options: {dateFormat: 'YYYY-MM'},
      description: 'Month and year you finished. Leave empty if this is still ongoing.',
    }),
    defineField({
      name: 'isCurrent',
      title: 'Ongoing',
      type: 'boolean',
      initialValue: false,
      description: 'Turn on if this is where you are right now.',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'City and country, or "Remote".',
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
      description: 'A short paragraph shown when this entry is selected. Maximum 400 characters.',
      validation: (rule) => rule.required().max(400),
    }),
    defineField({
      name: 'highlights',
      title: 'Highlights',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description:
        'Bullet points: titles shipped, systems you owned, measurable results. One point per line.',
    }),
    defineField({
      name: 'relatedProjects',
      title: 'Related projects',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      description:
        'Projects you worked on here. They appear as chips that jump to the project in the library.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      description: 'Optional logo for the studio or institution.',
    }),
    defineField({
      name: 'result',
      title: 'Result',
      type: 'string',
      description: 'For education: your grade, CGPA, class or honours. Leave empty for jobs.',
    }),
  ],
  orderings: [
    {
      title: 'Most recent first',
      name: 'startDateDesc',
      by: [{field: 'startDate', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'role',
      organisation: 'organisation',
      startDate: 'startDate',
      endDate: 'endDate',
      isCurrent: 'isCurrent',
      media: 'logo',
    },
    prepare({title, organisation, startDate, endDate, isCurrent, media}) {
      const start = typeof startDate === 'string' ? startDate.slice(0, 7) : '?'
      const end = isCurrent ? 'now' : typeof endDate === 'string' ? endDate.slice(0, 7) : '?'
      return {title: `${title} · ${organisation}`, subtitle: `${start} – ${end}`, media}
    },
  },
})
