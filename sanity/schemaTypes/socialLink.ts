import {LinkIcon} from '@sanity/icons'
import {defineField, defineType, type ValidationContext} from 'sanity'

/**
 * Only one document may claim a given platform or face-button slot: the console
 * has exactly four buttons, so a duplicate would silently shadow another link.
 */
function unique(field: 'platform' | 'buttonSlot') {
  return async (value: string | undefined, context: ValidationContext) => {
    if (!value) return true
    const {document, getClient} = context
    if (!document) return true
    const id = document._id.replace(/^drafts\./, '')
    const taken = await getClient({apiVersion: '2024-10-01'}).fetch<boolean>(
      `defined(*[_type == "socialLink" && ${field} == $value && !(_id in [$id, $draftId])][0]._id)`,
      {value, id, draftId: `drafts.${id}`},
    )
    return taken
      ? `Another link already uses this ${field === 'platform' ? 'platform' : 'button'}.`
      : true
  }
}

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      description: 'Which site this link points to. Each platform can only be used once.',
      options: {
        list: [
          {title: 'itch.io', value: 'itch'},
          {title: 'GitHub', value: 'github'},
          {title: 'X (Twitter)', value: 'twitter'},
          {title: 'LinkedIn', value: 'linkedin'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().custom(unique('platform')),
    }),
    defineField({
      name: 'url',
      title: 'Link address',
      type: 'url',
      description: 'The full address, including https://',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'buttonSlot',
      title: 'Console button',
      type: 'string',
      description:
        'Which button on the console opens this link. A is right, B is bottom, X is top, Y is left. Each button can only be used once.',
      options: {
        list: [
          {title: 'A (right)', value: 'A'},
          {title: 'B (bottom)', value: 'B'},
          {title: 'X (top)', value: 'X'},
          {title: 'Y (left)', value: 'Y'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().custom(unique('buttonSlot')),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description:
        'Short name shown in the tooltip and read aloud by screen readers, e.g. "itch.io profile".',
    }),
  ],
  preview: {
    select: {title: 'label', platform: 'platform', subtitle: 'url', slot: 'buttonSlot'},
    prepare({title, platform, subtitle, slot}) {
      return {
        title: `${slot ? `${slot} — ` : ''}${title || platform || 'Social link'}`,
        subtitle,
      }
    },
  },
})
