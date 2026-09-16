import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'
import type { ImagePort, ImageRequest } from '@cutroom/contracts'
import { entryFor } from './key.ts'

// The stand-in ImagePort (docs/features/reel-stills.md, Gate 2 "Making a picture" and "The
// stand-ins"). It is the only image port the engine has: it runs on this machine, reads no secret,
// reaches no network and costs nothing unless a test says so (S-036). It writes A REAL PNG for every
// picture (D-087), generated on the spot, so the path a picture is handed on with has a file at the
// end of it — and it holds no durable state of its own.

/**
 * Where pictures are written when no root is given: `.artifacts/` at this repository's root, which
 * `.gitignore` names (D-086). Found from this file, never from the working directory, so it is the
 * same folder whoever starts the engine from wherever.
 */
export const DEFAULT_ARTIFACT_ROOT = fileURLToPath(
  new URL('../../../../.artifacts', import.meta.url),
)

/** The model every stand-in receipt names. Nothing real answers to it. */
export const FAKE_IMAGE_MODEL = 'stand-in-image'

/** What the stand-in makes of one picture. Every field is optional; the default is a good picture. */
export interface FakeImageEntry {
  /** A picture of the wrong shape, or bytes that are no picture at all — each a technical failure. */
  shape?: 'wrong-size' | 'unreadable'
  /** What the call reports it cost, in cents. 0 when absent (S-036). */
  costCents?: number
  /** The call throws this message instead of making anything. */
  throws?: string
}

/** Entries by `shot-<unit>-<label>` — or by a whole picture id, which wins. */
export type FakeImageScript = Readonly<Record<string, FakeImageEntry>>

export type FakeImage = ImagePort & {
  /** Every request received, in order — including one that was refused or threw. */
  readonly calls: readonly ImageRequest[]
}

/** 9:16, small enough to write in a moment. */
const SIZE = { width: 90, height: 160 }
const WRONG_SIZE = { width: 160, height: 160 }
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A solid-colour RGB PNG, its colour taken from the picture's id so no two pictures are alike. */
function png(size: { width: number; height: number }, pictureId: string): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size.width, 0)
  header.writeUInt32BE(size.height, 4)
  header[8] = 8 // bits per channel
  header[9] = 2 // RGB
  const colour = crc32(pictureId)
  const row = Buffer.alloc(1 + size.width * 3) // filter byte 0, then the pixels
  for (let x = 0; x < size.width; x += 1) {
    row[1 + x * 3] = colour & 0xff
    row[2 + x * 3] = (colour >>> 8) & 0xff
    row[3 + x * 3] = (colour >>> 16) & 0xff
  }
  const pixels = Buffer.concat(Array.from({ length: size.height }, () => row))
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** One path segment, or a refusal: nothing a caller passes may walk out of its folder. */
function segment(value: string, what: string): void {
  if (value === '' || value === '.' || value === '..' || /[\\/:]/.test(value)) {
    throw new Error(
      `the stand-in image port refuses ${what} '${value}': a picture's path must stay under the artifact root (D-086)`,
    )
  }
}

/** `<root>/<runId>/<pictureId>.png`, refused if it would be anywhere but under the root (D-086). */
function pathFor(root: string, request: ImageRequest): string {
  segment(request.runId, 'runId')
  segment(request.pictureId, 'pictureId')
  const base = resolve(root)
  const path = resolve(base, request.runId, `${request.pictureId}.png`)
  const inside = relative(base, path)
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new Error(`the stand-in image port refuses '${path}': it is not under ${base} (D-086)`)
  }
  return path
}

export function fakeImage(
  script: FakeImageScript,
  options: { artifactRoot?: string; acceptsReferences?: boolean } = {},
): FakeImage {
  const root = options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT
  const calls: ImageRequest[] = []
  return {
    calls,
    acceptsReferences: options.acceptsReferences ?? true,
    async generate(request) {
      calls.push(request)
      const entry = entryFor(script, request.pictureId) ?? {}
      if (entry.throws !== undefined) throw new Error(entry.throws)
      const path = pathFor(root, request)
      const bytes =
        entry.shape === 'unreadable'
          ? Buffer.from('these bytes are not a picture\n', 'utf8')
          : png(entry.shape === 'wrong-size' ? WRONG_SIZE : SIZE, request.pictureId)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, bytes)
      return {
        kind: 'made',
        picture: { pictureId: request.pictureId, path },
        receipt: { model: FAKE_IMAGE_MODEL, costCents: entry.costCents ?? 0, fake: true },
      }
    },
  }
}
