import {openLink, trailerOf, type ConsoleContent, type Project} from '@/components/console/content'
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
 * Open a game: its page, with the trailer already playing when it can play
 * inline. A trailer that is only a link (no embed) leaves the page on its
 * cover, where "Play trailer" opens the link — a new tab is never a surprise.
 */
export function openGame(project: Project) {
  const state = useConsole.getState()
  const trailer = trailerOf(project)
  if (trailer && trailer.kind !== 'link') return state.playTrailer()
  state.openProject()
}

/**
 * A, Enter and Space.
 *
 * - Games: open the selected game (`openGame`).
 * - A project page: the trailer.
 * - About: nothing — ▲ ▼ already open a row, and the links are taps.
 */
export function accept(content: ConsoleContent) {
  const state = useConsole.getState()
  if (state.screen !== 'games') return

  const project = content.projects[state.gameIndex]
  if (!project) return
  if (!state.isProjectOpen) return openGame(project)

  const trailer = trailerOf(project)
  if (trailer?.kind === 'link') return openLink(trailer.src)
  if (trailer) state.playTrailer()
}
