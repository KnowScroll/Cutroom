import { spawn } from 'node:child_process'

// ffmpeg and ffprobe, found on PATH by name (docs/features/reel-render.md, Gate 2 "ffmpeg and
// ffprobe"; S-075). The one real adapter the engine has: it reads and writes files on this machine,
// costs nothing, reads no secret and reaches no network. Nothing here installs either tool, and no
// path to them is written in the repository (D-086).
//
// A tool is always started with an argument array, never a shell string, so no path or filtergraph
// is ever read by a shell.

/** Every encoder the stand-in's clips and the one pass write with (D-055, D-056). */
export const REQUIRED_ENCODERS: readonly string[] = ['libx264', 'aac']

/** Every filter the scan uses (S-072). */
export const SCAN_FILTERS = ['blackdetect', 'freezedetect', 'silencedetect', 'ebur128'] as const

/**
 * Every filter the one pass uses (S-073). The assembler writes a filter only by a name from this
 * list, so the pass cannot come to need one `ready()` never asked the tools for. `zoompan` pushes a
 * held shot's picture in (S-097), and is required before any filtergraph writes it.
 */
export const PASS_FILTERS = [
  'scale',
  'pad',
  'setsar',
  'fps',
  'format',
  'trim',
  'tpad',
  'concat',
  'ass',
  'aresample',
  'aformat',
  'atrim',
  'apad',
  'volume',
  'amix',
  'anullsrc',
  'zoompan',
] as const
export type PassFilter = (typeof PASS_FILTERS)[number]

/** Every filter the frame strip uses (S-074). */
export const STRIP_FILTERS = ['select'] as const
export type StripFilter = (typeof STRIP_FILTERS)[number]

/** Every filter the scan, the pass and the strip use: what `ready()` requires by default (S-075). */
export const REQUIRED_FILTERS: readonly string[] = [
  ...SCAN_FILTERS,
  ...PASS_FILTERS,
  ...STRIP_FILTERS,
]

/** What one run of a tool printed, and how it ended. */
export interface ToolRun {
  /** Null when the process ended by a signal. */
  code: number | null
  stdout: string
  stderr: string
}

export interface FfmpegTools {
  readonly ffmpeg: string
  readonly ffprobe: string
  readonly requiredEncoders: readonly string[]
  readonly requiredFilters: readonly string[]
  /**
   * Rejects naming the first thing missing: a tool that cannot be run, then an encoder, then a
   * filter this object requires (S-075).
   */
  ready(): Promise<void>
  /** Runs one of the two tools with an argument array. Rejects only when it cannot be started. */
  run(tool: 'ffmpeg' | 'ffprobe', args: readonly string[]): Promise<ToolRun>
}

/** What the tools said, once: each one's output, or why it could not be run. */
interface Said {
  ffmpeg: { version: string; encoders: Set<string>; filters: Set<string> } | { error: string }
  ffprobe: { version: string } | { error: string }
}

/**
 * WHAT THE TOOLS SAID, remembered once per process for a pair of tool names, so the many workers a
 * suite starts do not each run them again. Never whether a port was ready: every `ready()` compares
 * its own required encoders and filters against this, so a port asking for a filter the tools lack is
 * refused whatever passed before it (S-075).
 */
const said = new Map<string, Promise<Said>>()

function runTool(command: string, args: readonly string[]): Promise<ToolRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.once('error', reject)
    child.once('close', (code) =>
      resolve({
        code,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      }),
    )
  })
}

/**
 * The names a `-encoders` or `-filters` listing gives: every line after its `------` rule is flags,
 * then a name, then what it does.
 */
function listed(output: string): Set<string> {
  const lines = output.split(/\r?\n/)
  const rule = lines.findIndex((line) => /^\s*-{3,}\s*$/.test(line))
  const names = new Set<string>()
  for (const line of lines.slice(rule + 1)) {
    const match = /^\s*\S+\s+(\S+)\s/.exec(line)
    if (match?.[1] !== undefined) names.add(match[1])
  }
  return names
}

/** A tool's answer to one flag, or why it gave none. */
async function ask(command: string, flag: string): Promise<string> {
  const ran = await runTool(command, ['-hide_banner', flag])
  if (ran.code !== 0) {
    throw new Error(`'${command} ${flag}' ended with code ${ran.code}: ${ran.stderr.trim()}`)
  }
  return ran.stdout
}

async function listen(ffmpeg: string, ffprobe: string): Promise<Said> {
  const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))
  let tool: Said['ffmpeg']
  try {
    tool = {
      version: await ask(ffmpeg, '-version'),
      encoders: listed(await ask(ffmpeg, '-encoders')),
      filters: listed(await ask(ffmpeg, '-filters')),
    }
  } catch (error) {
    tool = { error: reason(error) }
  }
  let probe: Said['ffprobe']
  try {
    probe = { version: await ask(ffprobe, '-version') }
  } catch (error) {
    probe = { error: reason(error) }
  }
  return { ffmpeg: tool, ffprobe: probe }
}

export function ffmpegTools(
  options: {
    /** Found on PATH. Default `ffmpeg`. */
    ffmpeg?: string
    /** Found on PATH. Default `ffprobe`. */
    ffprobe?: string
    /** Default: every filter the scan, the pass and the strip use. */
    requiredFilters?: readonly string[]
  } = {},
): FfmpegTools {
  const ffmpeg = options.ffmpeg ?? 'ffmpeg'
  const ffprobe = options.ffprobe ?? 'ffprobe'
  const requiredFilters = [...(options.requiredFilters ?? REQUIRED_FILTERS)]
  const requiredEncoders = [...REQUIRED_ENCODERS]

  return {
    ffmpeg,
    ffprobe,
    requiredEncoders,
    requiredFilters,

    async ready() {
      const key = JSON.stringify([ffmpeg, ffprobe])
      let answer = said.get(key)
      if (answer === undefined) {
        answer = listen(ffmpeg, ffprobe)
        said.set(key, answer)
      }
      const { ffmpeg: tool, ffprobe: probe } = await answer
      if ('error' in tool) throw new Error(`ffmpeg '${ffmpeg}' cannot be run: ${tool.error}`)
      if ('error' in probe) throw new Error(`ffprobe '${ffprobe}' cannot be run: ${probe.error}`)
      for (const encoder of requiredEncoders) {
        if (!tool.encoders.has(encoder)) {
          throw new Error(`ffmpeg '${ffmpeg}' has no encoder '${encoder}'`)
        }
      }
      for (const filter of requiredFilters) {
        if (!tool.filters.has(filter)) {
          throw new Error(`ffmpeg '${ffmpeg}' has no filter '${filter}'`)
        }
      }
    },

    run(which, args) {
      return runTool(which === 'ffmpeg' ? ffmpeg : ffprobe, args)
    },
  }
}
