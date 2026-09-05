'use client'

import {useMemo} from 'react'

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
}

export function deriveFirmwareLayout(t: Tuning): FirmwareLayout {
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
  }
}

export function useFirmwareLayout(): FirmwareLayout {
  const values = useTuning((state) => state.values)
  return useMemo(() => deriveFirmwareLayout(values), [values])
}
