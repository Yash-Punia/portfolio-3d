'use client'

import {useMemo} from 'react'

import {useIsMobile} from '@/components/console/mobile'
import {useTuning, type Tuning} from '@/components/console/tuning'

/**
 * The firmware's layout, derived from the tuning values — the same arrangement
 * `spec.ts` gives the console's geometry, so the UI on the screen can be dialled
 * in from the browser alongside the object it sits in (`?tune`).
 *
 * Everything here is CSS pixels in the panel's own authored space. The panel is
 * laid out at `panelWidth` and then scaled onto the glass, so these are fixed
 * ratios of the screen rather than sizes that have to be re-guessed whenever the
 * console is retuned. The height is not a knob: it follows the screen's own
 * aspect, because a panel of any other shape would not land on the glass.
 */
export interface FirmwareLayout {
  panelWidth: number
  panelHeight: number
  statusHeight: number
  statusFont: number
  railX: number
  railTop: number
  tileWidth: number
  tileHeight: number
  tileGap: number
  /** Title on a tile that has no cover art. Follows the tile, not a knob. */
  tileFont: number
  selectedScale: number
  unselectedOpacity: number
  blockGap: number
  textGap: number
  titleFont: number
  metaFont: number
  bodyFont: number
  detailCoverHeight: number
  axisTop: number
  dotGap: number
  dotSize: number
  entryGap: number
}

/**
 * The panel's own values on a phone (SPEC §6).
 *
 * The desktop panel is authored at 900px and lands on a ~560px glass; on a
 * phone the whole console is in frame and the glass is nearer 315px. Shrinking
 * the desktop numbers by a single factor would put body text at 6px — and
 * raising the factor to fix that clips the stack, because the panel's height
 * follows the screen's aspect and does not grow with it. The ratios have to
 * differ per value: type shrinks by about a fifth, whitespace by four fifths.
 * So the mobile panel is re-authored rather than scaled, and it is a table
 * because that is all it is.
 *
 * `fwPanelWidth` is set close to that 315px so the panel is scaled by roughly
 * one on the way to the glass and the sizes below are, near enough, the sizes
 * that reach the visitor's eye.
 *
 * ponytail: a const, dialled by editing at 390px with the dev server hot
 * reloading. It moves into the tuning store the day it needs live knobs.
 */
const MOBILE: Partial<Tuning> = {
  fwPanelWidth: 320,
  fwStatusHeight: 34,
  fwStatusFont: 10,
  fwRailX: 18,
  fwRailTop: 14,
  fwTileWidth: 150,
  fwTileHeight: 84,
  fwTileGap: 18,
  fwBlockGap: 16,
  fwTextGap: 7,
  fwTitleFont: 22,
  fwMetaFont: 11,
  fwBodyFont: 13,
  fwDetailCoverHeight: 88,
  fwAxisTop: 36,
  /*
    Each dot carries two lines of words, not just the dot: `2026 / 03` above it
    and an organisation below. At 82 the label was nearly the whole gap and
    every name of more than one word wrapped, so the axis read as a wall rather
    than as a row of stops.
  */
  fwDotGap: 132,
  fwDotSize: 10,
  fwEntryGap: 22,
}

export function deriveFirmwareLayout(tuning: Tuning, mobile = false): FirmwareLayout {
  const t = mobile ? {...tuning, ...MOBILE} : tuning

  return {
    panelWidth: t.fwPanelWidth,
    panelHeight: Math.round((t.fwPanelWidth * t.screenHeight) / t.screenWidth),
    statusHeight: t.fwStatusHeight,
    statusFont: t.fwStatusFont,
    railX: t.fwRailX,
    railTop: t.fwRailTop,
    tileWidth: t.fwTileWidth,
    tileHeight: t.fwTileHeight,
    tileGap: t.fwTileGap,
    tileFont: Math.round(t.fwTileWidth * 0.1),
    selectedScale: t.fwSelectedScale,
    unselectedOpacity: t.fwUnselectedOpacity,
    blockGap: t.fwBlockGap,
    textGap: t.fwTextGap,
    titleFont: t.fwTitleFont,
    metaFont: t.fwMetaFont,
    bodyFont: t.fwBodyFont,
    detailCoverHeight: t.fwDetailCoverHeight,
    axisTop: t.fwAxisTop,
    dotGap: t.fwDotGap,
    dotSize: t.fwDotSize,
    entryGap: t.fwEntryGap,
  }
}

/**
 * Every firmware component reads its sizes from here, so the mobile table
 * reaches all of them — both mounts, no component changed.
 */
export function useFirmwareLayout(): FirmwareLayout {
  const values = useTuning((state) => state.values)
  const mobile = useIsMobile()
  return useMemo(() => deriveFirmwareLayout(values, mobile), [values, mobile])
}
