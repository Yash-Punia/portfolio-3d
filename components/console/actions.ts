'use client'

import {menuChoice, type ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'

/**
 * The accept verb — the A button, and `Enter`/`Space`.
 *
 * It lives here rather than in the store because it is the one navigation
 * action that has to read the content: which section the menu's highlight
 * stands for, and whether the rail's selection is a real project. And it lives
 * here rather than in `content.ts` because that file is
 * imported by the page, which is a Server Component — importing the store there
 * would pull zustand into the server bundle for nothing.
 *
 * `back()` and `jump()` need no content, so they are store actions.
 */
export function accept(content: ConsoleContent) {
  const {isOpen, open, isDetailOpen, section, menuIndex, libraryIndex, setSection, openDetail} =
    useConsole.getState()

  if (!isOpen) return open()
  // A detail view is the bottom of the stack: there is nothing further in.
  if (isDetailOpen) return

  if (section === 'menu') {
    const target = menuChoice(content, menuIndex)
    if (target) setSection(target)
    return
  }

  // A timeline entry has nothing to drill into — its detail is already on
  // screen — so accept stays a no-op there.
  if (section === 'library' && content.projects[libraryIndex]) openDetail()
}
