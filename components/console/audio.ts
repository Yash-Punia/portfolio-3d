import {useTuning, type Tuning, type Wave} from '@/components/console/tuning'

/**
 * The console's sounds (SPEC §16.2, confirmed: audible, with a mute in the
 * status bar).
 *
 * Synthesised rather than sampled. Nine short cues do not justify nine audio
 * files — a fetch each, a decode each, and a licence question each — when an
 * oscillator and a gain envelope are the whole of what they are. Nothing is
 * downloaded and the module is a few hundred bytes.
 *
 * Every pitch, length and gain comes from the tuning store, so the whole set
 * can be dialled by ear behind `?tune` rather than guessed at here. That import
 * is one way: `tuning.ts` knows about nobody.
 *
 * Nobody calls this directly with the mute flag in hand: `useConsole` owns
 * `muted` and checks it before every cue, which is why this file imports
 * nothing from the store (the store imports this one).
 */

export type Cue =
  'open' | 'close' | 'boot' | 'move' | 'press' | 'section' | 'detail' | 'back' | 'theme'

/**
 * Created on the first cue, never at module load: a browser refuses an
 * `AudioContext` before a gesture and logs a warning for the attempt, and the
 * first cue is always downstream of a click, a key or a tap.
 */
let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  // Autoplay policy can hand back a suspended context even inside a gesture.
  if (context.state === 'suspended') void context.resume()
  return context
}

interface Note {
  /** Start and end frequency in Hz; equal values hold a pitch. */
  from: number
  to?: number
  ms: number
  type?: Wave
  gain?: number
  /** Delay from the start of the cue, for the boot's three notes. */
  at?: number
}

/**
 * One note: an oscillator through its own gain, ramped down to silence and
 * disconnected when it stops.
 *
 * The envelope matters more than the waveform here. A square wave cut off
 * abruptly clicks — the ramp to a near-zero floor (an exponential ramp cannot
 * reach zero) is what makes these read as a console's blips rather than as
 * pops.
 */
function note(
  ctx: AudioContext,
  {from, to, ms, type = 'square', gain = 0.05, at = 0}: Note,
  volume: number,
  attackMs: number,
) {
  const level = Math.max(gain * volume, 0.0002)
  const start = ctx.currentTime + at / 1000
  const end = start + ms / 1000
  // The attack cannot outrun the note, or the ramps cross and the note clicks.
  const peak = Math.min(start + attackMs / 1000, start + (ms / 1000) * 0.5)

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, end)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(level, peak)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(envelope).connect(ctx.destination)
  osc.start(start)
  osc.stop(end + 0.02)
  osc.onended = () => envelope.disconnect()
}

/**
 * The boot chord: three notes climbing from `From` to `To` in equal ratios, so
 * a major triad is one pair of numbers rather than three. The last one rings on
 * past the other two — it is the note the screen arrives on.
 */
const BOOT_NOTES = 3
const BOOT_TAIL = 2.1

function bootNotes(k: Knobs): Note[] {
  const from = Math.max(k.from, 20)
  const to = Math.max(k.to, 20)
  const ratio = (to / from) ** (1 / (BOOT_NOTES - 1))

  return Array.from({length: BOOT_NOTES}, (_, i) => {
    const last = i === BOOT_NOTES - 1
    return {
      from: from * ratio ** i,
      ms: last ? k.ms * BOOT_TAIL : k.ms,
      type: k.wave,
      gain: k.gain,
      at: i * k.ms,
    }
  })
}

/** One cue's six knobs, gathered. */
interface Knobs {
  on: boolean
  wave: Wave
  from: number
  to: number
  ms: number
  gain: number
}

/**
 * The switch is written out rather than indexed by a built key name, so every
 * knob a cue reads is a real property TypeScript has checked. Adding a cue
 * fails to compile until its six are declared.
 */
function knobsFor(t: Tuning, cue: Cue): Knobs {
  switch (cue) {
    case 'open':
      return {
        on: t.sfxOpenOn,
        wave: t.sfxOpenWave,
        from: t.sfxOpenFrom,
        to: t.sfxOpenTo,
        ms: t.sfxOpenMs,
        gain: t.sfxOpenGain,
      }
    case 'close':
      return {
        on: t.sfxCloseOn,
        wave: t.sfxCloseWave,
        from: t.sfxCloseFrom,
        to: t.sfxCloseTo,
        ms: t.sfxCloseMs,
        gain: t.sfxCloseGain,
      }
    case 'boot':
      return {
        on: t.sfxBootOn,
        wave: t.sfxBootWave,
        from: t.sfxBootFrom,
        to: t.sfxBootTo,
        ms: t.sfxBootMs,
        gain: t.sfxBootGain,
      }
    case 'move':
      return {
        on: t.sfxMoveOn,
        wave: t.sfxMoveWave,
        from: t.sfxMoveFrom,
        to: t.sfxMoveTo,
        ms: t.sfxMoveMs,
        gain: t.sfxMoveGain,
      }
    case 'press':
      return {
        on: t.sfxPressOn,
        wave: t.sfxPressWave,
        from: t.sfxPressFrom,
        to: t.sfxPressTo,
        ms: t.sfxPressMs,
        gain: t.sfxPressGain,
      }
    case 'section':
      return {
        on: t.sfxSectionOn,
        wave: t.sfxSectionWave,
        from: t.sfxSectionFrom,
        to: t.sfxSectionTo,
        ms: t.sfxSectionMs,
        gain: t.sfxSectionGain,
      }
    case 'detail':
      return {
        on: t.sfxDetailOn,
        wave: t.sfxDetailWave,
        from: t.sfxDetailFrom,
        to: t.sfxDetailTo,
        ms: t.sfxDetailMs,
        gain: t.sfxDetailGain,
      }
    case 'back':
      return {
        on: t.sfxBackOn,
        wave: t.sfxBackWave,
        from: t.sfxBackFrom,
        to: t.sfxBackTo,
        ms: t.sfxBackMs,
        gain: t.sfxBackGain,
      }
    case 'theme':
      return {
        on: t.sfxThemeOn,
        wave: t.sfxThemeWave,
        from: t.sfxThemeFrom,
        to: t.sfxThemeTo,
        ms: t.sfxThemeMs,
        gain: t.sfxThemeGain,
      }
  }
}

export function play(cue: Cue) {
  const t = useTuning.getState().values
  // Two switches, and both are the author's: `sfxOn` for the whole set and the
  // cue's own. The visitor's mute is a different thing and lives in the store.
  if (!t.sfxOn) return

  const k = knobsFor(t, cue)
  if (!k.on) return

  const ctx = audio()
  if (!ctx) return

  const notes =
    cue === 'boot' ? bootNotes(k) : [{from: k.from, to: k.to, ms: k.ms, gain: k.gain, type: k.wave}]

  for (const spec of notes) note(ctx, spec, t.sfxVolume, t.sfxAttackMs)
}
