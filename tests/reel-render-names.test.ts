import assert from 'node:assert/strict'
import { test } from 'node:test'
import { names, sourceFiles, where } from './engine/source.ts'

// reel-render, Slice 1 — check 5's second clause (docs/features/reel-render.md): what the render
// manifest and the end card may not be called (D-059, D-101, S-073). In a file of its own, importing
// no engine package, so it runs — and is seen green — before any of Slice 1's code exists; the breaks
// recorded when the slice was built are what show it can fail.

const FORBIDDEN = ['manifest', 'endCard']

/** `endCard`, `EndCard` and a column's `end_card` are one name. */
const fold = (name: string) => name.replace(/_/g, '').toLowerCase()

test('5. no type or field in packages/ or apps/ is named manifest or endCard — green before any code, since nothing is named either yet', () => {
  const all = names(sourceFiles('packages', 'apps'))
  assert.ok(
    all.some((n) => n.name === 'claimIds' && n.kind === 'field'),
    'the scan found no claimIds field in the contract, so it is not reading fields',
  )

  // D-059: the render manifest and the keyframe manifest were both "the manifest"; a type or field
  // named that alone is the collision again, so a field holding a render manifest is
  // `renderManifest`. D-101: the engine has no end card. A local variable or a function is neither a
  // type nor a field, and is not what either decision names.
  const forbidden = new Set(FORBIDDEN.map(fold))
  const found = all.filter(
    (n) => n.kind !== 'variable' && n.kind !== 'function' && forbidden.has(fold(n.name)),
  )
  assert.deepEqual(
    found.map(where),
    [],
    'a type or field is named manifest or endCard (D-059, D-101)',
  )
})
