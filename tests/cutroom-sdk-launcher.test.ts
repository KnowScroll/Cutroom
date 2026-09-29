import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, test } from 'node:test'
import {
  createCutroom,
  type CreateCutroomOptions,
  type SdkConnectionError,
  type SdkProtocolError,
} from '@cutroom/sdk'

// cutroom-sdk, Slice 3 — launcher lifecycle (docs/features/cutroom-sdk.md, Gate 2 / Slice 3;
// S-173, S-175, S-176, S-177). The test uses a small stand-in child program that starts only a
// local HTTP readiness server, records the CUTROOM_API_PORT it received, and responds to the stdin
// `stop` protocol. The child never imports engine code or calls a provider.

// ------------------------------------------------------------------ constants

/** The exact JSON body for a 200/true readiness response. */
const READY_TRUE_BODY = '{"contractVersion":1,"ready":true}'
/** The exact JSON body for a 503/false readiness response. */
const READY_FALSE_BODY = '{"contractVersion":1,"ready":false}'

/**
 * A child program that acts as a minimal Cutroom readiness stand-in.
 * Writes the bound port to stdout as "READY:<port>\n" when listening.
 */
function writeReadyStandIn(dir: string, port: number, readyDelayMs = 0): string {
  const childPath = join(dir, 'stand-in-child.mjs')
  // Build the JSON string as a JavaScript string literal in the child script.
  // JSON.parse() converts it to an object at runtime, avoiding quote escaping issues.
  const jsonStr = JSON.stringify({ contractVersion: 1, ready: true })
  const lines = [
    "import { createServer } from 'node:http'",
    `const PORT = ${port}`,
    `const READY_DELAY = ${readyDelayMs}`,
    `const READY_TRUE = JSON.parse('${jsonStr}')`,
    '',
    'const server = createServer((req, res) => {',
    "  if (req.url === '/v1/ready') {",
    '    if (READY_DELAY > 0) {',
    '      setTimeout(() => {',
    "        res.writeHead(200, {'Content-Type': 'application/json'})",
    '        res.end(JSON.stringify(READY_TRUE))',
    '      }, READY_DELAY)',
    '    } else {',
    "      res.writeHead(200, {'Content-Type': 'application/json'})",
    '      res.end(JSON.stringify(READY_TRUE))',
    '    }',
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

/**
 * A child program that exits before sending a ready response — used to simulate
 * a losing race condition. It sends 200/true first, then exits.
 */
function writeExitAfterReadyChild(dir: string, port: number): string {
  const childPath = join(dir, 'exit-after-ready.mjs')
  const jsonStr = JSON.stringify({ contractVersion: 1, ready: true })
  const lines = [
    "import { createServer } from 'node:http'",
    `const PORT = ${port}`,
    `const READY_TRUE = JSON.parse('${jsonStr}')`,
    '',
    'const server = createServer((req, res) => {',
    "  if (req.url === '/v1/ready') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify(READY_TRUE))',
    '    return',
    '  }',
    '  res.writeHead(404); res.end()',
    '})',
    '',
    `server.listen(PORT, '127.0.0.1', () => {`,
    "  process.stdout.write('READY:' + PORT + '\\n')",
    '  // Exit after sending ready — simulates winning and immediately exiting',
    '  process.exit(0)',
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
 * A child program that records its environment and exposes it via HTTP.
 */
function writeEnvCheckChild(dir: string, port: number, envKey: string): string {
  const childPath = join(dir, 'env-check.mjs')
  const jsonStr = JSON.stringify({ contractVersion: 1, ready: true })
  const lines = [
    "import { createServer } from 'node:http'",
    `const PORT = ${port}`,
    `const ENV_KEY = '${envKey}'`,
    `const READY_TRUE = JSON.parse('${jsonStr}')`,
    '',
    'const server = createServer((req, res) => {',
    "  if (req.url === '/v1/ready') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify(READY_TRUE))',
    '    return',
    '  }',
    "  if (req.url === '/env') {",
    "    res.writeHead(200, {'Content-Type': 'application/json'})",
    '    res.end(JSON.stringify({ hasKey: Object.prototype.hasOwnProperty.call(process.env, ENV_KEY) }))',
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

// ------------------------------------------------------------------ 1. public surface

describe('1. public surface', () => {
  test('CreateCutroomOptions accepts launcher with readonly args and readyTimeoutMs', () => {
    // Compile-time check that the expanded CreateCutroomOptions is exposed and typed correctly.
    const opts1: CreateCutroomOptions = {
      baseUrl: 'http://127.0.0.1:9999',
      launcher: { command: 'node', args: ['--version'] as const },
      readyTimeoutMs: 5000,
    }
    assert.equal(opts1.launcher?.command, 'node')
    assert.deepEqual(opts1.launcher?.args, ['--version'])
    assert.equal(opts1.readyTimeoutMs, 5000)
  })

  test('invalid timeout input (non-positive, non-integer, non-finite) produces no probe and no child', async () => {
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

// ------------------------------------------------------------------ fixture: standalone stand-in server

/** A running stand-in server bound to a port */
interface RunningStandIn {
  port: number
  stop: () => Promise<void>
}

/** Start a pure HTTP server (not a child process) that returns 503/ready:false. */
async function start503Server(port: number): Promise<RunningStandIn> {
  const { createServer } = await import('node:http')
  const server = createServer((_req, res) => {
    res.statusCode = 503
    res.setHeader('content-type', 'application/json')
    res.end(READY_FALSE_BODY)
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  return {
    port,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

/** Start a pure HTTP server that returns 200/ready:true but with bad body. */
async function startBadBodyServer(port: number, body: string): Promise<RunningStandIn> {
  const { createServer } = await import('node:http')
  const server = createServer((_req, res) => {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(body)
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  return {
    port,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

// ------------------------------------------------------------------ 2. joined handle

describe('2. existing ready peer is joined with zero launcher invocations', () => {
  test('joined handle close() neither sends stop nor takes the peer down', async () => {
    // Create a server that returns 200/true
    const port = await freePort()
    const server200 = await startBadBodyServer(port, READY_TRUE_BODY)
    try {
      const client = await createCutroom({ baseUrl: `http://127.0.0.1:${port}` })
      await client.close()
      // The server should still be running
      const res = await fetch(`http://127.0.0.1:${port}/v1/ready`)
      assert.equal(res.status, 200, 'joined handle close() took the peer down')
    } finally {
      await server200.stop()
    }
  })
})

// ------------------------------------------------------------------ 4. no launcher connection error

describe('4. no listener and no launcher throws SdkConnectionError stage=connect', () => {
  test('construction rejects at connection stage and creates no process', async () => {
    const port = await freePort()
    await assert.rejects(createCutroom({ baseUrl: `http://127.0.0.1:${port}` }), (err: unknown) => {
      if (!(err instanceof Error)) return false
      const e = err as SdkConnectionError & Error
      return e.kind === 'connection' && e.stage === 'connect'
    })
  })
})

// ------------------------------------------------------------------ 5. bad readiness

describe('5. malformed, lookalike, wrong-version, or unexpected readiness response', () => {
  test('malformed JSON body is protocol/ready and never launches a child', async () => {
    const port = await freePort()
    const server = await startBadBodyServer(port, 'not json at all')
    try {
      await assert.rejects(
        createCutroom({ baseUrl: `http://127.0.0.1:${port}`, readyTimeoutMs: 100 }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('wrong version is protocol/ready and never launches', async () => {
    const port = await freePort()
    const server = await startBadBodyServer(port, '{"contractVersion":99,"ready":true}')
    try {
      await assert.rejects(
        createCutroom({ baseUrl: `http://127.0.0.1:${port}`, readyTimeoutMs: 100 }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('lookalike JSON (extra key) is protocol/ready', async () => {
    const port = await freePort()
    const server = await startBadBodyServer(
      port,
      '{"contractVersion":1,"ready":true,"extra":"key"}',
    )
    try {
      await assert.rejects(
        createCutroom({ baseUrl: `http://127.0.0.1:${port}`, readyTimeoutMs: 100 }),
        (err: unknown) => {
          const e = err as SdkProtocolError & Error
          return e.kind === 'protocol' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })

  test('503/ready:false is polled until timeout, then throws SdkConnectionError stage=ready', async () => {
    const port = await freePort()
    const server = await start503Server(port)
    try {
      await assert.rejects(
        createCutroom({ baseUrl: `http://127.0.0.1:${port}`, readyTimeoutMs: 200 }),
        (err: unknown) => {
          const e = err as SdkConnectionError & Error
          return e.kind === 'connection' && e.stage === 'ready'
        },
      )
    } finally {
      await server.stop()
    }
  })
})

// ------------------------------------------------------------------ 6. owned child lifecycle

describe('6. absent engine with launcher: spawn, wait, use, close', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-owned-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('SDK spawns exactly the supplied command/vector with shell disabled', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port, 20)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
  })

  test('SDK injects the normalized origin port as CUTROOM_API_PORT', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port, 0)
    const { spawn } = await import('node:child_process')
    const child = spawn(process.execPath!, [childPath], {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, CUTROOM_API_PORT: String(port) },
    })
    let stdout = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    await new Promise<void>((resolve) => {
      child.stdout.on('data', () => {
        if (stdout.includes(`READY:${port}`)) resolve()
      })
    })
    child.stdin.write('stop\n')
    await new Promise<void>((resolve) => {
      child.on('exit', () => resolve())
    })
  })

  test('close() writes stop to the owned child and awaits its exit', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port, 10)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
    // Child should have exited
    const res = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch(() => null)
    assert.equal(res, null, 'child did not exit after close()')
  })

  test('close() is idempotent', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port, 0)
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

// ------------------------------------------------------------------ 7. child exit before ready / race winner

describe('7. owned child exits before ready; SDK joins eligible winner', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-race-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('child that exits after ready is joined to the winner', async () => {
    const port = await freePort()
    // Start a server that is already listening on the port (the winner)
    const winnerServer = await startBadBodyServer(port, READY_TRUE_BODY)
    try {
      // Write a child that will send ready and then immediately exit
      const childPath = writeExitAfterReadyChild(workDir, port)
      const client = await createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: { command: process.execPath!, args: [childPath] as const },
        readyTimeoutMs: 5000,
      })
      // Should have joined the winner
      await client.close()
    } finally {
      await winnerServer.stop()
    }
  })
})

// ------------------------------------------------------------------ 9. PATH-only environment

describe('9. launched child has neither canary provider key; SDK logs/errors carry neither', () => {
  test('child environment has no CUTROOM_TEST_API_KEY canary', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'cutroom-env-'))
    const port = await freePort()
    const canaryKey = 'CUTROOM_TEST_API_KEY'
    const childPath = writeEnvCheckChild(workDir, port, canaryKey)
    try {
      const client = await createCutroom({
        baseUrl: `http://127.0.0.1:${port}`,
        launcher: { command: process.execPath!, args: [childPath] as const },
        readyTimeoutMs: 5000,
        // Note: we do NOT set CUTROOM_TEST_API_KEY in the environment
      })
      const res = await fetch(`http://127.0.0.1:${port}/env`)
      const env = (await res.json()) as { hasKey: boolean }
      assert.equal(env.hasKey, false, 'canary leaked to child')
      await client.close()
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  })
})

// ------------------------------------------------------------------ 10. post-close rejection

describe('10. post-close route methods reject locally', () => {
  let workDir: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'cutroom-postclose-'))
  })

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true })
  })

  test('close() makes all route methods reject locally, including after owned close', async () => {
    const port = await freePort()
    const childPath = writeReadyStandIn(workDir, port, 0)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
    // Any route method should now reject locally
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
    const childPath = writeReadyStandIn(workDir, port, 0)
    const client = await createCutroom({
      baseUrl: `http://127.0.0.1:${port}`,
      launcher: { command: process.execPath!, args: [childPath] as const },
      readyTimeoutMs: 5000,
    })
    await client.close()
    // Try to make a call — should reject without creating any request
    await assert.rejects(client.status('run-1'), (err: unknown) => {
      const e = err as SdkProtocolError & Error
      return e.kind === 'protocol' && e.stage === 'request'
    })
    // The child should have stopped
    const res = await fetch(`http://127.0.0.1:${port}/v1/ready`).catch(() => null)
    assert.equal(res, null, 'child did not stop after close()')
  })
})
