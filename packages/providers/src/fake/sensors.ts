import { readFile } from 'node:fs/promises'
import type { PictureRef, PictureSensorPort } from '@cutroom/contracts'
import { entryFor } from './key.ts'

// The stand-in PictureSensorPort (docs/features/reel-stills.md, Gate 2 "The stand-ins"; S-038).
// `measure` READS THE REAL FILE for whether it is a picture and what size it is — a scripted width
// would test nothing about the file the image port wrote (D-087). Sharpness, brightness, the words
// and the similarity come from a script, with defaults 1, 1, none and 1: real sensors for those are
// deferred, their weights and threshold being unmeasured (D-031, D-049).

export type SensorMethod = 'measure' | 'readText' | 'similarity'

export interface FakeSensorEntry {
  sharpness?: number
  brightness?: number
  words?: readonly string[]
  /** For a pair, read from the second picture's entry — the derived picture held to the canonical. */
  similarity?: number
  /** A method that throws this message instead of answering. */
  throws?: Partial<Record<SensorMethod, string>>
}

/** Entries by `shot-<unit>-<label>` — or by a whole picture id, which wins. */
export type FakeSensorScript = Readonly<Record<string, FakeSensorEntry>>

export interface FakeSensorCall {
  method: SensorMethod
  pictures: readonly PictureRef[]
}

export type FakeSensors = PictureSensorPort & {
  /** Every call received, in order — including one that threw. */
  readonly calls: readonly FakeSensorCall[]
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** A PNG's width and height from its header, or null for bytes that are not a PNG. */
function pngSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24) return null
  if (!bytes.subarray(0, 8).equals(SIGNATURE)) return null
  if (bytes.toString('latin1', 12, 16) !== 'IHDR') return null
  const size = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  return size.width > 0 && size.height > 0 ? size : null
}

export function fakeSensors(script: FakeSensorScript): FakeSensors {
  const calls: FakeSensorCall[] = []
  const answer = (method: SensorMethod, picture: PictureRef): FakeSensorEntry => {
    const entry = entryFor(script, picture.pictureId) ?? {}
    const thrown = entry.throws?.[method]
    if (thrown !== undefined) throw new Error(thrown)
    return entry
  }

  return {
    calls,

    async measure(picture) {
      calls.push({ method: 'measure', pictures: [picture] })
      const entry = answer('measure', picture)
      const size = pngSize(await readFile(picture.path))
      return {
        readable: size !== null,
        width: size?.width ?? 0,
        height: size?.height ?? 0,
        sharpness: entry.sharpness ?? 1,
        brightness: entry.brightness ?? 1,
      }
    },

    async readText(picture) {
      calls.push({ method: 'readText', pictures: [picture] })
      return [...(answer('readText', picture).words ?? [])]
    },

    async similarity(a, b) {
      calls.push({ method: 'similarity', pictures: [a, b] })
      return answer('similarity', b).similarity ?? 1
    },
  }
}
