// What a clip's prompt is made of (docs/features/reel-render.md, Gate 2 "Clips"; S-071). The
// composer arrives with the clips stage; the block every video prompt ends with is here now, because
// the validator that refuses a prompt without it is Slice 1's.

/**
 * D-008's negative audio block: H3's sound is ambience only, so every shot prompt forbids speech and
 * music, and says so in the field H3 reads. Last in every clip prompt (S-071).
 */
export const NEGATIVE_AUDIO = 'No dialogue, no speech, no music.\nnon_diegetic_music: N/A'
