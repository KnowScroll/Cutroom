import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The repository root, found from this file rather than from process.cwd(). */
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
