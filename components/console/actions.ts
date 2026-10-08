'use client'

import type {ConsoleContent} from '@/components/console/content'
import {useConsole} from '@/components/console/store'

/**
 * The accept verb — the A button, and `Enter`/`Space`.
 *
 * It lives here rather than in the store because it is the one navigation
 * action that has to read the content: whether the rail's selection is a real
 * project. And it lives here rather than in `content.ts` because that file is
 * imported by the page, which is a Server Component — importing the store there
 * would pull zustand into the server bundle for nothing.
 *
 * `back()` and `jump()` need no content, so they are store actions.
 */
export function accept(content: ConsoleContent) {
  const {isOpen, open, isDetailOpen, section, libraryIndex, openDetail} = useConsole.getState()

  if (!isOpen) return open()
  // A detail view is the bottom of the stack: there is nothing further in.
  if (isDetailOpen) return

  // A timeline entry has nothing to drill into — its detail is already on
  // screen — so accept stays a no-op there.
  if (section === 'library' && content.projects[libraryIndex]) openDetail()
}
