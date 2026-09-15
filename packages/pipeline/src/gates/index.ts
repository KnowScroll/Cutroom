// The gates, in the order they run (D-063). Gate 0 filters plans before anything is generated;
// reel-stills appends its gates after it.

export const GATE_ORDER = ['0'] as const

export { gate0 } from './gate0.ts'
