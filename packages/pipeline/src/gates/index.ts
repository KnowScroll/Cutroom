// The gates, in the order they run (D-063, D-049, I-7). Gate 0 filters plans before anything is
// generated; Gate 1 checks each picture alone; Gate 1S checks each derived picture against the
// canonical, once every picture has been through Gate 1. `1S` is not renumbered (D-049). Gates 2 to
// 5 run on each take as it is made — technical, text and sound, the witness, the brief — and Gate 7
// on the assembled file (S-072, S-074).
//
// No Gate 6: it checks a join, and every reel is a cut while no plan declares a chain (S-067). No
// Gate 8: it is KnowScroll's, since the engine never holds what it would judge (S-068).

export const GATE_ORDER = ['0', '1', '1S', '2', '3', '4', '5', '7'] as const

export { gate0 } from './gate0.ts'
