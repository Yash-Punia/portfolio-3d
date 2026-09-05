import type {Tuning} from '@/components/console/tuning'

/**
 * The console's geometry, derived from the tuning values.
 *
 * Everything here is a pure function of `Tuning` so the whole form can be
 * rebuilt when a value changes in the browser (see `<TuningPanel>`). Nothing
 * reads the store directly — `useSpec()` in `spec.ts` does that once.
 */

/** Values that have never needed tuning stay constants rather than controls. */
const PANEL_DEPTH = 0.032
const PANEL_RADIUS = 0.05
const SEAM_BAND_DEPTH = 0.009
const HINGE_LENGTH_INSET = 0.66
const HINGE_RING_HEIGHT = 0.055
const CLOSE_CAP_HEIGHT = 0.055
const CLOSE_TRAVEL = 0.022
const APERTURE_RADIUS = 0.06
const MONITOR_BEZEL = 0.05
const MONITOR_DEPTH = 0.022
const BUTTON_CAP_HEIGHT = 0.05
const BUTTON_HOUSING_DEPTH = 0.022
const BUTTON_TRAVEL = 0.018
/** SPEC §5: the joystick tilts to ~18°, with a deadzone of 25% of its radius. */
const JOYSTICK_MAX_TILT = (18 * Math.PI) / 180
const JOYSTICK_DEADZONE = 0.25
const SLIDER_DEPTH = 0.02
/** SPEC §5: the nub travels ~60% of its housing width, so ±30% from centre. */
const SLIDER_TRAVEL_FRACTION = 0.3

export interface Dimensions {
  body: {width: number; height: number; depth: number; radius: number}
  face: {depth: number; apertureWidth: number; apertureHeight: number; apertureRadius: number}
  screen: {width: number; height: number}
  flap: {width: number; height: number; depth: number; radius: number; inset: number}
  seam: {gap: number; bandWidth: number; bandDepth: number}
  panel: {depth: number; margin: number; radius: number}
  hinge: {radius: number; length: number; ringRadius: number; ringHeight: number}
  closeButton: {
    capRadius: number
    capHeight: number
    housingRadius: number
    housingDepth: number
    y: number
    travel: number
  }
  /** Info monitor panel on the left flap's inner face. */
  monitor: {width: number; height: number; y: number; depth: number; bezel: number}
  joystick: {
    y: number
    capRadius: number
    capHeight: number
    wellRadius: number
    wellDepth: number
    collarRadius: number
    collarHeight: number
    stemRadius: number
    stemHeight: number
    maxTilt: number
    deadzone: number
  }
  /** ABXY diamond on the right flap: X top, A right, B bottom, Y left. */
  abxy: {
    y: number
    spacing: number
    capRadius: number
    capHeight: number
    housingRadius: number
    housingDepth: number
    travel: number
    glyphSize: number
    ringRadius: number
    ringTube: number
  }
  /** Power slider on the body's lower bezel, with its LED. */
  slider: {
    y: number
    width: number
    height: number
    depth: number
    nubWidth: number
    nubHeight: number
    nubDepth: number
    travel: number
    ledRadius: number
    ledOffset: number
  }
  /** Inner face of a flap, in flap-local space — where the controls sit. */
  faceZ: number
  /** Front face of the body core, the front of the face frame, and the closed flap. */
  z: {bodyFront: number; faceFront: number; flapClosed: number; flapFront: number}
  /** X of the hinge axis (the flap's outer edge) and of the visible hinge post. */
  hingeX: number
  hingePostX: number
  openAngle: number
  /** Footprints the camera zoom is derived from. */
  closed: {width: number; height: number}
  open: {width: number; height: number}
}

export function deriveDimensions(t: Tuning): Dimensions {
  const openAngle = (t.openAngleDeg * Math.PI) / 180

  const apertureWidth = t.screenWidth + t.bezelPadding * 2
  const apertureHeight = t.screenHeight + t.bezelPadding * 2

  /**
   * The flaps are inset from the body outline so the body's rim shows around
   * them. Viewed dead-on under an orthographic camera, coplanar faces render as
   * one flat silhouette — the rim, the step down to it and the groove between
   * the doors are what give the closed console any depth at all.
   */
  const flapWidth = (t.bodyWidth - t.flapInset * 2 - t.seamGap) / 2
  const flapHeight = t.bodyHeight - t.flapInset * 2

  const bodyFront = t.bodyDepth / 2
  const faceFront = bodyFront + t.faceDepth
  const hingeX = t.bodyWidth / 2 - t.flapInset

  return {
    body: {width: t.bodyWidth, height: t.bodyHeight, depth: t.bodyDepth, radius: t.bodyRadius},
    face: {
      depth: t.faceDepth,
      apertureWidth,
      apertureHeight,
      apertureRadius: APERTURE_RADIUS,
    },
    screen: {width: t.screenWidth, height: t.screenHeight},
    flap: {
      width: flapWidth,
      height: flapHeight,
      depth: t.flapDepth,
      radius: t.flapRadius,
      inset: t.flapInset,
    },
    seam: {gap: t.seamGap, bandWidth: t.seamBandWidth, bandDepth: SEAM_BAND_DEPTH},
    panel: {depth: PANEL_DEPTH, margin: t.panelMargin, radius: PANEL_RADIUS},
    hinge: {
      radius: t.flapInset / 2 - 0.004,
      length: t.bodyHeight - HINGE_LENGTH_INSET,
      ringRadius: t.flapInset / 2 + 0.004,
      ringHeight: HINGE_RING_HEIGHT,
    },
    closeButton: {
      capRadius: t.closeButtonRadius,
      capHeight: CLOSE_CAP_HEIGHT,
      housingRadius: t.closeButtonRadius * 1.42,
      housingDepth: 0.024,
      y: -flapHeight / 2 + t.closeButtonY,
      travel: CLOSE_TRAVEL,
    },
    monitor: {
      width: flapWidth - t.panelMargin * 2,
      height: t.monitorHeight,
      y: t.monitorY,
      depth: MONITOR_DEPTH,
      bezel: MONITOR_BEZEL,
    },
    joystick: {
      y: t.joystickY,
      capRadius: t.joystickRadius,
      capHeight: t.joystickRadius * 0.34,
      wellRadius: t.joystickRadius * 1.62,
      wellDepth: 0.03,
      collarRadius: t.joystickRadius * 1.34,
      collarHeight: 0.026,
      stemRadius: t.joystickRadius * 0.46,
      stemHeight: t.joystickRadius * 0.6,
      maxTilt: JOYSTICK_MAX_TILT,
      deadzone: JOYSTICK_DEADZONE,
    },
    abxy: {
      y: t.abxyY,
      spacing: t.abxySpacing,
      capRadius: t.abxyRadius,
      capHeight: BUTTON_CAP_HEIGHT,
      housingRadius: t.abxyRadius * 1.45,
      housingDepth: BUTTON_HOUSING_DEPTH,
      travel: BUTTON_TRAVEL,
      glyphSize: t.abxyRadius * 1.15,
      ringRadius: t.abxyRadius * 1.72,
      ringTube: 0.013,
    },
    slider: {
      y: t.sliderY,
      width: t.sliderWidth,
      height: t.sliderWidth * 0.3,
      depth: SLIDER_DEPTH,
      nubWidth: t.sliderWidth * 0.3,
      nubHeight: t.sliderWidth * 0.24,
      nubDepth: 0.03,
      travel: t.sliderWidth * SLIDER_TRAVEL_FRACTION,
      ledRadius: t.sliderWidth * 0.05,
      ledOffset: t.sliderWidth * 0.74,
    },
    faceZ: -t.flapDepth / 2,
    z: {
      bodyFront,
      faceFront,
      flapClosed: faceFront + t.flapDepth / 2,
      flapFront: t.flapDepth / 2 + PANEL_DEPTH,
    },
    hingeX,
    hingePostX: t.bodyWidth / 2 - t.flapInset / 2,
    openAngle,
    closed: {width: t.bodyWidth, height: t.bodyHeight},
    // Derived from the angle rather than measured, so retuning it retunes the
    // camera with it.
    open: {
      width: 2 * (hingeX + flapWidth * Math.abs(Math.cos(openAngle))),
      height: t.bodyHeight,
    },
  }
}
