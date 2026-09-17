import type { AssemblerPort, RenderManifest } from '@cutroom/contracts'
import type { FfmpegTools } from './tools.ts'

// The AssemblerPort on ffmpeg (docs/features/reel-render.md, Gate 2 "The one pass"; S-073, S-075).
// Its readiness is the tools': a worker handed an assembler whose ffmpeg cannot be run, or lacks an
// encoder or a filter the pass needs, refuses to start. The pass itself is reel-render's Slice 4:
// until then nothing reaches `assemble`, and it says so rather than making a file.

export type FfmpegAssembler = AssemblerPort & {
  /** Every render manifest the assembler was handed, in order. */
  readonly renderManifests: readonly RenderManifest[]
}

export function ffmpegAssembler(
  tools: FfmpegTools,
  _options: { artifactRoot?: string } = {},
): FfmpegAssembler {
  const renderManifests: RenderManifest[] = []
  return {
    renderManifests,
    ready() {
      return tools.ready()
    },
    async assemble(renderManifest) {
      renderManifests.push(renderManifest)
      throw new Error('the assembler is not built (reel-render Slice 4)')
    },
  }
}
