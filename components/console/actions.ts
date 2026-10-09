import {
  contactRows,
  openLink,
  openRow,
  trailerOf,
  type ConsoleContent,
} from '@/components/console/content'
import {hasRows, SCREENS, type Device} from '@/components/console/device'
import {useConsole} from '@/components/console/store'

/**
 * The console's verbs that have to read the content, in one place so the caps,
 * the keyboard, the page's hidden buttons and the screen's own taps agree.
 *
 * Here rather than in the store because they need the content, and rather than
 * in `content.ts` because that file is imported by the page, which is a Server
 * Component.
 */

/**
 * A, Enter and Space.
 *
 * - Games: the trailer if the game has one, otherwise its page.
 * - A project page: the trailer.
 * - A list (Contact, the handheld's About): the highlighted row.
 */
export function accept(content: ConsoleContent, device: Device) {
  const state = useConsole.getState()

  if (state.screen === 'games') {
    const project = content.projects[state.gameIndex]
    if (!project) return
    const trailer = trailerOf(project)
    if (trailer?.kind === 'link') return openLink(trailer.src)
    if (trailer) return state.playTrailer()
    if (!state.isProjectOpen) state.openProject()
    return
  }

  if (hasRows(state.screen, device)) {
    const row = contactRows(content)[state.rowIndex]
    if (row) openRow(row)
  }
}

/** Y and `D`: the selected game's page. */
export function details(content: ConsoleContent) {
  const state = useConsole.getState()
  if (content.projects[state.gameIndex]) state.openProject()
}

/** MENU, X and `M`: the next tab along. */
export function menu(device: Device) {
  useConsole.getState().nextScreen(SCREENS[device])
}
