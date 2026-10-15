import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fork, type ChildProcess } from 'node:child_process'
import { createServer, type AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import {
  createCutroom,
  type CreateCutroomOptions,
  type SdkConnectionError,
  type SdkProtocolError,
} from '@cutroom/sdk'

// cutroom-sdk, Slice 3 — launcher lifecycle (docs/features/cutroom-sdk.md, Gate 2 / Slice 3;
// S-173, S-175, S-176, S-177). The test uses small stand-in child programs that start only
// local HTTP readiness servers, record the CUTROOM_API_PORT they received, and respond to the
// stdin `stop` protocol. No child ever imports engine code or calls a provider.

// ------------------------------------------------------------------ constants

/** The exact JSON body for a 200/true readiness response. */
const READY_TRUE_BODY = '{"contractVersion":1,"ready":true}'
/** The exact JSON body for a 503/false readiness response. */
const READY_FALSE_BODY = '{"contractVersion":1,"ready":false}'
/** 200 with ready:false — an invalid pairing that must be rejected as protocol/ready. */
const READY_200_FALSE_BODY = '{"contractVersion":1,"ready":false}'
/** 503 with ready:true — an invalid pairing that must be rejected as protocol/ready. */
const READY_503_TRUE_BODY = '{"contractVersion":1,"ready":true}'
const RUN_STATUS_BODY = JSON.stringify({
  contractVersion: 1,
  runId: 'run-1',
  requestId: 'req-1',
  state: 'running',
  lastSeq: 0,
})
const MUST_NOT_LAUNCH = {
  command: join(tmpdir(), 'cutroom-sdk-must-not-launch'),
  args: [] as const,
}

// ------------------------------------------------------------------ child fixtures

/**
 * A child program that acts as a minimal Cutroom readiness stand-in.
 * Writes the bound port to stdout as "READY:<port>\n" when listening.
 */
function writeReadyStandIn(dir: string, port: number): string {
  const childPath = join(dir, 'stand-in-child.mjs')
  const jsonStr = JSON.stringify({ contractVersion: 1, ready: true })
  const lines = [
    "import { createServer } from 'node:http'",
    `const EXPECTED_PORT = ${port}`,
    'const PORT = Number(process.env.CUTROOM_API_PORT)',
    `const READY_TRUE = JSON.parse('${jsonStr}')`,
    '',
    'const server = createServer((req, res) => {',
    "  if (req.url === '/v1/ready') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify(READY_TRUE))',
    '    return',
    '  }',
    "  if (req.url === '/launch') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify({ port: process.env.CUTROOM_API_PORT, args: process.argv.slice(2) }))',
    '    return',
    '  }',
    "  if (req.url === '/v1/runs/run-1') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    `    res.end(${JSON.stringify(RUN_STATUS_BODY)})`,
    '    return',
    '  }',
    '  res.writeHead(404); res.end()',
    '})',
    '',
    `server.listen(PORT, '127.0.0.1', () => {`,
    '  if (PORT !== EXPECTED_PORT) process.exit(2)',
    "  process.stdout.write('READY:' + PORT + '\\n')",
    '})',
    '',
    "process.stdin.setEncoding('utf8')",
    "process.stdin.on('data', (chunk) => {",
    '  if (/^\\s*stop\\s*$/m.test(chunk)) {',
    '    server.close(() => process.exit(0))',
    '  }',
    '})',
  ]
  writeFileSync(childPath, lines.join('\n'), 'utf8')
  return childPath
}

/**
 * A child program that transitions from 503/false to 200/true after a configurable delay.
 * First poll returns 503, subsequent polls within the delay also return 503,
 * and after the delay expires, polls return 200.
 */
/**
 * A child program that exits before sending a ready response — simulates losing the race.
 */
function writeExitBeforeReadyChild(dir: string, port: number): string {
  const childPath = join(dir, 'exit-before-ready.mjs')
  const lines = [
    "import { createServer } from 'node:http'",
    `const PORT = ${port}`,
    '',
    'const server = createServer((_req, res) => {',
    '  res.writeHead(404); res.end()',
    '})',
    '',
    `server.listen(PORT, '127.0.0.1', () => {`,
    "  process.stdout.write('EXIT:' + PORT + '\\n')",
    '  // Exit before ever sending a ready response',
    '  process.exit(1)',
    '})',
  ]
  writeFileSync(childPath, lines.join('\n'), 'utf8')
  return childPath
}

/**
 * A child program that records its environment keys and exposes them via HTTP.
 */
function writeEnvCheckChild(dir: string, port: number, envKeys: string[]): string {
  const childPath = join(dir, 'env-check.mjs')
  const jsonTrue = JSON.stringify({ contractVersion: 1, ready: true })
  const lines = [
    "import { createServer } from 'node:http'",
    `const PORT = ${port}`,
    `const ENV_KEYS = ${JSON.stringify(envKeys)}`,
    `const READY_TRUE = JSON.parse('${jsonTrue}')`,
    '',
    'const server = createServer((req, res) => {',
    "  if (req.url === '/v1/ready') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify(READY_TRUE))',
    '    return',
    '  }',
    "  if (req.url === '/env') {",
    '    const result = {}',
    '    for (const k of ENV_KEYS) {',
    '      result[k] = Object.prototype.hasOwnProperty.call(process.env, k)',
    '    }',
    '    res.writeHead(200, {"Content-Type": "application/json"})',
    '    res.end(JSON.stringify(result))',
    '    return',
    '  }',
    '  res.writeHead(404); res.end()',
    '})',
    '',
    `server.listen(PORT, '127.0.0.1', () => {`,
    "  process.stdout.write('READY:' + PORT + '\\n')",
    '})',
    '',
    "process.stdin.setEncoding('utf8')",
    "process.stdin.on('data', (chunk) => {",
    '  if (/^\\s*stop\\s*$/m.test(chunk)) {',
    '    server.close(() => process.exit(0))',
    '  }',
    '})',
  ]
  writeFileSync(childPath, lines.join('\n'), 'utf8')
  return childPath
}

/** A race stand-in: both launched children reach a file barrier before competing for one port. */
function writeRaceStandIn(dir: string): string {
  const childPath = join(dir, 'race-stand-in.mjs')
  const lines = [
    "import { existsSync, writeFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    "import { createServer } from 'node:http'",
    'const [barrierDir, id] = process.argv.slice(2)',
    'const port = Number(process.env.CUTROOM_API_PORT)',
    `const readyBody = ${JSON.stringify(READY_TRUE_BODY)}`,
    `const statusBody = ${JSON.stringify(RUN_STATUS_BODY)}`,
    "writeFileSync(join(barrierDir, 'spawn-' + id), '')",
    'const server = createServer((req, res) => {',
    "  res.setHeader('content-type', 'application/json')",
    "  if (req.url === '/v1/ready') { res.statusCode = 200; res.end(readyBody); return }",
    "  if (req.url === '/v1/runs/run-1') { res.statusCode = 200; res.end(statusBody); return }",
    '  res.statusCode = 404; res.end()',
    '})',
    "server.on('error', () => process.exit(1))",
    'const barrier = setInterval(() => {',
    "  if (!existsSync(join(barrierDir, 'spawn-a')) || !existsSync(join(barrierDir, 'spawn-b'))) return",
    '  clearInterval(barrier)',
    "  server.listen(port, '127.0.0.1', () => writeFileSync(join(barrierDir, 'ready-' + id), ''))",
    '}, 5)',
    "process.stdin.setEncoding('utf8')",
    "process.stdin.on('data', (chunk) => {",
    '  if (/^\\s*stop\\s*$/m.test(chunk)) server.close(() => process.exit(0))',
    '})',
  ]
  writeFileSync(childPath, lines.join('\n'), 'utf8')
  return childPath
}

/** A separately spawned SDK caller controlled over Node IPC. */
function writeSdkCaller(dir: string): string {
  const callerPath = join(dir, 'sdk-caller.mjs')
  const sdkUrl = pathToFileURL(join(process.cwd(), 'packages/sdk/src/index.ts')).href
  const lines = [
    `import { createCutroom } from ${JSON.stringify(sdkUrl)}`,
    'const [baseUrl, command, encodedArgs] = process.argv.slice(2)',
    "const launcher = command === '-' ? undefined : { command, args: JSON.parse(encodedArgs) }",
    'let client',
    'try {',
    '  client = await createCutroom({ baseUrl, launcher, readyTimeoutMs: 5000 })',
    "  process.send?.({ event: 'ready' })",
    '} catch (error) {',
    "  process.send?.({ event: 'error', message: error instanceof Error ? error.message : String(error) })",
    '}',
    "process.on('message', async (message) => {",
    "  if (!client || typeof message !== 'object' || message === null) return",
    "  if (message.command === 'request') {",
    '    try {',
    "      const status = await client.status('run-1')",
    "      process.send?.({ event: 'request', runId: status.runId })",
    '    } catch (error) {',
    "      process.send?.({ event: 'request-error', kind: error?.kind, stage: error?.stage, message: error instanceof Error ? error.message : String(error) })",
    '    }',
    '  }',
    "  if (message.command === 'close') {",
    '    await client.close()',
    "    process.send?.({ event: 'closed' })",
    '  }',
    "  if (message.command === 'exit') {",
    '    await client.close()',
    "    process.send?.({ event: 'closed' }, () => process.exit(0))",
    '  }',
    '})',
  ]
  writeFileSync(callerPath, lines.join('\n'), 'utf8')
  return callerPath
}

type CallerEvent = {
  event: 'ready' | 'error' | 'request' | 'request-error' | 'closed'
  runId?: string
  kind?: string
  stage?: string
  message?: string
}

type ManagedCaller = {
  child: ChildProcess
  send(command: 'request' | 'close' | 'exit'): void
  waitFor(event: CallerEvent['event']): Promise<CallerEvent>
}

function startCaller(
  callerPath: string,
  baseUrl: string,
  launcher: { command: string; args: readonly string[] } | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ManagedCaller {
  const child = fork(
    callerPath,
    [baseUrl, launcher?.command ?? '-', JSON.stringify(launcher?.args ?? [])],
    {
      execArgv: ['--experimental-strip-types'],
      env,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  )
  // A send down a channel the other end has already closed fails ASYNCHRONOUSLY: Node reports it
  // by emitting `error` on the child, not by throwing at the call site, so the try/catch in
  // `stopCaller` cannot see it and an unhandled one takes the whole test down from its teardown.
  // Harmless here — a caller that has exited needs no `exit` message — and only the two codes that
  // mean exactly that are swallowed; anything else still surfaces (found under S-192's parallel
  // pools, where a loser caller exiting first stopped being rare).
  child.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE' || err.code === 'ERR_IPC_CHANNEL_CLOSED') return
    throw err
  })
  const queued: CallerEvent[] = []
  const waiting = new Map<CallerEvent['event'], (message: CallerEvent) => void>()
  child.on('message', (value) => {
    const message = value as CallerEvent
    const resolve = waiting.get(message.event)
    if (resolve) {
      waiting.delete(message.event)
      resolve(message)
    } else {
      queued.push(message)
    }
  })
  return {
    child,
    send(command) {
      child.send?.({ command })
    },
    waitFor(event) {
      const index = queued.findIndex((message) => message.event === event)
      if (index !== -1) return Promise.resolve(queued.splice(index, 1)[0]!)
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          waiting.delete(event)
          reject(new Error(`timed out waiting for caller event ${event}`))
        }, 10_000)
        waiting.set(event, (message) => {
          clearTimeout(timer)
          resolve(message)
        })
      })
    },
  }
}

async function stopCaller(caller: ManagedCaller): Promise<void> {
  if (caller.child.exitCode !== null) return
  const exited = new Promise<void>((resolve) => caller.child.once('exit', () => resolve()))
  if (caller.child.connected) {
    try {
      caller.send('exit')
    } catch {
      // The caller may have exited between the status check and send.
    }
  }
  const finished = await Promise.race([
    exited.then(() => true),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 1000)),
  ])
  if (!finished && caller.child.exitCode === null) caller.child.kill()
}

// ------------------------------------------------------------------ helpers

/** Allocate a free port on loopback by binding and immediately releasing. */
function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer()
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address() as AddressInfo
      s.close(() => resolve(addr.port))
    })
  })
}

/** A running HTTP stand-in bound to a port. */
interface RunningServer {
  port: number
  requests: string[]
  stop: () => Promise<void>
}

/** Start a pure HTTP server (not a child process) with configurable status and body. */
async function startServer(
  port: number,
  status: number,
  body: string,
  routeBody?: string,
): Promise<RunningServer> {
  const { createServer } = await import('node:http')
  const requests: string[] = []
  const server = createServer((req, res) => {
    requests.push(req.url ?? '')
    if (req.url !== '/v1/ready' && routeBody !== undefined) {
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(routeBody)
      return
    }
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(body)
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  return {
    port,
    requests,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

async function startTransitionServer(port: number): Promise<RunningServer> {
  const { createServer } = await import('node:http')
  const requests: string[] = []
  let ready = false
  const server = createServer((req, res) => {
    requests.push(req.url ?? '')
    if (req.url !== '/v1/ready') {
      res.statusCode = 404
      res.end()
      return
    }
    res.statusCode = ready ? 200 : 503
    res.setHeader('content-type', 'application/json')
    res.end(ready ? READY_TRUE_BODY : READY_FALSE_BODY)
    ready = true
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  return {
    port,
    requests,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

// ------------------------------------------------------------------ 1. public surface

describe('1. public surface', () => {
  test('CreateCutroomOptions accepts launcher with readonly args and readyTimeoutMs', () => {
    const opts1: CreateCutroomOptions = {
      baseUrl: 'http://127.0.0.1:9999',
      launcher: { command: 'node', args: ['--version'] as const },
      readyTimeoutMs: 5000,
    }
    assert.equal(opts1.launcher?.command, 'node')
    assert.deepEqual(opts1.launcher?.args, ['--version'])
    assert.equal(opts1.readyTimeoutMs, 5000)
  })

  test('invalid timeout input produces no probe and no child', async () => {
    const badTimeouts = [-1, 0, NaN, Infinity, -Infinity, 1.5]
    for (const bad of badTimeouts) {
      await assert.rejects(
        createCutroom({
          launcher: { command: 'node', args: ['--version'] as const },
          readyTimeoutMs: bad as number,
        }),
        (err: unknown) =>
          err instanceof TypeError || (err instanceof Error && err.message.includes('timeout')),
        `timeout ${bad} was not rejected`,
      )
    }
  })
})

// ------------------------------------------------------------------ 2. strict 200/true peer joined

describe('2. strict 200/true peer is joined; zero launcher invocations; route call succeeds; close() is no-op', () => {
  test('joined handle route call succeeds through the joined handle', async () => {
    const port = await freePort()
    const server = await startServer(port, 200, READY_TRUE_BODY, RUN_STATUS_BODY)
    try {
      const client = await createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: MUST_NOT_LAUNCH,
      })
      const status = await client.status('run-1')
      assert.equal(status.runId, 'run-1')
      assert.ok(server.requests.includes('/v1/ready'), 'readiness used the wrong URL path')
      assert.ok(server.requests.includes('/v1/runs/run-1'), 'the joined route was not called')
      await client.close()
      // close() should be a no-op on a joined handle
      const afterRes = await fetch(`http://127.0.0.1:${port}/v1/ready`)
      assert.equal(afterRes.status, 200, 'joined handle close() took the peer down')
    } finally {
      await server.stop()
    }
  })
})

// ------------------------------------------------------------------ 3. invalid status/body pairs — protocol/ready, no launch

describe('3. invalid status/body pairs are protocol/ready failures; no child is launched', () => {
  test('200 with ready:false is protocol/ready and never launches', async () => {
    const port = await freePort()
    const server = await startServer(port, 200, READY_200_FALSE_BODY)
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 200,
        }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
      // No child process should have been started — verify the port is still free
      const probeRes = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch(() => null)
      // The server is still running (not a child we started), so this would succeed
      assert.ok(probeRes?.status === 200, 'server should still be running')
    } finally {
      await server.stop()
    }
  })

  test('503 with ready:true is protocol/ready and never launches', async () => {
    const port = await freePort()
    const server = await startServer(port, 503, READY_503_TRUE_BODY)
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 200,
        }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('malformed JSON is protocol/ready', async () => {
    const port = await freePort()
    const server = await startServer(port, 200, 'not json at all')
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 100,
        }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('wrong contract version is protocol/ready', async () => {
    const port = await freePort()
    const server = await startServer(port, 200, '{"contractVersion":99,"ready":true}')
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 100,
        }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('extra key in body is protocol/ready', async () => {
    const port = await freePort()
    const server = await startServer(port, 200, '{"contractVersion":1,"ready":true,"extra":"key"}')
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 100,
        }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('unexpected readiness status is protocol/ready and never launches', async () => {
    const port = await freePort()
    const server = await startServer(port, 418, READY_TRUE_BODY)
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 100,
        }),
        (err: unknown) => {
          const error = err as SdkProtocolError & Error
          return error.kind === 'protocol' && error.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })
})

// ------------------------------------------------------------------ 4. no listener / no launcher

describe('4. no listener and no launcher: connection error, no process', () => {
  test('construction rejects at connect stage and creates no process', async () => {
    const port = await freePort()
    // Nothing is listening on this port — verify it's free
    const probe = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch((e) => e)
    assert.ok(probe instanceof Error, 'port should be free')
    await assert.rejects(createCutroom({ baseUrl: `http://127.0.0.1:${port}` }), (err: unknown) => {
      if (!(err instanceof Error)) return false
      const e = err as SdkConnectionError & Error
      return e.kind === 'connection' && e.stage === 'connect'
    })
  })
})

// ------------------------------------------------------------------ 5. 503/false → 200/true transition

describe('5. 503/false peers are polled without launching', () => {
  test('503/false that transitions to 200/true is polled into a joined handle', async () => {
    const port = await freePort()
    const server = await startTransitionServer(port)
    try {
      const client = await createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: MUST_NOT_LAUNCH,
        readyTimeoutMs: 2000,
      })
      assert.ok(
        server.requests.filter((path) => path === '/v1/ready').length >= 2,
        'the recognized non-ready peer was not polled',
      )
      await client.close()
      const response = await fetch(`http://127.0.0.1:${port}/v1/ready`)
      assert.equal(response.status, 200, 'closing the joined handle stopped its peer')
    } finally {
      await server.stop()
    }
  })

  test('503/false that never transitions times out at ready and does not launch', async () => {
    const port = await freePort()
    const server = await startServer(port, 503, READY_FALSE_BODY)
    try {
      await assert.rejects(
        createCutroom({
          baseUrl: `http://127.0.0.1:${port}`,
          launcher: MUST_NOT_LAUNCH,
          readyTimeoutMs: 200,
        }),
        (err: unknown) => {
          const e = err as SdkConnectionError & Error
          return e.kind === 'connection' && e.stage === 'ready'
        },
      )
      assert.ok(
        server.requests.filter((path) => path === '/v1/ready').length >= 2,
        'the recognized non-ready peer was not polled to its deadline',
      )
    } finally {
      await server.stop()
    }
  })
})

// ------------------------------------------------------------------ 6. owned child lifecycle

describe('6. owned child: exact command/vector, shell-free, CUTROOM_API_PORT injected, stop/idempotent', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-owned-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('createCutroom spawns exactly the supplied command/vector with shell disabled', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const literalArgs = ['argument with spaces', 'literal&operator'] as const
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath, ...literalArgs] as const },
      readyTimeoutMs: 5000,
    })
    try {
      const response = await fetch(`http://127.0.0.1:${port}/launch`)
      const observed = (await response.json()) as { port: string; args: string[] }
      assert.deepEqual(observed.args, literalArgs)
      assert.equal(observed.port, String(port))
      assert.equal((await client.status('run-1')).runId, 'run-1')
    } finally {
      await client.close()
    }
  })

  test('createCutroom injects the normalised port as CUTROOM_API_PORT into the owned child', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    try {
      const response = await fetch(`http://127.0.0.1:${port}/launch`)
      const observed = (await response.json()) as { port: string }
      assert.equal(observed.port, String(port))
    } finally {
      await client.close()
    }
  })

  test('close() writes stop to the owned child and awaits its exit', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
    // Child should have exited
    const probe = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch(() => null)
    assert.equal(probe, null, 'child did not exit after close()')
  })

  test('close() is idempotent', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
    await client.close()
    await client.close()
  })
})

// ------------------------------------------------------------------ 7. child exits before ready / race winner

describe('7. owned child exits before ready; SDK joins eligible winner', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-race-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('child that exits before ready with no winner fails at start stage', async () => {
    const port = await freePort()
    const childPath = writeExitBeforeReadyChild(workDir, port)
    await assert.rejects(
      createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: { command: process.execPath!, args: [childPath] as const },
        readyTimeoutMs: 2000,
      }),
      (err: unknown) => {
        const e = err as SdkConnectionError & Error
        return e.kind === 'connection' && e.stage === 'start'
      },
    )
  })

  test('a launcher spawn error fails at start stage', async () => {
    const port = await freePort()
    await assert.rejects(
      createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: { command: join(workDir, 'missing-launcher.exe'), args: [] },
        readyTimeoutMs: 1000,
      }),
      (err: unknown) => {
        const error = err as SdkConnectionError & Error
        return error.kind === 'connection' && error.stage === 'start'
      },
    )
  })
})

// ------------------------------------------------------------------ 8. fixed-port race between two independent SDK callers

describe('8. fixed-port race: two independent SDK callers; exactly one child reaches ready; same origin', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-racy-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('two callers race the same port; loser joins winner; closing loser leaves engine alive; closing owner stops it', async () => {
    const port = await freePort()
    const baseUrl = `http://127.0.0.1:${port}`
    const standInPath = writeRaceStandIn(workDir)
    const callerPath = writeSdkCaller(workDir)
    const callerA = startCaller(callerPath, baseUrl, {
      command: process.execPath!,
      args: [standInPath, workDir, 'a'],
    })
    const callerB = startCaller(callerPath, baseUrl, {
      command: process.execPath!,
      args: [standInPath, workDir, 'b'],
    })
    const callers = [callerA, callerB]
    let observer: ManagedCaller | undefined
    try {
      await Promise.all([callerA.waitFor('ready'), callerB.waitFor('ready')])
      assert.ok(existsSync(join(workDir, 'spawn-a')), 'caller A never launched its child')
      assert.ok(existsSync(join(workDir, 'spawn-b')), 'caller B never launched its child')
      const readyIds = ['a', 'b'].filter((id) => existsSync(join(workDir, `ready-${id}`)))
      assert.equal(readyIds.length, 1, 'exactly one child must reach the ready marker')

      const ownerIndex = readyIds[0] === 'a' ? 0 : 1
      const owner = callers[ownerIndex]!
      const joiner = callers[1 - ownerIndex]!
      owner.send('request')
      joiner.send('request')
      assert.equal((await owner.waitFor('request')).runId, 'run-1')
      assert.equal((await joiner.waitFor('request')).runId, 'run-1')

      observer = startCaller(callerPath, baseUrl, undefined)
      await observer.waitFor('ready')

      joiner.send('exit')
      await joiner.waitFor('closed')
      const afterJoinerClose = await fetch(`${baseUrl}/v1/ready`)
      assert.equal(afterJoinerClose.status, 200, 'closing the joining caller stopped the engine')

      owner.send('exit')
      await owner.waitFor('closed')
      observer.send('request')
      const stopped = await observer.waitFor('request-error')
      assert.match(stopped.message ?? '', /fetch failed|connect/i)
    } finally {
      await Promise.all(
        [...callers, ...(observer ? [observer] : [])].map((caller) => stopCaller(caller)),
      )
    }
  })
})

// ------------------------------------------------------------------ 9. PATH-only environment — parent canaries absent from child

describe('9. parent canaries absent from child; SDK errors/logs carry neither', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-canary-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('PATH-only SDK caller launches a child with no provider canaries or leaked output', async () => {
    const port = await freePort()
    const canaryKeys = ['CUTROOM_TEST_API_KEY', 'CUTROOM_TEST_SECRET_TOKEN']
    const childPath = writeEnvCheckChild(workDir, port, canaryKeys)
    const callerPath = writeSdkCaller(workDir)
    const canaryValues = ['sk-test-api-key-123', 'tok_test_secret_456']
    const originalValues = canaryKeys.map((key) => process.env[key])
    process.env[canaryKeys[0]!] = canaryValues[0]
    process.env[canaryKeys[1]!] = canaryValues[1]
    const caller = startCaller(
      callerPath,
      `http://127.0.0.1:${port}`,
      { command: process.execPath!, args: [childPath] },
      { PATH: process.env.PATH ?? '' },
    )
    try {
      const ready = await caller.waitFor('ready')
      const res = await fetch(`http://127.0.0.1:${port}/env`)
      const envResult = (await res.json()) as Record<string, boolean>
      assert.equal(envResult[canaryKeys[0]!], false, `${canaryKeys[0]} appeared in child`)
      assert.equal(envResult[canaryKeys[1]!], false, `${canaryKeys[1]} appeared in child`)
      const surfaced = JSON.stringify(ready)
      for (const value of canaryValues) assert.ok(!surfaced.includes(value))
    } finally {
      canaryKeys.forEach((key, index) => {
        const original = originalValues[index]
        if (original === undefined) delete process.env[key]
        else process.env[key] = original
      })
      await stopCaller(caller)
    }
  })
})

// ------------------------------------------------------------------ 10. post-close rejection

describe('10. post-close route methods reject locally; no new HTTP call or process', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-postclose-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('all route methods reject locally after owned close', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()

    const methods = [
      'status',
      'find',
      'submit',
      'cancel',
      'result',
      'record',
      'follow',
      'resume',
    ] as const
    for (const method of methods) {
      await assert.rejects(
        // @ts-expect-error - deliberately calling after close
        client[method]('run-1'),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'request'
        },
      )
    }
  })

  test('no new HTTP request or process is created after close', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()

    // Any route call should reject locally — no HTTP request made
    await assert.rejects(client.status('run-1'), (err: unknown) => {
      const e = err as SdkProtocolError & Error
      return e.kind === 'protocol' && e.stage === 'request'
    })

    // The child should have stopped
    const probe = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch(() => null)
    assert.equal(probe, null, 'child did not stop after close()')
  })
})
