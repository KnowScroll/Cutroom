import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { NarrationPort, NarrationRequest, WordTiming } from '@cutroom/contracts'
import { DEFAULT_ARTIFACT_ROOT, artifactPath } from '../artifacts.ts'
import { entryFor } from './key.ts'
import { checkedFailures, scriptedThrow, type StandInFailure } from './thrown.ts'

// The stand-in NarrationPort (docs/features/reel-render.md, Gate 2 "The ports"; S-070). It is the
// only narration port the engine has: it runs on this machine, reads no secret, reaches no network
// and costs nothing unless a test says so (S-036). It writes A REAL WAV for every narration (D-087) —
// 16-bit PCM, mono, 24 kHz, a steady 660 Hz tone — and reports word timings for it: each word of the
// text 300 ms, followed by a 200 ms gap, the file as long as its timings. The pipeline measures the
// file and parses the timings; the stand-in only says them.

/** The model every stand-in receipt names. Nothing real answers to it. */
export const FAKE_NARRATION_MODEL = 'stand-in-voice'

const SAMPLE_RATE = 24_000
const TONE_HZ = 660

/** What the stand-in speaks for one shot. Every field is optional; the default is a good narration. */
export interface FakeNarrationEntry {
  /** How long each word's timing is. 300 ms when absent. */
  wordMs?: number
  /** The silence after each word. 200 ms when absent. */
  gapMs?: number
  /** The timings the call reports, in place of the file's own — a malformed answer, say. */
  timings?: unknown
  /** What the call reports it cost, in cents. 0 when absent (S-036). */
  costCents?: number
  /** The call throws this message instead of making anything. */
  throws?: string
  /**
   * The class the throw is, as a real adapter's would be — its message then that class's for
   * `throws` — or a plain Error when absent (resume-failed, S-163).
   */
  as?: StandInFailure
  /**
   * The first this-many sends of the narration id are answered `unavailable` — a provider failing
   * for a moment — and the next is answered as the rest of the entry says (reel-takes, S-096).
   */
  transient?: number
}

/** Entries by `shot-<unit>-narration` — or by a whole narration id, which wins. */
export type FakeNarrationScript = Readonly<Record<string, FakeNarrationEntry>>

export type FakeNarration = NarrationPort & {
  /** Every request received, in order — including one that threw. */
  readonly calls: readonly NarrationRequest[]
}

/** A mono 16-bit PCM WAV of the tone, `ms` long. */
function wav(ms: number): Buffer {
  const samples = Math.round((ms * SAMPLE_RATE) / 1000)
  const data = Buffer.alloc(samples * 2)
  for (let i = 0; i < samples; i += 1) {
    const level = Math.sin((2 * Math.PI * TONE_HZ * i) / SAMPLE_RATE) * 0.25
    data.writeInt16LE(Math.round(level * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'latin1')
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8, 'latin1')
  header.write('fmt ', 12, 'latin1')
  header.writeUInt32LE(16, 16) // the format chunk's size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28) // bytes a second
  header.writeUInt16LE(2, 32) // bytes a sample
  header.writeUInt16LE(16, 34) // bits a sample
  header.write('data', 36, 'latin1')
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

export function fakeNarration(
  script: FakeNarrationScript,
  options: { artifactRoot?: string } = {},
): FakeNarration {
  checkedFailures('the stand-in narration port', Object.entries(script))
  const root = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT
  const calls: NarrationRequest[] = []
  /** How many times each narration id has been sent. */
  const sends = new Map<string, number>()
  return {
    calls,
    async speak(request) {
      calls.push(request)
      const entry = entryFor(script, request.narrationId) ?? {}
      const send = (sends.get(request.narrationId) ?? 0) + 1
      sends.set(request.narrationId, send)
      if (entry.transient !== undefined && send <= entry.transient) {
        return {
          kind: 'unavailable',
          detail: `the stand-in narration port is unavailable for ${request.narrationId}, send ${send} of the ${entry.transient} it was scripted to answer so`,
        }
      }
      if (entry.throws !== undefined) {
        throw scriptedThrow(entry.throws, entry.as, {
          port: 'speech',
          model: FAKE_NARRATION_MODEL,
          costCents: entry.costCents ?? 0,
        })
      }
      const path = artifactPath(
        root,
        { runId: request.runId, id: request.narrationId, what: 'narrationId' },
        '.wav',
        'the stand-in narration port',
      )
      const wordMs = entry.wordMs ?? 300
      const gapMs = entry.gapMs ?? 200
      const words = request.text.split(/\s+/).filter((word) => word !== '')
      const timings: WordTiming[] = words.map((word, i) => ({
        word,
        startMs: i * (wordMs + gapMs),
        endMs: i * (wordMs + gapMs) + wordMs,
      }))
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, wav(words.length * (wordMs + gapMs)))
      return {
        kind: 'made',
        audio: { narrationId: request.narrationId, path },
        timings: entry.timings ?? timings,
        receipt: {
          model: FAKE_NARRATION_MODEL,
          // Code points, as the worker's guard counts them (S-088): not the UTF-16 length.
          characters: [...request.text].length,
          costCents: entry.costCents ?? 0,
          fake: true,
        },
      }
    },
  }
}
