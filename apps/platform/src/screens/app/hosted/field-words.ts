const placeKeys: readonly string[] = [
  "url",
  "uri",
  "bytesBase64Encoded",
  "data",
]

const qualifierKeys: readonly string[] = [
  "weight",
  "images",
  "text",
  "value",
  "id",
  "mimeType",
]

const placeWords: readonly string[] = ["url", "uri"]

function wordsOf(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((one) => one !== "")
}

function keyWordsOf(segments: readonly string[], path: string): string[] {
  const last = segments.at(-1) ?? path
  const parent = segments.at(-2)
  if (parent === undefined) {
    return wordsOf(last)
  }
  if (placeKeys.includes(last)) {
    const words = wordsOf(parent)
    const kept = words.filter((one) => !placeWords.includes(one))
    return kept.length === 0 ? words : kept
  }
  return qualifierKeys.includes(last)
    ? [...wordsOf(parent), ...wordsOf(last)]
    : wordsOf(last)
}

export function wordsOfPath(path: string): string {
  const segments = path
    .split(".")
    .filter((one) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(one))
  const words = keyWordsOf(segments, path).join(" ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}
