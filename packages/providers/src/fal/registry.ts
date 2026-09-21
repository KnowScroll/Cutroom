// D-028'S CLOSED REGISTRY — the admitted image models, their rates and their limits, as DATA
// (docs/features/paid-path.md, Gate 2 "The image"; check 11).
//
// WHY THIS IS A REGISTRY AND NOT ONE SLUG IN THE ADAPTER. The axis that separates the four
// candidates has never been measured: the verified spread is $0.14 to $0.60 a reel, about 1.4 clip
// takes, so price does not separate three of the four. What separates them is identity retention —
// M-1, the gate pass rate — and nothing has measured it. Hardcoding one model now would commit on
// the one axis with no evidence, and a keyframe that fails costs a $0.32 clip downstream, not
// $0.08. The bake-off that settles it (O-4 / C-8) is the owner's, and this registry is what turns
// it into changing one value.
//
// THE RATE IS CARRIED HERE BECAUSE PRE-FLIGHT HAS TO PRICE WHATEVER IS CONFIGURED. D-014's cap is
// enforced before spend (I-1). If the rate were a constant in code, swapping the model would
// silently make every estimate wrong IN THE DIRECTION THAT OVERSPENDS. So one figure per entry,
// read both by the receipt a call writes and by the estimate admission makes (check 13).
//
// THE REGISTRY IS CLOSED ON PURPOSE. An open plugin API taking arbitrary models is overbuild for a
// five-person app, and it admits models that fail the 9:16 requirement that FAILS SILENTLY. A slug
// outside this file is refused where the port is built, before any request.

/** How an entry is priced. Both shapes are BUDGET.md's, read off the model pages on 2026-09-11. */
export type ImageRate =
  | {
      /** A flat price an image, whatever it carries. */
      kind: 'perImage'
      cents: number
    }
  | {
      /**
       * The first megapixel of OUTPUT, plus every extra megapixel of input AND output, each
       * rounded up. BUDGET.md's second correction: an edit call carrying a 1MP canonical as a
       * reference pays for roughly 2MP, so a derived keyframe is about $0.06, not $0.03 — the
       * "≈$0.045 for 1080p" figure elsewhere reasons from output alone and is wrong here.
       */
      kind: 'perMegapixel'
      firstMpCents: number
      extraMpCents: number
    }

/** A frame in pixels. Every frame this registry asks for is EXACTLY 9:16 (see `PICTURE_FRAME`). */
export interface Frame {
  width: number
  height: number
}

export interface ImageEntry {
  /** fal's own slug. The ONE place any of them is spelled (D-028). */
  slug: string
  rate: ImageRate
  /**
   * How many reference pictures the entry takes. **At least one, or it is not admitted**: without
   * reference input there is no way to carry identity across shots and D-027's derive step has no
   * mechanism at all (D-026). We send one at most — one hop, never a chain.
   */
  maxReferences: number
  /** The exact 9:16 frame this entry is asked for. */
  frame: Frame
  /**
   * How that frame is expressed on this entry's wire: `size` sends the pixels, `ratio` sends an
   * aspect ratio and a resolution tier. **What an entry PRODUCES is not trusted from either** —
   * the frame is read off the file that comes back, which is the whole of D-028's second gate.
   */
  ask: 'size' | 'ratio'
  /** For a `ratio` entry: the tier asked for. The rate is multiplied by that tier's own figure. */
  tier: string
  /** The resolution tiers the entry prices, as data (D-028). `tier` names the one asked for. */
  tiers: Readonly<Record<string, number>>
  /** Whether the entry documents 9:16 at all. Recorded, and trusted for nothing (see `ask`). */
  documentsVertical: boolean
}

/**
 * The frame every admitted entry is asked for: **864 × 1536, exactly 9:16** (S-124).
 *
 * `packages/pipeline/src/gates/gate1.ts` fails a picture whose `width * 16 !== height * 9`, which
 * is D-028's dimension assertion as `reel-stills` verified it — so the frame must be an EXACT 9:16
 * in whole pixels, and BUDGET.md's assumed 768 × 1365 is not one (12288 against 12285). 864 × 1536
 * is the smallest exact 9:16 frame whose sides are both multiples of 32 and whose short side is at
 * least 768, so a 768P clip never upscales its own first frame — the frame the viewer sees at t=0
 * (D-014, D-007, D-026).
 */
export const PICTURE_FRAME: Frame = { width: 864, height: 1536 }

/** The short side a keyframe may not fall below: 768P, which D-007 hard-locks for every clip. */
export const PICTURE_MIN_SHORT_SIDE = 768

/**
 * The four admitted entries, at BUDGET.md's verified rates (READ 2026-09-11). Each cleared D-026's
 * reference requirement on its own model page; each is held to the 9:16 requirement on the frame,
 * because that one fails silently and `seedream` does not document it anywhere.
 */
export const IMAGE_REGISTRY: readonly ImageEntry[] = [
  {
    slug: 'fal-ai/nano-banana-pro/edit',
    rate: { kind: 'perImage', cents: 15 },
    maxReferences: 14,
    frame: PICTURE_FRAME,
    ask: 'ratio',
    tier: '1K',
    tiers: { '1K': 1, '2K': 1.5, '4K': 2 },
    documentsVertical: true,
  },
  {
    slug: 'fal-ai/nano-banana-2/edit',
    rate: { kind: 'perImage', cents: 8 },
    maxReferences: 14,
    frame: PICTURE_FRAME,
    ask: 'ratio',
    tier: '1K',
    tiers: { '0.5K': 0.75, '1K': 1, '2K': 1.5, '4K': 2 },
    documentsVertical: true,
  },
  {
    slug: 'bytedance/seedream/v5/lite/edit',
    rate: { kind: 'perImage', cents: 3.5 },
    maxReferences: 10,
    frame: PICTURE_FRAME,
    ask: 'size',
    tier: 'flat',
    // Flat to 9 megapixels, so our 1.33 MP frame is charged the same as any other.
    tiers: { flat: 1 },
    // D-028 admits it with "9:16 undocumented — must pass the frame assertion before use". It is
    // recorded as undocumented rather than assumed, and the frame assertion is what admits it.
    documentsVertical: false,
  },
  {
    slug: 'fal-ai/flux-2-pro/edit',
    rate: { kind: 'perMegapixel', firstMpCents: 3, extraMpCents: 1.5 },
    maxReferences: 9,
    frame: PICTURE_FRAME,
    ask: 'size',
    tier: 'flat',
    tiers: { flat: 1 },
    // Through `portrait_16_9`, which is 576 × 1024 and below 768P, or through custom dimensions.
    // We send custom dimensions, which is why its headline rate does not survive our frame size.
    documentsVertical: true,
  },
]

/**
 * The entry configured when nothing names another: **the cheapest admitted one**, for the first
 * real run (S-110).
 *
 * **This settles D-028's open default not at all.** O-4 / C-8 is the owner's bake-off, and it is
 * answered by running the same reel under several entries and comparing gate pass rates — which is
 * changing one value, here. This line is a setting for one run, chosen because it is cheapest.
 */
export const CONFIGURED_IMAGE_SLUG = 'fal-ai/flux-2-pro/edit'

/** How many megapixels a frame is. */
function megapixels(frame: Frame): number {
  return (frame.width * frame.height) / 1_000_000
}

/**
 * D-026's admission gate, asserted rather than assumed: an entry that cannot take a reference
 * picture cannot make a derived picture from the canonical, and **the failure is silent** — the
 * pictures still arrive, and only the identity across shots drifts, which no downstream gate
 * reliably catches. Thrown where the port is built, before the database is opened: the service
 * refuses to start.
 *
 * The other gate — true 9:16 — is deliberately NOT here. D-028 says it fails silently and is
 * therefore checked on the produced frame, not trusted from the entry.
 */
export function admitEntry(entry: ImageEntry): void {
  if (!(entry.maxReferences >= 1)) {
    throw new Error(
      `the image entry '${entry.slug}' advertises ${entry.maxReferences} reference pictures, and ` +
        `an entry that takes none has no mechanism for the derived pictures the engine makes ` +
        `from a canonical (D-026, D-027)`,
    )
  }
  if (entry.tiers[entry.tier] === undefined) {
    throw new Error(
      `the image entry '${entry.slug}' is asked for the tier '${entry.tier}', which it does not ` +
        `price: an entry's rate is its own data (D-028)`,
    )
  }
}

/**
 * The admitted entry a slug names, or a refusal naming the slug and the whole closed set.
 *
 * A slug outside the registry is refused HERE — before the port exists, so before any request is
 * made. With no slug it is the configured one.
 */
export function imageEntry(slug: string = CONFIGURED_IMAGE_SLUG): ImageEntry {
  const found = IMAGE_REGISTRY.find((entry) => entry.slug === slug)
  if (found === undefined) {
    const admitted = IMAGE_REGISTRY.map((entry) => entry.slug).join(', ')
    throw new Error(
      `the image model '${slug}' is not in the closed registry, which admits ${admitted} (D-028)`,
    )
  }
  admitEntry(found)
  return found
}

/** One image call, as the registry prices it: the frame made, and the references carried in. */
export interface ImageCall {
  frame: Frame
  references: readonly Frame[]
}

/**
 * What one call is charged, **in whole cents, rounded up** — the receipt's figure.
 *
 * It rounds up because `generation_receipt.cost_cents` is an integer column and because the budget
 * guard rounds up (S-059): a cost that is rounded the other way understates spend against a cap,
 * which is the one direction that matters. The unrounded figure is `imageRateCents`, which is what
 * an ESTIMATE over many calls uses, so the rounding happens once at the end there rather than
 * once per call.
 */
export function imageCostCents(entry: ImageEntry, call: ImageCall): number {
  return Math.ceil(rateFor(entry, call))
}

/** The unrounded arithmetic both figures come from. */
function rateFor(entry: ImageEntry, call: ImageCall): number {
  if (entry.rate.kind === 'perImage') {
    return entry.rate.cents * (entry.tiers[entry.tier] ?? 1)
  }
  const output = Math.ceil(megapixels(call.frame))
  const input = call.references.reduce((sum, ref) => sum + Math.ceil(megapixels(ref)), 0)
  return entry.rate.firstMpCents + entry.rate.extraMpCents * (output - 1 + input)
}

/**
 * The rate admission estimates at: this entry's own arithmetic for **the call the engine actually
 * makes** — its own frame, carrying one reference (D-027's one hop, never a chain).
 *
 * This is the figure `PlanSettings.imageRateCents` is set to, so that changing the configured
 * entry changes what pre-flight estimates. An unchanged estimate means a rate is hardcoded
 * somewhere, which is what check 13 exists to catch.
 */
export function imageRateCents(entry: ImageEntry): number {
  return rateFor(entry, { frame: entry.frame, references: [entry.frame] })
}
