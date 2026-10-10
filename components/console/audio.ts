/**
 * The console's sounds.
 *
 * Synthesised rather than sampled. A handful of short cues do not justify as
 * many audio files — a fetch each, a decode each, and a licence question each —
 * when an oscillator and a gain envelope are the whole of what they are.
 *
 * Nobody calls this directly with the mute flag in hand: `useConsole` owns
 * `muted` and checks it before every cue, which is why this file imports
 * nothing from the store (the store imports this one).
 */

export type Cue = 'boot' | 'move' | 'press' | 'section' | 'detail' | 'back'

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

interface Knobs {
  wave: OscillatorType
  /** Start and end frequency in Hz. */
  from: number
  to: number
  ms: number
  gain: number
}

/**
 * The values the old `?tune` panel settled on, frozen. A cue that is absent is
 * silent: the boot chord and the cap click were both switched off by ear there,
 * and the cap's travel is the click now.
 */
const CUES: Partial<Record<Cue, Knobs>> = {
  move: {wave: 'sawtooth', from: 295, to: 385, ms: 26, gain: 0.028},
  section: {wave: 'triangle', from: 660, to: 990, ms: 90, gain: 0.04},
  detail: {wave: 'triangle', from: 660, to: 990, ms: 90, gain: 0.04},
  back: {wave: 'triangle', from: 990, to: 660, ms: 90, gain: 0.035},
}

const ATTACK_MS = 8

/**
 * One note: an oscillator through its own gain, ramped down to silence and
 * disconnected when it stops.
 *
 * The envelope matters more than the waveform here. A wave cut off abruptly
 * clicks — the ramp to a near-zero floor (an exponential ramp cannot reach
 * zero) is what makes these read as a console's blips rather than as pops.
 */
function note(ctx: AudioContext, {wave, from, to, ms, gain}: Knobs) {
  const start = ctx.currentTime
  const end = start + ms / 1000
  // The attack cannot outrun the note, or the ramps cross and the note clicks.
  const peak = Math.min(start + ATTACK_MS / 1000, start + (ms / 1000) * 0.5)

  const osc = ctx.createOscillator()
  osc.type = wave
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(to, end)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), peak)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(envelope).connect(ctx.destination)
  osc.start(start)
  osc.stop(end + 0.02)
  osc.onended = () => envelope.disconnect()
}

export function play(cue: Cue) {
  const knobs = CUES[cue]
  if (!knobs) return

  const ctx = audio()
  if (ctx) note(ctx, knobs)
}
