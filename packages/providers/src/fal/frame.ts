// READING A PICTURE'S FRAME OFF THE FILE ITSELF (D-028's second admission gate; check 12).
//
// D-028 admits an image model on two requirements, and says of the second: "**Emits true 9:16.**
// `image-to-video` has no `aspect_ratio` field, and a non-vertical `image_url` yields a **16:9
// video with no error** (D-019's schema notes). This requirement fails silently, so it is checked
// on the produced frame, not trusted from the entry."
//
// SO IT IS READ FROM THE BYTES, AND FROM NOTHING ELSE. fal's result body reports a width and a
// height; those are the provider's account of what it made, and an adapter that read them would
// be trusting exactly what the decision says not to trust — a fixture in this repository reports
// a vertical frame beside a landscape file for that reason. Nothing here asks ffprobe either: the
// image port is not handed the tools, a process for every keyframe is a cost for a header read,
// and a dimension is four bytes at a fixed offset in every format that matters.

/** What a picture file is, and how big. */
export interface PictureFrame {
  format: 'png' | 'jpeg' | 'webp'
  width: number
  height: number
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** PNG: IHDR is the first chunk, and its width and height are big-endian at 16 and 20. */
function pngFrame(bytes: Buffer): PictureFrame | undefined {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG)) return undefined
  if (bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return undefined
  return { format: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/**
 * JPEG: walk the markers to the start-of-frame, whose height and width are big-endian at 5 and 7
 * of its payload. Every SOF but the four that are not frames (DHT, JPG, DAC, and the restarts)
 * carries them.
 */
function jpegFrame(bytes: Buffer): PictureFrame | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined
  let at = 2
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return undefined
    const marker = bytes[at + 1] as number
    const length = bytes.readUInt16BE(at + 2)
    const frame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (frame) {
      return {
        format: 'jpeg',
        width: bytes.readUInt16BE(at + 7),
        height: bytes.readUInt16BE(at + 5),
      }
    }
    at += 2 + length
  }
  return undefined
}

/** WebP: the lossy, lossless and extended shapes each put the size in a different place. */
function webpFrame(bytes: Buffer): PictureFrame | undefined {
  if (bytes.length < 30) return undefined
  if (bytes.subarray(0, 4).toString('latin1') !== 'RIFF') return undefined
  if (bytes.subarray(8, 12).toString('latin1') !== 'WEBP') return undefined
  const kind = bytes.subarray(12, 16).toString('latin1')
  if (kind === 'VP8 ') {
    return {
      format: 'webp',
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    }
  }
  if (kind === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (kind === 'VP8X') {
    const size = (at: number) => bytes.readUIntLE(at, 3) + 1
    return { format: 'webp', width: size(24), height: size(27) }
  }
  return undefined
}

/** The extension a format is written with, so a file's name says what is in it. */
export const PICTURE_EXTENSION: Readonly<Record<PictureFrame['format'], string>> = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
}

/**
 * The frame these bytes are, or `undefined` if they are no picture this adapter can read.
 *
 * An unreadable answer is never quietly accepted: a body half of which is an error message would
 * otherwise be written out as a picture file and handed on, which is the mp3 trap S-123 found in
 * the narration adapter, in another format.
 */
export function pictureFrame(bytes: Uint8Array): PictureFrame | undefined {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return pngFrame(buffer) ?? jpegFrame(buffer) ?? webpFrame(buffer)
}
