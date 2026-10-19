const genericKeys: readonly string[] = [
  "url",
  "uri",
  "weight",
  "images",
  "data",
  "text",
  "value",
  "id",
  "bytesBase64Encoded",
  "mimeType",
]

export function wordsOfPath(path: string): string {
  const segments = path
    .split(".")
    .filter((one) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(one))
  const last = segments.at(-1) ?? path
  const parent = segments.at(-2)
  const key =
    parent !== undefined && genericKeys.includes(last)
      ? `${parent} ${last}`
      : last
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
