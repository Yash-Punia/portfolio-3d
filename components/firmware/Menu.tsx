'use client'

import {menuOptions, SECTION_LABELS, type ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'
import {useReducedMotion} from '@/components/console/useReducedMotion'
import {useFirmwareLayout} from '@/components/firmware/layout'
import {transition} from '@/components/firmware/LibraryRail'

/**
 * The screen the boot hands over to: two buttons, one per half of the screen,
 * that go to the Library and to the Timeline.
 *
 * Up and down move the highlight and `Enter` opens it; a click opens the half
 * directly, because a menu that needed two clicks to do one thing would be a
 * menu that behaves worse than the rails under it.
 *
 * A section with nothing published is not offered at all — `menuOptions()` is
 * the single list, and `ConsoleStage` reads the same one for the keys.
 */
export function Menu({content}: {content: ConsoleContent}) {
  const index = useConsole((state) => state.menuIndex)
  const setMenuIndex = useConsole((state) => state.setMenuIndex)
  const setSection = useConsole((state) => state.setSection)
  const reducedMotion = useReducedMotion()
  const layout = useFirmwareLayout()

  const options = menuOptions(content)

  return (
    <div style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
      {options.map((option, position) => {
        const selected = position === index

        return (
          <div
            key={option}
            onClick={() => {
              setMenuIndex(position)
              setSection(option)
            }}
            onPointerEnter={() => setMenuIndex(position)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: `0 ${layout.railX}px`,
              // The two halves are divided by a hairline, not a gap: the screen
              // is one surface split in two, the way a firmware menu is.
              borderTop:
                position === 0
                  ? 'none'
                  : '1px solid color-mix(in srgb, var(--screen-muted) 28%, transparent)',
              background: selected
                ? 'color-mix(in srgb, var(--screen-accent) 12%, var(--screen-bg))'
                : 'var(--screen-bg)',
              ...transition(reducedMotion, 'background-color'),
            }}
          >
            <span
              aria-hidden
              style={{
                color: 'var(--screen-accent)',
                fontFamily: 'var(--font-martian-mono), ui-monospace, monospace',
                fontSize: `${layout.titleFont}px`,
                lineHeight: 1,
                marginRight: `${Math.round(layout.railX * 0.5)}px`,
                opacity: selected ? 1 : 0,
                ...transition(reducedMotion, 'opacity'),
              }}
            >
              ▸
            </span>

            <span
              style={{
                color: selected ? 'var(--screen-fg)' : 'var(--screen-muted)',
                fontSize: `${layout.titleFont}px`,
                fontStretch: '125%',
                fontWeight: 600,
                letterSpacing: '-0.015em',
                lineHeight: 1.02,
              }}
            >
              {SECTION_LABELS[option]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
