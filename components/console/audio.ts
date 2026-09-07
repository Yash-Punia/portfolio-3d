/**
 * The console's sounds (SPEC §16.2, confirmed: audible, with a mute in the
 * status bar).
 *
 * Synthesised rather than sampled. Four short cues do not justify four audio
 * files — a fetch each, a decode each, and a licence question each — when an
 * oscillator and a gain envelope are the whole of what they are. Nothing is
 * imported, nothing is downloaded, and the module is a few hundred bytes.
 *
 * Nobody calls this directly with the mute flag in hand: `useConsole` owns
 * `muted` and checks it before every cue, which is why this file imports
 * nothing from the store (the store imports this one).
 */

export type Cue = 'open' | 'close' | 'move' | 'press' | 'boot'

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
  type?: OscillatorType
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
function note(ctx: AudioContext, {from, to, ms, type = 'square', gain = 0.05, at = 0}: Note) {
  const start = ctx.currentTime + at / 1000
  const end = start + ms / 1000

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(to, end)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(envelope).connect(ctx.destination)
  osc.start(start)
  osc.stop(end + 0.02)
  osc.onended = () => envelope.disconnect()
}

/**
 * What each cue sounds like. The two flap cues are low and short — a hinge
 * rather than a chime; the rail's tick is high and very quiet, because it fires
 * every 180ms while a direction is held and anything louder would be unbearable
 * held for a second.
 */
const CUES: Record<Cue, Note[]> = {
  open: [{from: 180, to: 90, ms: 170, type: 'triangle', gain: 0.09}],
  close: [{from: 140, to: 70, ms: 150, type: 'triangle', gain: 0.08}],
  move: [{from: 880, ms: 26, gain: 0.022}],
  press: [{from: 1180, to: 760, ms: 44, gain: 0.035}],
  boot: [
    {from: 523.25, ms: 90, type: 'triangle', gain: 0.05, at: 0},
    {from: 659.25, ms: 90, type: 'triangle', gain: 0.05, at: 90},
    {from: 783.99, ms: 190, type: 'triangle', gain: 0.055, at: 180},
  ],
}

export function play(cue: Cue) {
  const ctx = audio()
  if (!ctx) return
  for (const spec of CUES[cue]) note(ctx, spec)
}
