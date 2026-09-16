// The gates, in the order they run (D-063, D-049, I-7). Gate 0 filters plans before anything is
// generated; Gate 1 checks each picture alone; Gate 1S checks each derived picture against the
// canonical, once every picture has been through Gate 1. `1S` is not renumbered (D-049).

export const GATE_ORDER = ['0', '1', '1S'] as const

export { gate0 } from './gate0.ts'
