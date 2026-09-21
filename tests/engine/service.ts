import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { StandInScripts } from '@cutroom/providers'
import { REPO } from '../_repo.ts'
import { client } from '../stand-in/client.ts'

// The engine AS A PROGRAM, started the way a person at this machine starts it
// (docs/features/paid-path.md, checks 1, 2 and 5). This is the only thing in the suite that runs
// apps/service, and it runs it as a PROCESS: the harness starts the API and the worker as
// libraries, which is exactly the arrangement the paid path's gate review found could never prove
// there was a program at all.
//
// The service is handed nothing but an environment. Every path it is given is inside a folder this
// helper owns, so no test writes the repository's own database, artifacts or QUESTIONS.md, and
// nothing here needs a key: every provider setting is left unset, so every port is a stand-in
// (S-108).

/** The environment a service is started with: PATH, for ffmpeg (S-075), and its settings. */
function environment(settings: Readonly<Record<string, string>>): Record<string, string> {
  // Windows spells it `Path`; ffmpeg and ffprobe are found by name on it (S-075, CLAUDE.md).
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH')
  const path = key === undefined ? '' : (process.env[key] ?? '')
  return { PATH: path, ...settings }
}

export interface ServiceOptions {
  /** What the stand-ins answer from, written to the file the script setting names (S-116). */
  standIn?: StandInScripts
  /** Settings added to — or overriding — the folder's own. */
  env?: Readonly<Record<string, string>>
  /** Written to the file the environment-file setting names (S-109). Absent: no such file. */
  envFileText?: string
  /** Left out: the API takes any free port. */
  port?: number
}

/** A folder of settings, and the files a service started with them would write. */
export interface ServiceFolder {
  dir: string
  dbPath: string
  artifactRoot: string
  questionsPath: string
  envFile: string
  scriptPath: string
  env: Record<string, string>
}

/** A folder for one service, with its script file written when a script was given. */
export function serviceFolder(options: ServiceOptions = {}): ServiceFolder {
  const dir = mkdtempSync(join(tmpdir(), 'cutroom-service-'))
  const dbPath = join(dir, 'engine.sqlite')
  const artifactRoot = join(dir, 'artifacts')
  const questionsPath = join(dir, 'QUESTIONS.md')
  // A file that does not exist: a service loads no environment beyond the one it was started with.
  const envFile = join(dir, '.env')
  const scriptPath = join(dir, 'stand-in.json')
  if (options.standIn !== undefined) writeFileSync(scriptPath, JSON.stringify(options.standIn))
  if (options.envFileText !== undefined) writeFileSync(envFile, options.envFileText)
  return {
    dir,
    dbPath,
    artifactRoot,
    questionsPath,
    envFile,
    scriptPath,
    env: environment({
      CUTROOM_DB_PATH: dbPath,
      CUTROOM_ARTIFACT_ROOT: artifactRoot,
      CUTROOM_QUESTIONS_PATH: questionsPath,
      CUTROOM_ENV_FILE: envFile,
      CUTROOM_API_PORT: String(options.port ?? 0),
      ...(options.standIn === undefined ? {} : { CUTROOM_STAND_IN_SCRIPT: scriptPath }),
      ...options.env,
    }),
  }
}

/** The service's own entry point, run the way a person runs it. */
const ARGV = [
  '--experimental-strip-types',
  '--no-warnings',
  join('apps', 'service', 'src', 'main.ts'),
]

export interface Ended {
  code: number | null
  signal: string | null
}

export interface Service extends ServiceFolder {
  baseUrl: string
  http: ReturnType<typeof client>
  /** Everything the process has written to stdout and stderr so far. */
  output(): string
  /** Stops it the way check 5 stops it — a `stop` line on stdin (S-118) — and waits. */
  stop(): Promise<Ended>
  /** Ends it at once, as a crash would. */
  kill(): Promise<void>
  /** Reads the service's own database file directly, the way an operator would. */
  query<T>(sql: string, ...params: Array<string | number>): T[]
  /** Removes the folder. Call after `stop()` or `kill()`. */
  clean(): void
}

/** The service in a process of its own, with everything it has written and how it ended. */
function run(env: Record<string, string>) {
  const child = spawn(process.execPath, ARGV, { cwd: REPO, env, stdio: ['pipe', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8')
  })
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8')
  })
  const gone = new Promise<Ended>((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
  return { child, output: () => output, gone }
}

/** The line the service prints once it is listening, and only then. */
const LISTENING = /^\s*listening\s+(\S+)\s*$/m

/**
 * Starts the service and waits until it says where it is listening. Fails, with everything the
 * process wrote, if it ends first — which is what a refusal looks like to a test expecting one not
 * to happen.
 */
export async function startService(options: ServiceOptions = {}): Promise<Service> {
  const folder = serviceFolder(options)
  const { child, output, gone } = run(folder.env)

  const baseUrl = await new Promise<string>((resolve, reject) => {
    const read = () => {
      const found = LISTENING.exec(output())
      if (found !== null) resolve(found[1] as string)
    }
    child.stdout.on('data', read)
    child.stderr.on('data', read)
    void gone.then(({ code, signal }) => {
      reject(
        new Error(
          `the service ended (code ${String(code)}, signal ${String(signal)}) before it listened:\n${output()}`,
        ),
      )
    })
  })

  let ended: Ended | undefined
  void gone.then((e) => {
    ended = e
  })

  return {
    ...folder,
    baseUrl,
    http: client(baseUrl),
    output,
    async stop() {
      if (ended !== undefined) return gone
      child.stdin.write('stop\n')
      // A service that will not stop is a finding, not a reason to sit until the test runner's own
      // timeout: it is killed, and what comes back is not a clean exit, which is what check 5 reads.
      const held = new Promise<'held'>((resolve) => setTimeout(() => resolve('held'), 15_000))
      if ((await Promise.race([gone.then(() => 'gone' as const), held])) === 'held') {
        child.kill('SIGKILL')
      }
      return gone
    },
    async kill() {
      if (ended === undefined) child.kill('SIGKILL')
      await gone
    },
    query<T>(sql: string, ...params: Array<string | number>): T[] {
      const db = new DatabaseSync(folder.dbPath)
      try {
        return db.prepare(sql).all(...params) as T[]
      } finally {
        db.close()
      }
    },
    clean() {
      rmSync(folder.dir, { recursive: true, force: true })
    },
  }
}

export interface Refusal extends ServiceFolder {
  code: number | null
  signal: string | null
  output: string
  /** Whether the database file exists: a refusal before the database is opened leaves none. */
  database: boolean
  /** Whether the artifact root exists: a refused service writes no file. */
  artifacts: boolean
  clean(): void
}

/**
 * Starts a service that is expected to refuse, and waits for it to end. Fails if it listens
 * instead — the assertion check 2 rests on, since a service that starts has already opened its
 * database.
 */
export async function refusedService(options: ServiceOptions = {}): Promise<Refusal> {
  const folder = serviceFolder(options)
  const { child, output, gone } = run(folder.env)

  // Watched both ways round: a service that refuses ends, and one that does not refuse listens and
  // would otherwise keep this waiting until the test timed out with nothing to say.
  const listened = new Promise<'listened'>((resolve) => {
    const read = () => {
      if (LISTENING.test(output())) resolve('listened')
    }
    child.stdout.on('data', read)
    child.stderr.on('data', read)
  })
  const first = await Promise.race([gone.then(() => 'ended' as const), listened])
  if (first === 'listened') {
    child.kill('SIGKILL')
    await gone
    const text = output()
    rmSync(folder.dir, { recursive: true, force: true })
    throw new Error(`the service listened when it was expected to refuse:\n${text}`)
  }
  const { code, signal } = await gone
  const text = output()
  return {
    ...folder,
    code,
    signal,
    output: text,
    database: existsSync(folder.dbPath),
    artifacts: existsSync(folder.artifactRoot),
    clean() {
      rmSync(folder.dir, { recursive: true, force: true })
    },
  }
}

/** Polls until `predicate` holds, or fails naming what it was waiting for. */
export async function waitFor(
  what: string,
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`)
}
