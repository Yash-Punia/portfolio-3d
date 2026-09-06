import type {Tuning} from '@/components/console/tuning'

/**
 * Material properties from SPEC §4, with the colours coming from the tuning
 * values so they can be dialled in from the browser. Surfaces are
 * differentiated by material, not only by colour — that is what makes the
 * console read as a physical object rather than a black box.
 *
 * These are prop bags, spread onto the matching material element:
 *   <meshStandardMaterial {...materials.shell} />
 */
export interface Materials {
  shell: {color: string; roughness: number; metalness: number; envMapIntensity: number}
  bezel: {color: string; roughness: number; metalness: number}
  accent: {color: string; roughness: number; metalness: number}
  button: {color: string; roughness: number; metalness: number}
  screenGlass: {
    color: string
    roughness: number
    metalness: number
    transmission: number
    thickness: number
    clearcoat: number
    clearcoatRoughness: number
    emissiveIntensity: number
  }
  /** The screen's powered emissive colour per theme, and its unpowered one. */
  screenOn: {dark: string; light: string}
  screenOff: string
}

export function deriveMaterials(t: Tuning): Materials {
  return {
    /** Outer shell — matte, slightly soft plastic. */
    shell: {
      color: t.shellColor,
      roughness: 0.65,
      metalness: 0.05,
      // The env map is the only thing separating one coplanar black face from
      // the next under a locked front-on camera, so it is dialled up.
      envMapIntensity: 1.6,
    },
    /** Screen bezel and seam interiors — darker, glossier, recessed. */
    bezel: {color: t.bezelColor, roughness: 0.35, metalness: 0.05},
    /**
     * Red accents. SPEC §4: the centre seam strip, a hinge detail, the joystick
     * collar ring and the theme toggle's channel. Nowhere else.
     */
    accent: {color: t.accentColor, roughness: 0.4, metalness: 0.05},
    /** Button caps — off-white, not pure white. */
    button: {color: t.buttonColor, roughness: 0.5, metalness: 0.02},
    /** Screen glass — a faint reflection is what sells it as glass. */
    screenGlass: {
      color: '#05070a',
      roughness: 0.12,
      metalness: 0,
      transmission: 0.1,
      thickness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      // The powered colour is SPEC §9's screen background, a near-black that
      // tone mapping then eats, so the emissive is scaled up to read as lit.
      emissiveIntensity: t.screenEmissiveIntensity,
    },
    screenOn: {dark: t.screenColor, light: t.screenLightColor},
    screenOff: '#000000',
  }
}
