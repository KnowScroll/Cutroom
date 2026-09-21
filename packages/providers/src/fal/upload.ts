import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { z } from 'zod'
import { FAL_STORAGE_BASE_URL, FalFault, baseOf, json, send } from './queue.ts'

// GETTING A LOCAL PICTURE TO FAL — the ONE function that does it (paid-path, Gate 2 "Getting a
// local picture to fal"; check 15 proves it by number in Slice 6, and every reference of every
// image call goes through it from Slice 5 on).
//
// An `image-to-video` call and an image EDIT call both need a picture fal can fetch, and ours is a
// file under the artifact root. fal's storage is two calls: `initiate` says where to put the bytes
// and what the file will be called afterwards, then the bytes are PUT there.
//
// DOCUMENTED, AND NEVER SEEN HERE. Nothing in this repository has ever called fal's storage, so
// this is fal's published shape rather than a recorded one — the state S-123 left the subtitle
// body in. A body that is not this shape throws naming what arrived, so Slice 8's hand-run reel
// finds it at once rather than quietly. **S-114's escape hatch is attached to THIS FUNCTION AND
// NOTHING ELSE**: if the protocol proves fragile by hand, `@fal-ai/client` may replace it, as its
// own entry recording what was measured — and the download, the classification and the receipts
// stay the engine's.
//
// THE UPLOAD URL IS A PRESIGNED CREDENTIAL AND IS NOT OURS. Our key goes on `initiate` and NOT on
// the PUT: the URL initiate hands back carries its own authorisation, and a key of ours sent to a
// third party's storage is a key leaving this machine for somewhere with no business holding it
// (S-109, D-022, the rule S-123 set for MiniMax's subtitle fetch). It is followed as given, it is
// never a setting, and it is not kept past the call.

/** The path `initiate` is asked at, under the storage base URL. */
export const UPLOAD_INITIATE_PATH = '/storage/upload/initiate'

/** Which of fal's storages a file goes to. The one its own client asks for. */
export const UPLOAD_STORAGE = 'fal-cdn-v3'

/** What `initiate` answers: where to PUT, and what the file will be reachable at afterwards. */
const initiated = z.object({
  file_url: z.string().min(1),
  upload_url: z.string().min(1),
})

/** The media type a file's extension says it is. fal wants one on the initiate call. */
function contentType(path: string): string {
  const extension = extname(path).toLowerCase()
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.mp4') return 'video/mp4'
  return 'image/png'
}

export interface UploadOptions {
  /** Read by `packages/providers` and nowhere else (S-109). Sent on `initiate`, never on the PUT. */
  key: string
  /** Where fal's storage is. Defaults to its own; a test points it at recorded wire (S-111). */
  storageBaseUrl?: string
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

/**
 * A local picture, uploaded, as a URL fal can fetch. The returned URL is fal's own and carries no
 * query string — it is the file's address, not the credential that put it there.
 */
export async function uploadReference(path: string, options: UploadOptions): Promise<string> {
  const base = baseOf(options.storageBaseUrl, FAL_STORAGE_BASE_URL)
  const fetch = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 120_000
  const what = `the reference picture ${basename(path)}`
  const type = contentType(path)

  const where = json(
    await (
      await send(`${base}${UPLOAD_INITIATE_PATH}?storage_type=${UPLOAD_STORAGE}`, what, {
        method: 'POST',
        key: options.key,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content_type: type, file_name: basename(path) }),
        timeoutMs,
        fetch,
      })
    ).text(),
    initiated,
    what,
  )

  // NO KEY ON THIS CALL. `send` is given none, so no Authorization header is built at all.
  await send(where.upload_url, `${what}'s bytes`, {
    method: 'PUT',
    headers: { 'content-type': type },
    body: await readFile(path),
    timeoutMs,
    fetch,
  })

  // And the presigned URL is not kept: nothing below this line has it, so nothing below it can
  // write it into a row, a receipt, a message or a log line.
  if (/[?&]/.test(where.file_url)) {
    throw new FalFault(
      `${what} was stored at a URL carrying a query string, which is a credential this engine ` +
        `will not hand on (D-022)`,
    )
  }
  return where.file_url
}
