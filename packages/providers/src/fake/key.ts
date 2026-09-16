// How a stand-in's script names a picture: by its shot and label, `shot-<unit>-<label>`, without
// the attempt its id begins with — so one script describes a picture whichever attempt makes it —
// or by its whole id, which is looked up first.

/** The picture id with its `a<attempt>-` prefix removed. */
export function scriptKey(pictureId: string): string {
  return pictureId.replace(/^a\d+-/, '')
}

/** The entry a script holds for a picture: under its whole id, else under its shot and label. */
export function entryFor<T>(script: Readonly<Record<string, T>>, pictureId: string): T | undefined {
  if (Object.hasOwn(script, pictureId)) return script[pictureId]
  const key = scriptKey(pictureId)
  return Object.hasOwn(script, key) ? script[key] : undefined
}
