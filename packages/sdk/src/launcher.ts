/**
 * @cutroom/sdk private launcher module.
 *
 * Process creation, stdin stop, child-exit observation, and launcher-specific failure
 * classification. This is the ONLY SDK file that may import `node:child_process`.
 * It is not a public package entry point.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { ReadyResponse } from '@cutroom/reel-contract'

// Re-export ChildProcess so index.ts can use the type without importing child_process directly
export type { ChildProcess }

// ------------------------------------------------------------------ types

export interface LauncherOptions {
  command: string
  args: readonly string[]
  /** Environment variables to pass to the child. CUTROOM_API_PORT is added by the caller. */
  env?: Record<string, string>
  /**
   * The origin the SDK will poll after spawning. Used to verify the child is ready
   * at the correct address.
   */
  baseUrl: string
  /**
   * Milliseconds between readiness probes. Default 100.
   */
  pollIntervalMs?: number
  /**
   * Maximum milliseconds to wait for readiness. Default 30000.
   */
  timeoutMs?: number
}

export interface LaunchResult {
  /** The process that was spawned. */
  child: ChildProcess
  /**
   * Called when the child exits. The SDK will not use this after close(), but
   * needs to know when the child has actually stopped.
   */
  waitForExit: () => Promise<number>
}

export interface ReadinessResult {
  /** The child's process object. */
  child: ChildProcess
  /**
   * Stops the child by writing `stop` on stdin and waiting for exit.
   * Only call this for owned children.
   */
  stop: () => Promise<void>
  /** Waits for the child to exit for any reason. */
  waitForExit: () => Promise<number>
}

/** The reason a launch or readiness check failed. */
export type LaunchFailureKind =
  /** No listener was found at the target origin and no launcher was supplied. */
  | 'connection-refused'
  /** The launcher command could not be spawned. */
  | 'spawn-error'
  /** The child process exited before becoming ready. */
  | 'child-exit'
  /** The child exited with a non-zero code. */
  | 'child-crash'
  /** The readiness deadline expired. */
  | 'timeout'
  /** The readiness response was malformed, wrong version, or unexpected status. */
  | 'protocol-error'

export interface LaunchFailure {
  kind: LaunchFailureKind
  /** The stage at which the failure occurred. */
  stage: 'connect' | 'start' | 'ready' | 'close'
  /** The underlying error, if any. */
  cause?: Error
}

/** The successful result of waiting for readiness. */
export interface ReadySuccess {
  child: ChildProcess
  stop: () => Promise<void>
  waitForExit: () => Promise<number>
}

// ------------------------------------------------------------------ launch

/**
 * Spawn a child process with the given launcher options, piped stdin, and ignored stdout/stderr.
 * Returns the child's process handle.
 */
export function launchChild(options: LauncherOptions): LaunchResult {
  const { command, args, env = {} } = options

  const child = spawn(command, args, {
    stdio: ['pipe', 'ignore', 'ignore'],
    // Inherit the caller's ordinary environment and add only caller-supplied overrides.
    // The launcher never inspects or logs individual values (Gate 2, S-175).
    env: { ...process.env, ...env },
    shell: false,
  })

  // Ensure stdin is set up before any 'error' event can fire
  // stdin is Writable, but setEncoding is available for text mode
  if (child.stdin) {
    ;(child.stdin as unknown as { setEncoding: (enc: string) => void }).setEncoding('utf8')
  }

  const waitForExit = (): Promise<number> => {
    return new Promise((resolve, reject) => {
      child.on('exit', (code, signal) => {
        resolve(code ?? (signal ? 1 : 0))
      })
      child.on('error', (err) => {
        reject(err)
      })
    })
  }

  return { child, waitForExit }
}

// ------------------------------------------------------------------ stop

/**
 * Write the `stop` protocol to the child's stdin and wait for it to exit.
 * The child must have been started with stdin piped.
 */
export async function stopChild(child: ChildProcess): Promise<void> {
  const stdin = child.stdin
  if (!stdin) throw new Error('stdin is not pipeable')

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Force kill if it doesn't stop gracefully
      child.kill()
      resolve()
    }, 5000)

    child.on('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })

    try {
      stdin.write('stop\n')
    } catch (err) {
      clearTimeout(timer)
      reject(err)
    }
  })
}

// ------------------------------------------------------------------ readiness polling

const DEFAULT_POLL_INTERVAL_MS = 100
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Poll GET /v1/ready at the given baseUrl until:
 * - The response is 200 with a valid { contractVersion: 1, ready: true } body
 * - The deadline expires (returns null)
 * - An error occurs (returns null)
 *
 * Returns the child process on success, null on failure.
 */
export async function waitForReadiness(
  child: ChildProcess,
  baseUrl: string,
  options: {
    pollIntervalMs?: number
    timeoutMs?: number
    stop: () => Promise<void>
    waitForExit: () => Promise<number>
  },
): Promise<ReadySuccess | { kind: LaunchFailureKind; stage: 'ready' | 'start'; cause?: Error }> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const deadline = Date.now() + timeoutMs

  // Start a background task to monitor child exit
  let childExited = false
  let childFailed = false
  options
    .waitForExit()
    .then(() => {
      childExited = true
    })
    .catch(() => {
      childFailed = true
    })

  while (Date.now() < deadline) {
    // Check if child exited
    if (childExited || childFailed) {
      return { kind: 'child-exit' as LaunchFailureKind, stage: 'start' as const, cause: undefined }
    }

    try {
      const res = await fetch(readinessUrl(baseUrl), {
        signal: AbortSignal.timeout(pollIntervalMs),
        redirect: 'manual',
      })
      const text = await res.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        // Malformed JSON - protocol error
        return { kind: 'protocol-error' as LaunchFailureKind, stage: 'ready' as const }
      }

      if (res.status === 200) {
        // 200 is valid only with strict { contractVersion: 1, ready: true }.
        // A 200 with ready:false, extra key, wrong version, or malformed JSON is protocol-error.
        const parsed = ReadyResponse.safeParse(json)
        if (parsed.success && (parsed.data as { ready: boolean }).ready === true) {
          // Ready!
          return {
            child,
            stop: options.stop,
            waitForExit: options.waitForExit,
          }
        }
        return { kind: 'protocol-error' as LaunchFailureKind, stage: 'ready' as const }
      } else if (res.status === 503) {
        // 503 is valid only with strict { contractVersion: 1, ready: false }.
        // A 503 with ready:true, extra key, wrong version, or malformed JSON is protocol-error.
        // Only a recognised 503/false is eligible for bounded polling.
        const parsed = ReadyResponse.safeParse(json)
        if (!parsed.success || (parsed.data as { ready: boolean }).ready !== false) {
          return { kind: 'protocol-error' as LaunchFailureKind, stage: 'ready' as const }
        }
        // Recognised non-ready Cutroom peer — keep polling
        await sleep(pollIntervalMs)
      } else {
        // Unexpected status
        return { kind: 'protocol-error' as LaunchFailureKind, stage: 'ready' as const }
      }
    } catch (err) {
      // Fetch error (connection refused, timeout, etc.) - keep polling
      if (err instanceof Error && err.message.includes('timeout')) {
        // AbortSignal.timeout throws on timeout - that's expected, keep polling
      }
      await sleep(pollIntervalMs)
    }
  }

  // Deadline expired
  if (childExited || childFailed) {
    return { kind: 'child-exit' as LaunchFailureKind, stage: 'start' as const, cause: undefined }
  }
  return { kind: 'timeout' as LaunchFailureKind, stage: 'ready' as const }
}

/**
 * Check if a connection to the given baseUrl can be made.
 * Returns 'refused' if connection refused, 'timeout' if timed out, null if connected.
 */
export async function probeConnection(baseUrl: string): Promise<'refused' | 'timeout' | null> {
  try {
    await fetch(readinessUrl(baseUrl), {
      signal: AbortSignal.timeout(500),
      redirect: 'manual',
    })
    // Connected (even if 503 or other status)
    return null
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
        return 'refused'
      }
      if (err.message.includes('timeout')) {
        return 'timeout'
      }
    }
    return 'refused'
  }
}

/**
 * Wait for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readinessUrl(baseUrl: string): string {
  return new URL('/v1/ready', baseUrl).toString()
}
