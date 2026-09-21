import { loadEnvFile } from './env-file.ts'
import { startService } from './service.ts'
import { DEFAULT_ENV_FILE, SETTING_NAMES, banner, readSettings } from './settings.ts'

// The program. Run it:
//
//   node --experimental-strip-types --no-warnings apps/service/src/main.ts
//
// Started plainly it is the engine as every feature before the paid path was verified: every port
// a stand-in, nothing spent, no key read, nothing leaving this machine but ffmpeg (S-108, S-075).
// Which adapter each port gets is one environment setting per port; every path it writes is one
// setting with a default inside this repository (D-086).
//
// This file is the program and nothing imports it. `src/index.ts` is what a test or another
// package enters this app through.

/** The environment file first, since it is what a key would be in (S-109). */
const envFile = process.env[SETTING_NAMES.envFile] ?? DEFAULT_ENV_FILE

/**
 * The file fills in what the process was not already given: an environment a person set by hand
 * wins over a file they forgot about, and a key already exported is not quietly replaced.
 */
const env = { ...loadEnvFile(envFile), ...process.env }

function refuse(error: unknown): never {
  const reason = error instanceof Error ? error.message : String(error)
  process.stderr.write(`the service refuses to start: ${reason}\n`)
  process.exit(1)
}

const settings = (() => {
  try {
    return readSettings(env)
  } catch (error) {
    refuse(error)
  }
})()

const service = await startService(settings).catch(refuse)

process.stdout.write(`${banner(settings, service.baseUrl)}\n`)

// Stopping. SIGINT is wired inside `startService`; this is the other way in, and it exists because
// no signal can be delivered to a child process on Windows — every one of them terminates it
// outright, so nothing could ever watch this service shut down cleanly (S-118). `unref` keeps
// standard input from holding the process open once the API and the worker have let go: the
// service exits by itself, with no open handle, rather than being exited.
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  if (/^\s*stop\s*$/m.test(chunk)) void service.stop()
})
process.stdin.on('end', () => {
  void service.stop()
})
process.stdin.unref()
